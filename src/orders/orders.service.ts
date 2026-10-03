import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { OrderDetailStatus, OrderStatus, PaymentStatus, Prisma, RoleName } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { formatDecimalToNumber, getPagination, normalizeSearch, parseEnumList } from 'utils/utils';

import { CartItemDto, UpdateOrderDto } from './dto';
import { PricedItem, priceCartItems } from './order-pricing';

const toNumberAmounts = (order: any) => ({
  ...order,
  totalAmount: formatDecimalToNumber(order.totalAmount),
  deposits: formatDecimalToNumber(order.deposits),
});

@Injectable()
export class OrdersService {
  constructor(private readonly prismaService: PrismaService) {}

  /**
   * Tạo đơn ở trạng thái chờ thanh toán. Đơn chờ/đã cọc chưa chiếm lịch xe (nhiều khách có thể
   * cùng đặt cọc một khoảng ngày); lịch chỉ bị khoá khi chủ xe xác nhận, và bước xác nhận
   * kiểm tra trùng lịch lại một lần nữa.
   */
  async createPendingOrder(currentUser: any, cartItems: CartItemDto[]): Promise<{ id: number; items: PricedItem[] }> {
    return this.prismaService.$transaction(async (tx) => {
      const items = await priceCartItems(tx, cartItems, currentUser.id);

      const order = await tx.order.create({
        data: {
          totalAmount: items.reduce((total, item) => total + item.totalAmount, 0),
          deposits: items.reduce((total, item) => total + item.deposits, 0),
          travelerId: currentUser.id,
          orderStatus: OrderStatus.PENDING,
          paymentStatus: PaymentStatus.PENDING,
          OrderDetail: {
            create: items.map((item) => ({
              carId: item.carId,
              pricePerDay: item.pricePerDay,
              startDate: item.startDate,
              endDate: item.endDate,
              deposits: item.deposits,
              totalAmount: item.totalAmount,
              orderDetailStatus: OrderDetailStatus.PENDING,
              paymentStatus: PaymentStatus.PENDING,
            })),
          },
        },
        select: { id: true },
      });

      return { id: order.id, items };
    });
  }

  async attachStripeSession(orderId: number, sessionId: string) {
    await this.prismaService.order.update({
      where: { id: orderId },
      data: { stripeSessionId: sessionId },
    });
  }

  // Xoá đơn khi chưa kịp tạo được phiên thanh toán (lỗi từ Stripe)
  async discardUnpaidOrder(orderId: number) {
    await this.prismaService.order.deleteMany({
      where: { id: orderId, paymentStatus: PaymentStatus.PENDING },
    });
  }

