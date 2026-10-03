import { BadRequestException } from '@nestjs/common';
import { CarStatus, OrderDetailStatus, Prisma, PrismaClient } from '@prisma/client';
import * as moment from 'moment';

import { CartItemDto } from './dto';

export const DEPOSIT_RATE = 0.3;
export const MAX_RENTAL_DAYS = 60;

// Các trạng thái chiếm lịch xe: đã xác nhận hoặc đang thuê
export const BLOCKING_ORDER_DETAIL_STATUSES: OrderDetailStatus[] = [
  OrderDetailStatus.CONFIRMED,
  OrderDetailStatus.RECEIVED,
];

type PrismaLike = PrismaClient | Prisma.TransactionClient;

export interface PricedItem {
  carId: number;
  carName: string;
  carImage?: string;
  pricePerDay: number;
  startDate: Date;
  endDate: Date;
  days: number;
  deposits: number;
  totalAmount: number;
}

/**
 * Tính lại giá từ dữ liệu trong DB, không tin các giá trị tiền do client gửi lên.
 * Số ngày thuê tính cả ngày đầu và ngày cuối (giống `countDays` ở frontend).
 */
export async function priceCartItems(
  prisma: PrismaLike,
  items: CartItemDto[],
  travelerId?: number,
): Promise<PricedItem[]> {
  if (!Array.isArray(items) || items.length === 0) {
    throw new BadRequestException('Giỏ hàng trống');
  }

  const carIds = items.map((item) => Number(item.carId));
  if (new Set(carIds).size !== carIds.length) {
    throw new BadRequestException('Mỗi xe chỉ được đặt một lần trong một đơn');
  }

  const today = moment().startOf('day');

  const cars = await prisma.car.findMany({
    where: { id: { in: carIds } },
    select: {
      id: true,
      name: true,
      status: true,
      userId: true,
      pricePerDay: true,
      CarImage: { select: { url: true }, take: 1 },
    },
  });
  const carById = new Map(cars.map((car) => [car.id, car]));

  const priced: PricedItem[] = [];

  for (const item of items) {
    const carId = Number(item.carId);
    const start = moment(item.startDate, 'DD/MM/YYYY', true);
    const end = moment(item.endDate, 'DD/MM/YYYY', true);

    if (!start.isValid() || !end.isValid()) throw new BadRequestException('Ngày thuê không hợp lệ');
    if (end.isBefore(start)) throw new BadRequestException('Ngày kết thúc phải sau ngày bắt đầu');
    if (start.isBefore(today)) throw new BadRequestException('Ngày bắt đầu không được ở quá khứ');

    const days = end.diff(start, 'days') + 1;
    if (days > MAX_RENTAL_DAYS) throw new BadRequestException(`Chỉ được thuê tối đa ${MAX_RENTAL_DAYS} ngày`);

    const car = carById.get(carId);

    if (!car) throw new BadRequestException(`Xe với id ${carId} không tồn tại`);
    if (car.status !== CarStatus.AVAILABLE) throw new BadRequestException(`Xe "${car.name}" hiện không nhận đặt`);
    if (travelerId && car.userId === travelerId) throw new BadRequestException('Bạn không thể thuê xe của chính mình');

    const startDate = new Date(start.format('YYYY-MM-DD'));
    const endDate = new Date(end.format('YYYY-MM-DD'));

    // Chặn đặt trùng lịch với các chuyến đã được xác nhận
    const overlapped = await prisma.orderDetail.findFirst({
      where: {
        carId,
        orderDetailStatus: { in: BLOCKING_ORDER_DETAIL_STATUSES },
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
      select: { id: true },
    });

    if (overlapped) throw new BadRequestException(`Xe "${car.name}" đã có lịch thuê trong khoảng thời gian này`);

    const pricePerDay = Number(car.pricePerDay);
    const totalAmount = pricePerDay * days;
    const deposits = Math.round(totalAmount * DEPOSIT_RATE);

    priced.push({
      carId,
      carName: car.name,
      carImage: car.CarImage[0]?.url,
      pricePerDay,
      startDate,
      endDate,
      days,
      deposits,
      totalAmount,
    });
  }

  return priced;
}
