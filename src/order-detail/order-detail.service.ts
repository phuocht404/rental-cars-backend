import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CarStatus, OrderDetailStatus, PaymentStatus, RoleName } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { formatDateToDMY, formatDecimalToNumber, getPagination } from 'utils/utils';

import { CreateOrderDetailDto } from './dto/create-order-detail.dto';
import { UpdateOrderDetailDto } from './dto/update-order-detail.dto';
import { UpdateOrderDetailStatusDto, UpdatePaymentStatusDto } from './dto/update-order-detail-status.dto';
import { MailService } from 'src/mail/mail.service';
import { syncOrderStates } from 'src/orders/order-status-sync';

const PUBLIC_USER_SELECT = {
  id: true,
  name: true,
  username: true,
  email: true,
  phone: true,
  avatarUrl: true,
};

// Các bước chuyển trạng thái hợp lệ theo từng vai trò trên chuyến đi
const OWNER_TRANSITIONS: Partial<Record<OrderDetailStatus, OrderDetailStatus[]>> = {
  [OrderDetailStatus.PENDING]: [OrderDetailStatus.CONFIRMED, OrderDetailStatus.CANCELED],
  [OrderDetailStatus.CONFIRMED]: [OrderDetailStatus.RECEIVED, OrderDetailStatus.CANCELED],
  [OrderDetailStatus.RECEIVED]: [OrderDetailStatus.COMPLETED],
};

const TRAVELER_TRANSITIONS: Partial<Record<OrderDetailStatus, OrderDetailStatus[]>> = {
  [OrderDetailStatus.PENDING]: [OrderDetailStatus.CANCELED],
  [OrderDetailStatus.CONFIRMED]: [OrderDetailStatus.CANCELED],
};

@Injectable()
export class OrderDetailService {
  private readonly logger = new Logger(OrderDetailService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly mailService: MailService,
  ) {}

  async createOrderDetail(createOrderDetailDto: CreateOrderDetailDto): Promise<any> {
    const orderDetail = await this.prismaService.orderDetail.create({
      data: {
        ...createOrderDetailDto,
      },
    });

    return orderDetail;
  }