  /** Đánh dấu đã đặt cọc. Idempotent: gọi nhiều lần (webhook + trang success) vẫn an toàn. */
  async markOrderDepositPaid(stripeSessionId: string) {
    return this.prismaService.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { stripeSessionId },
        select: { id: true, paymentStatus: true },
      });

      if (!order || order.paymentStatus !== PaymentStatus.PENDING) return order;

      await tx.order.update({
        where: { id: order.id },
        data: { paymentStatus: PaymentStatus.DEPOSIT },
      });
      await tx.orderDetail.updateMany({
        where: { orderId: order.id, paymentStatus: PaymentStatus.PENDING },
        data: { paymentStatus: PaymentStatus.DEPOSIT },
      });

      return { ...order, paymentStatus: PaymentStatus.DEPOSIT };
    });
  }

  /** Huỷ đơn khi phiên thanh toán hết hạn hoặc người dùng bấm huỷ. Đơn đã cọc thì giữ nguyên. */
  async cancelUnpaidOrder(stripeSessionId: string) {
    const order = await this.prismaService.order.findUnique({
      where: { stripeSessionId },
      select: { id: true, paymentStatus: true },
    });

    if (!order || order.paymentStatus !== PaymentStatus.PENDING) return;

    await this.prismaService.$transaction([
      this.prismaService.order.update({
        where: { id: order.id },
        data: { orderStatus: OrderStatus.CANCELED },
      }),
      this.prismaService.orderDetail.updateMany({
        where: { orderId: order.id },
        data: { orderDetailStatus: OrderDetailStatus.CANCELED, note: 'Chưa thanh toán tiền cọc' },
      }),
    ]);
  }

  async findAllOrders(
    page: number,
    limit: number,
    filter: { q?: string; orderStatus?: string; paymentStatus?: string } = {},
  ): Promise<any> {
    const { _page, _limit } = getPagination(page, limit);
    const q = normalizeSearch(filter.q);
    const orderStatuses = parseEnumList(filter.orderStatus, OrderStatus);
    const paymentStatuses = parseEnumList(filter.paymentStatus, PaymentStatus);

    const where: Prisma.OrderWhereInput = {
      ...(orderStatuses && { orderStatus: { in: orderStatuses } }),
      ...(paymentStatuses && { paymentStatus: { in: paymentStatuses } }),
      ...(q && {
        OR: [
          ...(/^\d+$/.test(q) ? [{ id: Number(q) }] : []),
          { traveler: { name: { contains: q } } },
          { traveler: { username: { contains: q } } },
        ],
      }),
    };

    const [totalOrders, orders] = await this.prismaService.$transaction([
      this.prismaService.order.count({ where }),
      this.prismaService.order.findMany({
        where,
        skip: (_page - 1) * _limit,
        take: _limit,
        orderBy: {
          createdAt: 'desc',
        },
      }),
    ]);

    return {
      data: orders.map(toNumberAmounts),
      meta: {
        totalPages: Math.ceil(totalOrders / _limit),
        _page,
        _limit,
        totalOrders,
      },
    };
  }

  async findOneById(id: number, currentUser: any): Promise<any> {
    const order = await this.prismaService.order.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        totalAmount: true,
        deposits: true,
        traveler: {
          select: {
            id: true,
            name: true,
          },
        },
        travelerId: true,
        orderStatus: true,
        paymentStatus: true,
        createdAt: true,
        updatedAt: true,
        OrderDetail: {
          include: {
            car: {
              include: {
                CarImage: true,
              },
            },
            review: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with id ${id} not found`);
    }

    // Chỉ admin hoặc chính người đặt đơn mới được xem
    if (currentUser?.role !== RoleName.ADMIN && order.travelerId !== currentUser?.id) {
      throw new ForbiddenException('Bạn không có quyền xem đơn hàng này');
    }

    return {
      ...toNumberAmounts(order),
      traveler: order.traveler.name,
      orderDetails: order.OrderDetail.map((item: any) => {
        return {
          ...item,
          pricePerDay: formatDecimalToNumber(item.pricePerDay),
          totalAmount: formatDecimalToNumber(item.totalAmount),
          deposits: formatDecimalToNumber(item.deposits),
          car: {
            ...item.car,
            pricePerDay: formatDecimalToNumber(item.car.pricePerDay),
            images: item.car.CarImage.map((image: any) => image.url),
            CarImage: undefined,
          },
        };
      }),
      OrderDetail: undefined,
    };
  }

  async updateOrderById(id: number, updateOrderDto: UpdateOrderDto): Promise<any> {
    const order = await this.prismaService.order.update({
      where: {
        id,
      },
      data: {
        orderStatus: updateOrderDto.orderStatus,
        paymentStatus: updateOrderDto.paymentStatus,
      },
      select: {
        id: true,
        totalAmount: true,
        traveler: {
          select: {
            name: true,
          },
        },
        travelerId: true,
        orderStatus: true,
        paymentStatus: true,
        createdAt: true,
        updatedAt: true,
        OrderDetail: true,
      },
    });

    return { ...order, orderDetail: order.OrderDetail, OrderDetail: undefined };
  }

  async removeById(id: number): Promise<any> {
    // OrderDetail bị xoá theo (onDelete: Cascade); P2025 (không tồn tại) được filter đổi thành 404
    await this.prismaService.order.delete({
      where: {
        id,
      },
    });

    return `This action removes a #${id} order`;
  }

  async getMyOrders(
    currentUser: any,
    page: number,
    limit: number,
    filter: { orderStatus?: string; paymentStatus?: string } = {},
  ): Promise<any> {
    const { _page, _limit } = getPagination(page, limit);
    const orderStatuses = parseEnumList(filter.orderStatus, OrderStatus);
    const paymentStatuses = parseEnumList(filter.paymentStatus, PaymentStatus);
    const where: Prisma.OrderWhereInput = {
      travelerId: currentUser.id,
      ...(orderStatuses && { orderStatus: { in: orderStatuses } }),
      ...(paymentStatuses && { paymentStatus: { in: paymentStatuses } }),
    };

    const [totalOrders, orders] = await this.prismaService.$transaction([
      this.prismaService.order.count({ where }),
      this.prismaService.order.findMany({
        where,
        skip: (_page - 1) * _limit,
        take: _limit,
        orderBy: {
          createdAt: 'desc',
        },
      }),
    ]);

    return {
      data: orders.map(toNumberAmounts),
      meta: {
        totalPages: Math.ceil(totalOrders / _limit),
        _page,
        _limit,
        totalOrders,
      },
    };
  }
}
