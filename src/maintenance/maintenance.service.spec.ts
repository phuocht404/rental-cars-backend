import { OrderDetailStatus, PaymentStatus } from '@prisma/client';

import { MaintenanceService } from './maintenance.service';

describe('MaintenanceService', () => {
  const build = () => {
    const prisma: any = {
      orderDetail: {
        findMany: jest.fn().mockResolvedValue([
          { id: 1, orderId: 10, paymentStatus: PaymentStatus.DEPOSIT },
          { id: 2, orderId: 11, paymentStatus: PaymentStatus.PENDING },
        ]),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      order: { findMany: jest.fn().mockResolvedValue([]), updateMany: jest.fn(), update: jest.fn() },
      $transaction: jest.fn((ops) => Promise.all(ops)),
    };

    return { service: new MaintenanceService(prisma, { purgeStale: jest.fn() } as any), prisma };
  };

  it('chuyến quá hạn đã cọc được hoàn tiền, chưa cọc thì chỉ huỷ', async () => {
    const { service, prisma } = build();

    await service.cancelOverdueTrips();

    const [deposited, unpaid] = prisma.orderDetail.updateMany.mock.calls.map(([args]) => args);
    expect(deposited.where.id).toEqual({ in: [1] });
    expect(deposited.data).toMatchObject({
      orderDetailStatus: OrderDetailStatus.CANCELED,
      paymentStatus: PaymentStatus.REFUND,
    });
    expect(unpaid.where.id).toEqual({ in: [2] });
    // Đơn tổng của các chuyến bị huỷ được đồng bộ lại
    expect(prisma.order.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: { in: [10, 11] } } }));
    expect(unpaid.data).not.toHaveProperty('paymentStatus');
  });

  it('không có đơn bỏ dở thì không ghi gì', async () => {
    const { service, prisma } = build();

    await expect(service.cancelAbandonedCheckouts()).resolves.toBe(0);
    expect(prisma.order.updateMany).not.toHaveBeenCalled();
  });
});
