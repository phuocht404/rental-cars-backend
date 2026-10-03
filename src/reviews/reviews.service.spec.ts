import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { OrderDetailStatus, RoleName } from '@prisma/client';

import { ReviewsService } from './reviews.service';

const traveler = { id: 5, role: RoleName.TRAVELER };

const buildService = (orderDetail: any, existingReview: any = { customerId: 5 }) => {
  const prisma = {
    orderDetail: { findUnique: jest.fn().mockResolvedValue(orderDetail) },
    review: {
      create: jest.fn().mockImplementation(({ data }) => data),
      findUnique: jest.fn().mockResolvedValue(existingReview),
      update: jest.fn().mockResolvedValue({ id: 1 }),
    },
  };

  return { service: new ReviewsService(prisma as any), prisma };
};

const completedTrip = (overrides = {}) => ({
  orderDetailStatus: OrderDetailStatus.COMPLETED,
  order: { travelerId: 5 },
  review: null,
  ...overrides,
});

describe('ReviewsService', () => {
  it('cho người thuê đánh giá chuyến đã hoàn thành', async () => {
    const { service } = buildService(completedTrip());

    const review = await service.createReview(traveler, { orderDetailId: 1, rating: 5, content: 'Tốt' });

    expect(review).toMatchObject({ customerId: 5, orderDetailId: 1, rating: 5 });
  });

  it('không cho đánh giá chuyến của người khác', async () => {
    const { service } = buildService(completedTrip({ order: { travelerId: 6 } }));

    await expect(service.createReview(traveler, { orderDetailId: 1, rating: 5, content: 'x' })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('không cho đánh giá chuyến chưa hoàn thành', async () => {
    const { service } = buildService(completedTrip({ orderDetailStatus: OrderDetailStatus.CONFIRMED }));

    await expect(service.createReview(traveler, { orderDetailId: 1, rating: 5, content: 'x' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('mỗi chuyến chỉ đánh giá một lần', async () => {
    const { service } = buildService(completedTrip({ review: { id: 3 } }));

    await expect(service.createReview(traveler, { orderDetailId: 1, rating: 5, content: 'x' })).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('không cho sửa đánh giá của người khác', async () => {
    const { service } = buildService(null, { customerId: 42 });

    await expect(service.updateById(1, { rating: 1 }, traveler)).rejects.toBeInstanceOf(ForbiddenException);
  });
});
