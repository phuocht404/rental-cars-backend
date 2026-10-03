import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

import { AuthService } from './auth.service';

describe('AuthService (logic)', () => {
  const jwtService = new JwtService();
  let passwordHash: string;

  beforeAll(async () => {
    process.env.ACCESS_TOKEN_SECRET = 'access-secret';
    process.env.REFRESH_TOKEN_SECRET = 'refresh-secret';
    passwordHash = await bcrypt.hash('123456', 4);
  });

  const activeUser = () => ({
    id: 1,
    username: 'traveler',
    password: passwordHash,
    status: UserStatus.ACTIVE,
    role: { name: 'TRAVELER' },
  });

  const buildService = (user: any, rotation: any = { status: 'rotated', userId: 1, jti: 'jti-2' }) => {
    const prisma = {
      user: { findFirst: jest.fn().mockResolvedValue(user), findUnique: jest.fn().mockResolvedValue(user) },
    };
    const sessions = {
      create: jest.fn().mockResolvedValue({ id: 'sid-1', currentJti: 'jti-1' }),
      rotate: jest.fn().mockResolvedValue(rotation),
      revoke: jest.fn(),
      revokeAllForUser: jest.fn(),
    };

    return { service: new AuthService(prisma as any, jwtService, sessions as any), sessions };
  };

  it('đăng nhập đúng tạo phiên mới, trả user không kèm mật khẩu', async () => {
    const { service, sessions } = buildService(activeUser());

    const result = await service.signIn({ username: 'traveler', password: '123456' }, 'jest');

    expect(sessions.create).toHaveBeenCalledWith(1, expect.any(Number), 'jest');
    expect(result.user).not.toHaveProperty('password');
    const access = jwtService.decode(result.tokens.accessToken) as any;
    const refresh = jwtService.decode(result.tokens.refreshToken) as any;
    expect(access.sid).toBe('sid-1');
    expect(refresh).toMatchObject({ sid: 'sid-1', jti: 'jti-1' });
  });

  it('sai mật khẩu bị từ chối', async () => {
    const { service } = buildService(activeUser());
    await expect(service.signIn({ username: 'traveler', password: 'sai-mat-khau' })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('tài khoản không tồn tại bị từ chối', async () => {
    const { service } = buildService(null);
    await expect(service.signIn({ username: 'nobody', password: '123456' })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('tài khoản bị khoá không đăng nhập được', async () => {
    const { service } = buildService({ ...activeUser(), status: UserStatus.INACTIVE });
    await expect(service.signIn({ username: 'traveler', password: '123456' })).rejects.toThrow('khoá');
  });

  it('refresh xoay vòng jti', async () => {
    const { service, sessions } = buildService(activeUser());
    const { refreshToken } = await service.generateToken(1, 'traveler', 'TRAVELER', 'sid-1', 'jti-1');

    const result = await service.refresh(refreshToken);

    expect(sessions.rotate).toHaveBeenCalledWith('sid-1', 'jti-1', expect.any(Number));
    expect((jwtService.decode(result.tokens.refreshToken) as any).jti).toBe('jti-2');
  });

  it('refresh token bị dùng lại thì bị từ chối', async () => {
    const { service } = buildService(activeUser(), { status: 'reused' });
    const { refreshToken } = await service.generateToken(1, 'traveler', 'TRAVELER', 'sid-1', 'old-jti');

    await expect(service.refresh(refreshToken)).rejects.toThrow('dùng lại');
  });

  it('access token không dùng được như refresh token', async () => {
    const { service } = buildService(activeUser());
    const { accessToken } = await service.generateToken(1, 'traveler', 'TRAVELER', 'sid-1', 'jti-1');

    await expect(service.refresh(accessToken)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('logout thu hồi đúng phiên của refresh token', async () => {
    const { service, sessions } = buildService(activeUser());
    const { refreshToken } = await service.generateToken(1, 'traveler', 'TRAVELER', 'sid-9', 'jti-1');

    await service.logout(refreshToken);

    expect(sessions.revoke).toHaveBeenCalledWith('sid-9');
  });
});
