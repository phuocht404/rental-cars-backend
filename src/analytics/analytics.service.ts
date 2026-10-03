import { BadRequestException, Injectable } from '@nestjs/common';
import { OrderDetailStatus, PaymentStatus, RoleName } from '@prisma/client';
import { endOfMonth, startOfMonth, subMonths } from 'date-fns';
import { PrismaService } from 'src/prisma/prisma.service';

import { calculatePercentageChange } from 'utils/utils';

// Doanh thu (phí dịch vụ) chỉ tính trên các chuyến đã được xác nhận trở đi
const REVENUE_STATUSES: OrderDetailStatus[] = [
  OrderDetailStatus.CONFIRMED,
  OrderDetailStatus.RECEIVED,
  OrderDetailStatus.COMPLETED,
];

@Injectable()
export class AnalyticsService {
  constructor(private readonly prismaService: PrismaService) {}

  async getCardAnalytics(): Promise<any> {
    const now = new Date();
    const lastMonth = { gte: startOfMonth(subMonths(now, 1)), lte: endOfMonth(subMonths(now, 1)) };
    const currentMonth = { gte: startOfMonth(now), lte: endOfMonth(now) };

    // Đơn chưa thanh toán tiền cọc không được tính là đơn hàng
    const paidOrder = { paymentStatus: { not: PaymentStatus.PENDING } };
    const revenueWhere = (createdAt: { gte: Date; lte: Date }) => ({
      createdAt,
      orderDetailStatus: { in: REVENUE_STATUSES },
    });

    const [
      totalUsers,
      usersLastMonth,
      usersCurrentMonth,
      totalCars,
      carsLastMonth,
      carsCurrentMonth,
      totalOrders,
      ordersLastMonth,
      ordersCurrentMonth,
      revenueLastMonth,
      revenueCurrentMonth,
    ] = await this.prismaService.$transaction([
      this.prismaService.user.count(),
      this.prismaService.user.count({ where: { createdAt: lastMonth } }),
      this.prismaService.user.count({ where: { createdAt: currentMonth } }),
      this.prismaService.car.count(),
      this.prismaService.car.count({ where: { createdAt: lastMonth } }),
      this.prismaService.car.count({ where: { createdAt: currentMonth } }),
      this.prismaService.order.count({ where: paidOrder }),
      this.prismaService.order.count({ where: { ...paidOrder, createdAt: lastMonth } }),
      this.prismaService.order.count({ where: { ...paidOrder, createdAt: currentMonth } }),
      this.prismaService.orderDetail.aggregate({ where: revenueWhere(lastMonth), _sum: { serviceFee: true } }),
      this.prismaService.orderDetail.aggregate({ where: revenueWhere(currentMonth), _sum: { serviceFee: true } }),
    ]);

    const totalServiceFeeLastMonth = Number(revenueLastMonth._sum.serviceFee ?? 0);
    const totalServiceFeeCurrentMonth = Number(revenueCurrentMonth._sum.serviceFee ?? 0);

    return {
      user: {
        totalUsers,
        userPercentageChange: calculatePercentageChange(usersLastMonth, usersCurrentMonth) || 0,
      },
      car: {
        totalCars,
        carPercentageChange: calculatePercentageChange(carsLastMonth, carsCurrentMonth) || 0,
      },
      order: {
        totalOrders,
        orderPercentageChange: calculatePercentageChange(ordersLastMonth, ordersCurrentMonth) || 0,
      },
      revenue: {
        totalRevenue: totalServiceFeeLastMonth + totalServiceFeeCurrentMonth,
        revenuePercentageChange: calculatePercentageChange(totalServiceFeeLastMonth, totalServiceFeeCurrentMonth) || 0,
      },
    };
  }

  async getRevenueAnalytics(fromDay: Date, toDay: Date): Promise<any> {
    const from = new Date(fromDay);
    const to = new Date(toDay);

    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to < from) {
      throw new BadRequestException('Khoảng thời gian không hợp lệ');
    }

    const orderDetails = await this.prismaService.orderDetail.findMany({
      where: {
        createdAt: { gte: from, lt: to },
        orderDetailStatus: { in: REVENUE_STATUSES },
      },
      select: {
        serviceFee: true,
        createdAt: true,
      },
    });

    // Đánh chỉ số theo năm*12 + tháng để khoảng thời gian vắt qua năm mới vẫn đúng
    const monthKey = (date: Date) => date.getFullYear() * 12 + date.getMonth();
    const firstMonth = monthKey(from);
    const monthCount = Math.min(monthKey(to) - firstMonth + 1, 36);

    const revenueByMonth = Array.from({ length: monthCount }, (_, offset) => ({
      month: new Date(from.getFullYear(), from.getMonth() + offset, 1).toLocaleString('vi-VN', { month: 'short' }),
      totalRevenue: 0,
      totalOrder: 0,
    }));

    orderDetails.forEach((orderDetail) => {
      const bucket = revenueByMonth[monthKey(orderDetail.createdAt) - firstMonth];

      if (bucket) {
        bucket.totalRevenue += Number(orderDetail.serviceFee ?? 0);
        bucket.totalOrder += 1;
      }
    });

    return revenueByMonth;
  }

  async getUserTypeAnalytics(): Promise<any> {
    const [adminCount, ownerCount, travelerCount] = await this.prismaService.$transaction(
      [RoleName.ADMIN, RoleName.CAROWNER, RoleName.TRAVELER].map((name) =>
        this.prismaService.user.count({ where: { role: { name } } }),
      ),
    );

    const data = [];

    data.push({
      name: 'Admin',
      color: '#FFBB28',
      value: adminCount,
    });
    data.push({
      name: 'Chủ xe',
      color: '#0088FE',
      value: ownerCount,
    });
    data.push({
      name: 'Khách thuê',
      color: '#00C49F',
      value: travelerCount,
    });

    return data;
  }
}