  async findAllOrderDetail(page: number, limit: number): Promise<any> {
    const { _page, _limit } = getPagination(page, limit);

    // Calculate the total number of users
    const totalOrderDetail = await this.prismaService.orderDetail.count();
    const totalPages = Math.ceil(totalOrderDetail / _limit);

    // Calculate the number of items to skip
    const offset = (_page - 1) * _limit;

    const orderDetails = await this.prismaService.orderDetail.findMany({
      skip: offset,
      take: _limit,
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      data: orderDetails,
      meta: {
        total: totalOrderDetail,
        page: _page,
        per_page: _limit,
        last_page: totalPages,
      },
    };
  }

  async findOneById(id: number, currentUser?: any): Promise<any> {
    const orderDetail = await this.prismaService.orderDetail.findUnique({
      where: {
        id,
      },
      include: {
        car: {
          include: {
            model: {
              include: {
                brand: true,
              },
            },
            CarColor: true,
            CarImage: true,
            user: { select: PUBLIC_USER_SELECT },
          },
        },
        order: {
          include: {
            traveler: {
              select: {
                avatarUrl: true,
                name: true,
                email: true,
                phone: true,
                username: true,
                Order: {
                  select: {
                    OrderDetail: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!orderDetail) {
      throw new NotFoundException(`Order Detail with id ${id} not found`);
    }

    if (currentUser) this.assertParticipant(currentUser, orderDetail.car.userId, orderDetail.order?.travelerId);

    return {
      ...orderDetail,
      pricePerDay: formatDecimalToNumber(orderDetail.pricePerDay),
      deposits: formatDecimalToNumber(orderDetail.deposits),
      totalAmount: formatDecimalToNumber(orderDetail.totalAmount),
      serviceFee: orderDetail.serviceFee ? formatDecimalToNumber(orderDetail.serviceFee) : 0,
      car: {
        ...orderDetail.car,
        pricePerDay: formatDecimalToNumber(orderDetail.car.pricePerDay),
        model: orderDetail.car.model?.name,
        brand: orderDetail.car.model?.brand?.name,
        color: orderDetail.car.CarColor?.name ?? null,
        images: orderDetail.car.CarImage.map((image) => image.url),
        CarImage: undefined,
        CarColor: undefined,
      },
      traveler: {
        ...orderDetail.order.traveler,
        successTrips: orderDetail.order.traveler.Order.map(
          (order) =>
            order.OrderDetail.filter((orderDetail) => orderDetail.orderDetailStatus === OrderDetailStatus.COMPLETED)
              .length,
        ).reduce((acc, cur) => acc + cur, 0),
        cancelTrips: orderDetail.order.traveler.Order.map(
          (order) =>
            order.OrderDetail.filter((orderDetail) => orderDetail.orderDetailStatus === OrderDetailStatus.CANCELED)
              .length,
        ).reduce((acc, cur) => acc + cur, 0),
        totalTrips: orderDetail.order.traveler.Order.map(
          (order) =>
            order.OrderDetail.filter(
              (orderDetail) =>
                orderDetail.orderDetailStatus === OrderDetailStatus.COMPLETED ||
                orderDetail.orderDetailStatus === OrderDetailStatus.CANCELED,
            ).length,
        ).reduce((acc, cur) => acc + cur, 0),

        Order: undefined,
      },
    };
  }

  async updateById(id: number, updateOrderDetailDto: UpdateOrderDetailDto): Promise<any> {
    const orderDetail = await this.prismaService.orderDetail.update({
      where: {
        id,
      },
      data: {
        ...updateOrderDetailDto,
      },
    });

    await syncOrderStates(this.prismaService, [orderDetail.orderId]);

    return orderDetail;
  }

  async removeById(id: number): Promise<any> {
    const exitsOrderDetail = await this.prismaService.orderDetail.findUnique({
      where: {
        id,
      },
    });

    if (!exitsOrderDetail) {
      throw new NotFoundException(`Order Detail with id ${id} not found`);
    }

    await this.prismaService.orderDetail.delete({
      where: {
        id,
      },
    });
    await syncOrderStates(this.prismaService, [exitsOrderDetail.orderId]);

    return `This action removes a #${id} orderDetail`;
  }

  async getAllByOrderId(orderId: number, currentUser: any): Promise<any> {
    const order = await this.prismaService.order.findUnique({
      where: { id: Number(orderId) },
      select: { travelerId: true },
    });

    if (!order) {
      throw new NotFoundException(`Order with id ${orderId} not found`);
    }

    if (currentUser.role !== RoleName.ADMIN && order.travelerId !== currentUser.id) {
      throw new ForbiddenException('Bạn không có quyền xem đơn hàng này');
    }

    return this.prismaService.orderDetail.findMany({
      where: {
        orderId: Number(orderId),
      },
      select: {
        id: true,
        orderId: true,
        car: {
          select: {
            id: true,
            name: true,
          },
        },
        pricePerDay: true,
        deposits: true,
        totalAmount: true,
        orderDetailStatus: true,
        paymentStatus: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async getAllByUserId(userId: number): Promise<any> {
    // Việc tự huỷ chuyến quá hạn do MaintenanceService (cron) đảm nhiệm, request GET không ghi dữ liệu
    const ownerCars = { car: { userId } };

    const orderDetails = await this.prismaService.orderDetail.findMany({
      where: {
        ...ownerCars,
        // Đơn chưa thanh toán tiền cọc không hiển thị cho chủ xe
        paymentStatus: { not: PaymentStatus.PENDING },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return orderDetails.map((orderDetail) => ({
      ...orderDetail,
      pricePerDay: formatDecimalToNumber(orderDetail.pricePerDay),
      deposits: orderDetail.deposits ? formatDecimalToNumber(orderDetail.deposits) : 0,
      totalAmount: formatDecimalToNumber(orderDetail.totalAmount),
    }));
  }

  private assertParticipant(currentUser: any, carOwnerId?: number | null, travelerId?: number | null) {
    const isAdmin = currentUser?.role === RoleName.ADMIN;
    const isOwner = !!carOwnerId && carOwnerId === currentUser?.id;
    const isTraveler = !!travelerId && travelerId === currentUser?.id;

    if (!isAdmin && !isOwner && !isTraveler) {
      throw new ForbiddenException('Bạn không có quyền truy cập chuyến đi này');
    }

    return { isAdmin, isOwner, isTraveler };
  }

  async updateOrderDetailStatusById(id: number, body: UpdateOrderDetailStatusDto, currentUser: any): Promise<any> {
    const target = body.orderDetailStatus;

    const current = await this.prismaService.orderDetail.findUnique({
      where: { id },
      select: {
        id: true,
        carId: true,
        startDate: true,
        endDate: true,
        totalAmount: true,
        orderDetailStatus: true,
        paymentStatus: true,
        car: { select: { userId: true } },
        order: { select: { travelerId: true } },
      },
    });

    if (!current) {
      throw new NotFoundException(`Order Detail with id ${id} not found`);
    }

    const { isAdmin, isOwner, isTraveler } = this.assertParticipant(
      currentUser,
      current.car?.userId,
      current.order?.travelerId,
    );

    const allowed =
      ((isAdmin || isOwner) && OWNER_TRANSITIONS[current.orderDetailStatus]?.includes(target)) ||
      (isTraveler && TRAVELER_TRANSITIONS[current.orderDetailStatus]?.includes(target));

    if (!allowed) {
      throw new ForbiddenException(`Không thể chuyển trạng thái từ ${current.orderDetailStatus} sang ${target}`);
    }

    // Chủ xe chỉ được xác nhận chuyến khi khách đã đặt cọc thành công
    if (target === OrderDetailStatus.CONFIRMED && current.paymentStatus === PaymentStatus.PENDING) {
      throw new BadRequestException('Chuyến đi chưa được thanh toán tiền cọc');
    }

    // Các giá trị tiền, trạng thái thanh toán và trạng thái xe luôn do server quyết định
    const data: any = { orderDetailStatus: target };
    let carStatus: CarStatus | undefined;

    if (target === OrderDetailStatus.CONFIRMED) {
      const overlapped = await this.prismaService.orderDetail.findFirst({
        where: {
          id: { not: id },
          carId: current.carId,
          orderDetailStatus: { in: [OrderDetailStatus.CONFIRMED, OrderDetailStatus.RECEIVED] },
          startDate: { lte: current.endDate },
          endDate: { gte: current.startDate },
        },
        select: { id: true },
      });

      if (overlapped) throw new BadRequestException('Xe đã có lịch thuê khác trong khoảng thời gian này');

      data.paymentStatus = PaymentStatus.PAID;
      data.serviceFee = Number(current.totalAmount) * 0.5;
    } else if (target === OrderDetailStatus.CANCELED) {
      // Chưa thanh toán thì không có gì để hoàn
      if (current.paymentStatus !== PaymentStatus.PENDING) data.paymentStatus = PaymentStatus.REFUND;

      if (body.note) data.note = body.note;
    } else if (target === OrderDetailStatus.RECEIVED) {
      carStatus = CarStatus.RENTING;
    } else if (target === OrderDetailStatus.COMPLETED) {
      carStatus = CarStatus.AVAILABLE;
    }

    const [orderDetail] = await this.prismaService.$transaction([
      this.prismaService.orderDetail.update({
        where: { id },
        data,
        include: {
          car: {
            include: {
              user: { select: PUBLIC_USER_SELECT },
            },
          },
          order: {
            include: {
              OrderDetail: {
                include: {
                  car: true,
                },
              },
              traveler: { select: PUBLIC_USER_SELECT },
            },
          },
        },
      }),
      ...(carStatus
        ? [this.prismaService.car.update({ where: { id: current.carId }, data: { status: carStatus } })]
        : []),
    ]);

    // Đơn tổng đi theo trạng thái các chuyến con (huỷ hết → huỷ, hoàn thành hết → hoàn thành...)
    await syncOrderStates(this.prismaService, [orderDetail.orderId]);

    const startDate = orderDetail.startDate.toISOString().split('T')[0];
    const endDate = orderDetail.endDate.toISOString().split('T')[0];

    // Gửi mail thất bại không được làm hỏng việc cập nhật trạng thái
    try {
      await this.mailService.sendMail({
        to: orderDetail.order.traveler.email,
        from: process.env.MAIL_FROM,
        subject: 'Xác nhận đơn đặt xe',
        template: 'order_confirmation',
        context: {
          customerName: orderDetail.order.traveler.name,
          order: orderDetail.order,
          startDate: startDate,
          endDate: endDate,
        },
      });
    } catch (error) {
      this.logger.error(`Cannot send mail for order detail ${id}`, error?.stack);
    }

    return {
      ...orderDetail,
      pricePerDay: formatDecimalToNumber(orderDetail.pricePerDay),
      deposits: formatDecimalToNumber(orderDetail.deposits),
      totalAmount: formatDecimalToNumber(orderDetail.totalAmount),
    };
  }

  async updatePaymentStatusById(id: number, body: UpdatePaymentStatusDto, currentUser: any): Promise<any> {
    const { paymentStatus } = body;

    const current = await this.prismaService.orderDetail.findUnique({
      where: { id },
      select: { car: { select: { userId: true } } },
    });

    if (!current) {
      throw new NotFoundException(`Order Detail with id ${id} not found`);
    }

    if (currentUser.role !== RoleName.ADMIN && current.car?.userId !== currentUser.id) {
      throw new ForbiddenException('Bạn không có quyền cập nhật thanh toán của chuyến đi này');
    }

    const updated = await this.prismaService.orderDetail.update({
      where: { id },
      data: { paymentStatus },
    });

    await syncOrderStates(this.prismaService, [updated.orderId]);

    return updated;
  }

  async getDisableDateByCarId(carId: number): Promise<any> {
    const orderDetails = await this.prismaService.orderDetail.findMany({
      where: {
        carId: Number(carId),
        orderDetailStatus: { in: [OrderDetailStatus.CONFIRMED, OrderDetailStatus.RECEIVED] },
        // Chỉ cần các chuyến chưa kết thúc để khoá ngày trên lịch
        endDate: { gte: new Date(new Date().toISOString().split('T')[0]) },
      },
      select: {
        startDate: true,
        endDate: true,
      },
    });

    return orderDetails;
  }

  async getTotalRevenue(): Promise<any> {
    const orderDetails = await this.prismaService.orderDetail.findMany({
      where: {
        OR: [
          {
            orderDetailStatus: OrderDetailStatus.CONFIRMED,
          },
          {
            orderDetailStatus: OrderDetailStatus.RECEIVED,
          },
          {
            orderDetailStatus: OrderDetailStatus.COMPLETED,
          },
        ],
      },
      select: {
        serviceFee: true,
      },
    });

    if (!orderDetails) {
      throw new NotFoundException(`Order Detail not found`);
    }

    const totalRevenue = orderDetails.reduce((acc, orderDetail) => acc + Number(orderDetail.serviceFee), 0);

    return {
      totalRevenue,
    };
  }
}
