import { OrderDetailStatus, PaymentStatus } from '@prisma/client';

import { MaintenanceService } from './maintenance.service';

describe('MaintenanceService', () => {
  const build = () => {
    const prisma: any = {
      orderDetail: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
      order: { findMany: jest.fn().mockResolvedValue([]), updateMany: jest.fn() },
      $transaction: jest.fn((ops) => Promise.all(ops)),
    };

    return { service: new MaintenanceService(prisma, { purgeStale: jest.fn() } as any), prisma };
  };

  it('chuyến quá hạn đã cọc được hoàn tiền, chưa cọc thì chỉ huỷ', async () => {
    const { service, prisma } = build();

    await service.cancelOverdueTrips();

    const [deposited, unpaid] = prisma.orderDetail.updateMany.mock.calls.map(([args]) => args);
    expect(deposited.where.paymentStatus).toEqual({ not: PaymentStatus.PENDING });
    expect(deposited.data).toMatchObject({
      orderDetailStatus: OrderDetailStatus.CANCELED,
      paymentStatus: PaymentStatus.REFUND,
    });
    expect(unpaid.where.paymentStatus).toBe(PaymentStatus.PENDING);
    expect(unpaid.data).not.toHaveProperty('paymentStatus');
  });

  it('không có đơn bỏ dở thì không ghi gì', async () => {
    const { service, prisma } = build();

    await expect(service.cancelAbandonedCheckouts()).resolves.toBe(0);
    expect(prisma.order.updateMany).not.toHaveBeenCalled();
  });
});
