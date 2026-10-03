import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { OrderDetailStatus, PaymentStatus, RoleName } from '@prisma/client';

import { OrderDetailService } from './order-detail.service';

const OWNER = { id: 1, role: RoleName.CAROWNER };
const TRAVELER = { id: 2, role: RoleName.TRAVELER };
const STRANGER = { id: 3, role: RoleName.TRAVELER };

const buildService = (current: Partial<Record<string, any>> = {}) => {
  const prisma: any = {
    orderDetail: {
      findUnique: jest.fn().mockResolvedValue({
        id: 10,
        carId: 4,
        startDate: new Date('2030-01-01'),
        endDate: new Date('2030-01-03'),
        totalAmount: 1000,
        orderDetailStatus: OrderDetailStatus.PENDING,
        paymentStatus: PaymentStatus.DEPOSIT,
        car: { userId: OWNER.id },
        order: { travelerId: TRAVELER.id },
        ...current,
      }),
      findFirst: jest.fn().mockResolvedValue(null),
      update: jest.fn(),
    },
    car: { update: jest.fn() },
    $transaction: jest.fn().mockResolvedValue([
      {
        startDate: new Date('2030-01-01'),
        endDate: new Date('2030-01-03'),
        pricePerDay: 1,
        deposits: 1,
        totalAmount: 1,
        order: { traveler: { email: 'a@b.c', name: 'A' } },
      },
    ]),
  };
  const mailService = { sendMail: jest.fn() };

  return { service: new OrderDetailService(prisma, mailService as any), prisma };
};

describe('OrderDetailService.updateOrderDetailStatusById', () => {
  it('chủ xe được xác nhận chuyến đã đặt cọc', async () => {
    const { service, prisma } = buildService();

    await service.updateOrderDetailStatusById(10, { orderDetailStatus: OrderDetailStatus.CONFIRMED }, OWNER);

    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('không cho xác nhận chuyến chưa thanh toán tiền cọc', async () => {
    const { service } = buildService({ paymentStatus: PaymentStatus.PENDING });

    await expect(
      service.updateOrderDetailStatusById(10, { orderDetailStatus: OrderDetailStatus.CONFIRMED }, OWNER),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('người thuê không được tự xác nhận chuyến', async () => {
    const { service } = buildService();

    await expect(
      service.updateOrderDetailStatusById(10, { orderDetailStatus: OrderDetailStatus.CONFIRMED }, TRAVELER),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('người không liên quan không được đổi trạng thái', async () => {
    const { service } = buildService();

    await expect(
      service.updateOrderDetailStatusById(10, { orderDetailStatus: OrderDetailStatus.CANCELED }, STRANGER),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('không cho xác nhận khi trùng lịch với chuyến khác', async () => {
    const { service, prisma } = buildService();
    prisma.orderDetail.findFirst.mockResolvedValue({ id: 99 });

    await expect(
      service.updateOrderDetailStatusById(10, { orderDetailStatus: OrderDetailStatus.CONFIRMED }, OWNER),
    ).rejects.toThrow('lịch thuê khác');
  });
});
