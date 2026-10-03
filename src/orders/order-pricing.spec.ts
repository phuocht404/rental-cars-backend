import { BadRequestException } from '@nestjs/common';
import { CarStatus } from '@prisma/client';
import * as moment from 'moment';

import { DEPOSIT_RATE, priceCartItems } from './order-pricing';

const dmy = (daysFromToday: number) => moment().add(daysFromToday, 'days').format('DD/MM/YYYY');

const buildPrisma = (overrides: { cars?: any[]; overlapped?: any } = {}) => ({
  car: {
    findMany: jest.fn().mockResolvedValue(
      overrides.cars ?? [
        {
          id: 1,
          name: 'Toyota Vios 2022',
          status: CarStatus.AVAILABLE,
          userId: 99,
          pricePerDay: 500000,
          CarImage: [{ url: 'https://img/1.png' }],
        },
      ],
    ),
  },
  orderDetail: {
    findFirst: jest.fn().mockResolvedValue(overrides.overlapped ?? null),
  },
});

describe('priceCartItems', () => {
  it('tính tiền từ giá trong DB, bỏ qua giá client gửi lên', async () => {
    const prisma = buildPrisma();
    const items: any = [{ carId: 1, startDate: dmy(1), endDate: dmy(3), totalAmount: 1, deposits: 1 }];

    const [item] = await priceCartItems(prisma as any, items, 5);

    expect(item.days).toBe(3);
    expect(item.totalAmount).toBe(1_500_000);
    expect(item.deposits).toBe(Math.round(1_500_000 * DEPOSIT_RATE));
    expect(item.carImage).toBe('https://img/1.png');
  });

  it('chặn ngày bắt đầu ở quá khứ', async () => {
    await expect(
      priceCartItems(buildPrisma() as any, [{ carId: 1, startDate: dmy(-1), endDate: dmy(2) }], 5),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('chặn ngày kết thúc trước ngày bắt đầu', async () => {
    await expect(
      priceCartItems(buildPrisma() as any, [{ carId: 1, startDate: dmy(3), endDate: dmy(1) }], 5),
    ).rejects.toThrow('Ngày kết thúc phải sau ngày bắt đầu');
  });

  it('chặn đặt trùng lịch với chuyến đã xác nhận', async () => {
    const prisma = buildPrisma({ overlapped: { id: 10 } });

    await expect(priceCartItems(prisma as any, [{ carId: 1, startDate: dmy(1), endDate: dmy(2) }], 5)).rejects.toThrow(
      'đã có lịch thuê',
    );
  });

  it('không cho thuê xe của chính mình', async () => {
    await expect(
      priceCartItems(buildPrisma() as any, [{ carId: 1, startDate: dmy(1), endDate: dmy(2) }], 99),
    ).rejects.toThrow('xe của chính mình');
  });

  it('không cho đặt xe chưa được duyệt', async () => {
    const prisma = buildPrisma({
      cars: [{ id: 1, name: 'Xe A', status: CarStatus.UNAVAILABLE, userId: 2, pricePerDay: 1, CarImage: [] }],
    });

    await expect(priceCartItems(prisma as any, [{ carId: 1, startDate: dmy(1), endDate: dmy(2) }], 5)).rejects.toThrow(
      'không nhận đặt',
    );
  });

  it('không cho một xe xuất hiện hai lần trong giỏ', async () => {
    const items = [
      { carId: 1, startDate: dmy(1), endDate: dmy(2) },
      { carId: 1, startDate: dmy(5), endDate: dmy(6) },
    ];

    await expect(priceCartItems(buildPrisma() as any, items, 5)).rejects.toThrow('Mỗi xe chỉ được đặt một lần');
  });

  it('báo lỗi khi giỏ hàng trống', async () => {
    await expect(priceCartItems(buildPrisma() as any, [], 5)).rejects.toThrow('Giỏ hàng trống');
  });
});
