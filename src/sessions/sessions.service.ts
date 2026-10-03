import { Injectable } from '@nestjs/common';
import { UserStatus } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from 'src/prisma/prisma.service';

// Cho phép dùng lại refresh token vừa bị xoay vòng trong khoảng ngắn: hai tab (hoặc proxy của Next
// và trình duyệt) có thể cùng refresh một lúc; không có ân hạn thì một bên sẽ bị coi là token bị đánh cắp.
export const ROTATION_GRACE_MS = 30 * 1000;
// Thông tin user + phiên được cache ngắn để không phải truy vấn DB ở mọi request đã xác thực
const AUTH_CACHE_TTL_MS = 30 * 1000;
const AUTH_CACHE_MAX_ENTRIES = 5000;

export interface AuthUser {
  id: number;
  name: string | null;
  username: string;
  email: string | null;
  phone: string | null;
  avatarUrl: string | null;
  status: UserStatus;
  role: string;
  sessionId: string;
}

export type RotationResult =
  { status: 'rotated' | 'grace'; userId: number; jti: string } | { status: 'invalid' } | { status: 'reused' };

@Injectable()
export class SessionsService {
  private readonly cache = new Map<string, { value: AuthUser | null; expiresAt: number }>();

  constructor(private readonly prisma: PrismaService) {}

  async create(userId: number, ttlSeconds: number, userAgent?: string) {
    return this.prisma.authSession.create({
      data: {
        userId,
        currentJti: randomUUID(),
        userAgent: userAgent?.slice(0, 255),
        expiresAt: new Date(Date.now() + ttlSeconds * 1000),
      },
      select: { id: true, currentJti: true },
    });
  }

  /**
   * Xoay vòng refresh token: jti đúng thì cấp jti mới; jti vừa bị thay trong thời gian ân hạn thì
   * trả lại jti hiện tại; jti cũ hơn nữa nghĩa là token đã bị lộ → thu hồi cả phiên.
   */
  async rotate(sessionId: string, jti: string, ttlSeconds: number): Promise<RotationResult> {
    const session = await this.prisma.authSession.findUnique({ where: { id: sessionId } });

    if (!session || session.revokedAt || session.expiresAt <= new Date()) return { status: 'invalid' };

    if (session.currentJti === jti) {
      const nextJti = randomUUID();
      // updateMany kèm điều kiện currentJti: hai request refresh đồng thời chỉ một bên xoay được
      const { count } = await this.prisma.authSession.updateMany({
        where: { id: sessionId, currentJti: jti },
        data: {
          previousJti: jti,
          currentJti: nextJti,
          rotatedAt: new Date(),
          expiresAt: new Date(Date.now() + ttlSeconds * 1000),
        },
      });

      if (count === 1) return { status: 'rotated', userId: session.userId, jti: nextJti };

      const latest = await this.prisma.authSession.findUnique({ where: { id: sessionId } });
      return latest && !latest.revokedAt
        ? { status: 'grace', userId: latest.userId, jti: latest.currentJti }
        : { status: 'invalid' };
    }

    const withinGrace =
      session.previousJti === jti && session.rotatedAt && Date.now() - session.rotatedAt.getTime() < ROTATION_GRACE_MS;

    if (withinGrace) return { status: 'grace', userId: session.userId, jti: session.currentJti };

    await this.revoke(sessionId);
    return { status: 'reused' };
  }

  async revoke(sessionId: string) {
    const session = await this.prisma.authSession.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    this.invalidateSession(sessionId);

    return session.count > 0;
  }

  /** Thu hồi mọi phiên của user (đổi mật khẩu, bị khoá, đổi vai trò...), có thể giữ lại phiên hiện tại */
  async revokeAllForUser(userId: number, exceptSessionId?: string) {
    await this.prisma.authSession.updateMany({
      where: { userId, revokedAt: null, ...(exceptSessionId && { id: { not: exceptSessionId } }) },
      data: { revokedAt: new Date() },
    });
    this.invalidateUser(userId);
  }

  /** Làm mới cache khi thông tin user thay đổi (tên, ảnh, vai trò...) */
  invalidateUser(userId: number) {
    for (const key of this.cache.keys()) {
      if (key.startsWith(`${userId}:`)) this.cache.delete(key);
    }
  }

  private invalidateSession(sessionId: string) {
    for (const key of this.cache.keys()) {
      if (key.endsWith(`:${sessionId}`)) this.cache.delete(key);
    }
  }

  /** Dùng cho JwtStrategy: user còn hoạt động và phiên còn hiệu lực */
  async getAuthUser(userId: number, sessionId: string): Promise<AuthUser | null> {
    const key = `${userId}:${sessionId}`;
    const cached = this.cache.get(key);

    if (cached && cached.expiresAt > Date.now()) return cached.value;

    const session = await this.prisma.authSession.findFirst({
      where: { id: sessionId, userId, revokedAt: null, expiresAt: { gt: new Date() } },
      select: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            email: true,
            phone: true,
            avatarUrl: true,
            status: true,
            role: { select: { name: true } },
          },
        },
      },
    });

    const value =
      session?.user && session.user.status === UserStatus.ACTIVE
        ? { ...session.user, role: session.user.role?.name, sessionId }
        : null;

    if (this.cache.size >= AUTH_CACHE_MAX_ENTRIES) {
      this.cache.delete(this.cache.keys().next().value);
    }
    this.cache.set(key, { value, expiresAt: Date.now() + AUTH_CACHE_TTL_MS });

    return value;
  }

  /** Dọn các phiên đã hết hạn/thu hồi quá 7 ngày */
  async purgeStale() {
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const { count } = await this.prisma.authSession.deleteMany({
      where: { OR: [{ expiresAt: { lt: cutoff } }, { revokedAt: { lt: cutoff } }] },
    });

    return count;
  }
}
