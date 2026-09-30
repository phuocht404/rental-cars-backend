import { BadRequestException } from '@nestjs/common';
import { OrderDetailStatus } from '@prisma/client';
import * as moment from 'moment';
import { PrismaService } from 'src/prisma/prisma.service';

export const DEPOSIT_RATE = 0.3;

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
export async function priceCartItems(prisma: PrismaService, items: any): Promise<PricedItem[]> {
  if (!Array.isArray(items) || items.length === 0) {
    throw new BadRequestException('Giỏ hàng trống');
  }

  const today = moment().startOf('day');
  const priced: PricedItem[] = [];

  for (const item of items) {
    const carId = Number(item?.carId);

    if (!Number.isInteger(carId)) throw new BadRequestException('carId không hợp lệ');

    const start = moment(item?.startDate, 'DD/MM/YYYY', true);
    const end = moment(item?.endDate, 'DD/MM/YYYY', true);

    if (!start.isValid() || !end.isValid()) throw new BadRequestException('Ngày thuê không hợp lệ');
    if (end.isBefore(start)) throw new BadRequestException('Ngày kết thúc phải sau ngày bắt đầu');
    if (start.isBefore(today)) throw new BadRequestException('Ngày bắt đầu không được ở quá khứ');

    const car = await prisma.car.findUnique({
      where: { id: carId },
      select: { id: true, name: true, pricePerDay: true, CarImage: { select: { url: true }, take: 1 } },
    });

    if (!car) throw new BadRequestException(`Xe với id ${carId} không tồn tại`);

    const startDate = new Date(start.format('YYYY-MM-DD'));
    const endDate = new Date(end.format('YYYY-MM-DD'));

    // Chặn đặt trùng lịch với các chuyến đã được xác nhận
    const overlapped = await prisma.orderDetail.findFirst({
      where: {
        carId,
        orderDetailStatus: {
          in: [OrderDetailStatus.CONFIRMED, OrderDetailStatus.RECEIVED],
        },
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
      select: { id: true },
    });

    if (overlapped) throw new BadRequestException(`Xe "${car.name}" đã có lịch thuê trong khoảng thời gian này`);

    const days = end.diff(start, 'days') + 1;
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
