import { ConflictException, Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RoleName, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

import { ACCESS_TOKEN_TTL_SECONDS, REFRESH_TOKEN_TTL_SECONDS } from './auth.cookies';
import { PrismaService } from '../prisma/prisma.service';
import { SessionsService } from '../sessions/sessions.service';

interface signUpParams {
  username: string;
  email: string;
  password: string;
}

interface signInParams {
  username: string;
  password: string;
}

const DEFAULT_AVATAR_URL =
  'https://res.cloudinary.com/dj1v6wmjv/image/upload/v1701074365/rental-cars-cloudinary/avatars/avatar-default.jpg';

// Hash giả để so sánh khi tài khoản không tồn tại, giữ thời gian phản hồi như nhau
const DUMMY_PASSWORD_HASH = bcrypt.hashSync('dummy-password-for-timing', 10);

const SESSION_USER_SELECT = {
  id: true,
  name: true,
  username: true,
  email: true,
  phone: true,
  avatarUrl: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  role: { select: { name: true } },
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly jwtService: JwtService,
    private readonly sessionsService: SessionsService,
  ) {}

  async signUp({ username, email, password }: signUpParams) {
    const existedUser = await this.prismaService.user.findFirst({
      where: {
        OR: [{ username }, { email }],
      },
    });

    if (existedUser) throw new ConflictException('Username or email already exists');

    const hashedPassword = await bcrypt.hash(password, 10);

    const defaultRole = await this.prismaService.role.findFirst({
      where: {
        name: RoleName.TRAVELER,
      },
    });

    if (!defaultRole) throw new InternalServerErrorException('Default role not found');

    const user = await this.prismaService.user.create({
      data: {
        username,
        email,
        avatarUrl: DEFAULT_AVATAR_URL,
        password: hashedPassword,
        roleId: Number(defaultRole.id),
      },
      select: {
        username: true,
        name: true,
        phone: true,
        avatarUrl: true,
        email: true,
        role: {
          select: {
            name: true,
          },
        },
        createdAt: true,
      },
    });

    return { ...user, role: user.role.name };
  }

  async signIn({ username, password }: signInParams, userAgent?: string) {
    const user = await this.prismaService.user.findFirst({
      where: {
        username,
      },
      select: { ...SESSION_USER_SELECT, password: true },
    });

    const isPasswordValid = await bcrypt.compare(password, user?.password ?? DUMMY_PASSWORD_HASH);

    if (!user || !isPasswordValid) throw new UnauthorizedException('Tài khoản hoặc mật khẩu không chính xác!!!');

    if (user.status !== UserStatus.ACTIVE) throw new UnauthorizedException('Tài khoản đã bị khoá');

    const session = await this.sessionsService.create(user.id, REFRESH_TOKEN_TTL_SECONDS, userAgent);
    const tokens = await this.generateToken(user.id, user.username, user.role.name, session.id, session.currentJti);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...userWithoutPassword } = user;

    return {
      user: { ...userWithoutPassword, role: user.role.name },
      tokens,
    };
  }

  private async verifyRefreshToken(refreshToken?: string): Promise<{ sub: number; sid: string; jti: string }> {
    if (!refreshToken) throw new UnauthorizedException();

    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, { secret: process.env.REFRESH_TOKEN_SECRET });

      if (!payload?.sid || !payload?.jti) throw new Error('legacy token');

      return payload;
    } catch {
      throw new UnauthorizedException('Phiên đăng nhập đã hết hạn');
    }
  }

  async refresh(refreshToken?: string) {
    const payload = await this.verifyRefreshToken(refreshToken);
    const rotation = await this.sessionsService.rotate(payload.sid, payload.jti, REFRESH_TOKEN_TTL_SECONDS);

    if (rotation.status === 'reused') {
      throw new UnauthorizedException('Phiên đăng nhập đã bị thu hồi vì phát hiện dùng lại token cũ');
    }
    if (rotation.status === 'invalid' || rotation.userId !== Number(payload.sub)) {
      throw new UnauthorizedException('Phiên đăng nhập đã hết hạn');
    }

    // Đọc lại user từ DB để vai trò/trạng thái mới nhất được phản ánh vào token mới
    const user = await this.prismaService.user.findUnique({
      where: { id: rotation.userId },
      select: SESSION_USER_SELECT,
    });

    if (!user || user.status !== UserStatus.ACTIVE) {
      await this.sessionsService.revoke(payload.sid);
      throw new UnauthorizedException();
    }

    const tokens = await this.generateToken(user.id, user.username, user.role.name, payload.sid, rotation.jti);

    return { user: { ...user, role: user.role.name }, tokens };
  }

  /** Đăng xuất thiết bị hiện tại: thu hồi phiên gắn với refresh token (không lỗi nếu token đã hỏng) */
  async logout(refreshToken?: string) {
    try {
      const { sid } = await this.verifyRefreshToken(refreshToken);
      await this.sessionsService.revoke(sid);
    } catch {
      // Token không hợp lệ thì không còn gì để thu hồi
    }
  }

  async logoutAll(userId: number) {
    await this.sessionsService.revokeAllForUser(userId);
  }

  async generateToken(userId: number, username: string, role: string, sessionId: string, jti: string) {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        { sub: userId, username, role, sid: sessionId },
        { expiresIn: ACCESS_TOKEN_TTL_SECONDS, secret: process.env.ACCESS_TOKEN_SECRET },
      ),
      this.jwtService.signAsync(
        { sub: userId, sid: sessionId, jti },
        { expiresIn: REFRESH_TOKEN_TTL_SECONDS, secret: process.env.REFRESH_TOKEN_SECRET },
      ),
    ]);

    return { accessToken, refreshToken };
  }
}
