import { UserStatus } from '@prisma/client';

import { ROTATION_GRACE_MS, SessionsService } from './sessions.service';

const future = () => new Date(Date.now() + 60_000);

const buildService = (session: any) => {
  const prisma: any = {
    authSession: {
      findUnique: jest.fn().mockResolvedValue(session),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      findFirst: jest.fn(),
    },
  };

  return { service: new SessionsService(prisma), prisma };
};

describe('SessionsService.rotate', () => {
  it('jti hiện tại thì cấp jti mới', async () => {
    const { service } = buildService({ id: 's', userId: 1, currentJti: 'a', expiresAt: future() });

    const result = await service.rotate('s', 'a', 60);

    expect(result.status).toBe('rotated');
    expect((result as any).jti).not.toBe('a');
  });

  it('jti vừa bị xoay trong thời gian ân hạn thì trả lại jti hiện tại', async () => {
    const { service } = buildService({
      id: 's',
      userId: 1,
      currentJti: 'b',
      previousJti: 'a',
      rotatedAt: new Date(),
      expiresAt: future(),
    });

    await expect(service.rotate('s', 'a', 60)).resolves.toEqual({ status: 'grace', userId: 1, jti: 'b' });
  });

  it('jti cũ quá ân hạn bị coi là dùng lại và thu hồi phiên', async () => {
    const { service, prisma } = buildService({
      id: 's',
      userId: 1,
      currentJti: 'b',
      previousJti: 'a',
      rotatedAt: new Date(Date.now() - ROTATION_GRACE_MS - 1000),
      expiresAt: future(),
    });

    await expect(service.rotate('s', 'a', 60)).resolves.toEqual({ status: 'reused' });
    expect(prisma.authSession.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { revokedAt: expect.any(Date) } }),
    );
  });

  it('phiên đã thu hồi không refresh được', async () => {
    const { service } = buildService({
      id: 's',
      userId: 1,
      currentJti: 'a',
      revokedAt: new Date(),
      expiresAt: future(),
    });

    await expect(service.rotate('s', 'a', 60)).resolves.toEqual({ status: 'invalid' });
  });
});

describe('SessionsService.getAuthUser', () => {
  it('cache kết quả để không truy vấn DB ở mọi request, và bỏ cache khi thu hồi', async () => {
    const { service, prisma } = buildService(null);
    prisma.authSession.findFirst.mockResolvedValue({
      user: { id: 1, username: 'u', status: UserStatus.ACTIVE, role: { name: 'TRAVELER' } },
    });

    await service.getAuthUser(1, 's');
    await service.getAuthUser(1, 's');
    expect(prisma.authSession.findFirst).toHaveBeenCalledTimes(1);

    await service.revoke('s');
    prisma.authSession.findFirst.mockResolvedValue(null);
    await expect(service.getAuthUser(1, 's')).resolves.toBeNull();
  });
});
