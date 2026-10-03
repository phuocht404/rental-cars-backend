import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OrderDetailStatus, OrderStatus, PaymentStatus } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { SessionsService } from 'src/sessions/sessions.service';

// Phiên Stripe sống 30 phút; quá 2 giờ mà vẫn chưa thanh toán thì chắc chắn đã bỏ dở (kể cả khi webhook bị lỡ)
const UNPAID_ORDER_TTL_MS = 2 * 60 * 60 * 1000;

const startOfTodayUtc = () => new Date(new Date().toISOString().split('T')[0]);

/**
 * Các tác vụ dọn dẹp chạy định kỳ. Mọi thao tác đều idempotent nên chạy trên nhiều instance cùng lúc vẫn an toàn.
 */
@Injectable()
export class MaintenanceService {
  private readonly logger = new Logger(MaintenanceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionsService: SessionsService,
  ) {}

  /** Chuyến tới ngày nhận xe mà chủ xe chưa xác nhận: tự huỷ, hoàn cọc nếu đã cọc */
  @Cron(CronExpression.EVERY_10_MINUTES, { name: 'cancel-overdue-trips' })
  async cancelOverdueTrips() {
    const overdue = {
      orderDetailStatus: OrderDetailStatus.PENDING,
      startDate: { lte: startOfTodayUtc() },
    };

    const [refunded, unpaid] = await this.prisma.$transaction([
      this.prisma.orderDetail.updateMany({
        where: { ...overdue, paymentStatus: { not: PaymentStatus.PENDING } },
        data: {
          orderDetailStatus: OrderDetailStatus.CANCELED,
          paymentStatus: PaymentStatus.REFUND,
          note: 'Tự động hủy đơn do quá hạn',
        },
      }),
      this.prisma.orderDetail.updateMany({
        where: { ...overdue, paymentStatus: PaymentStatus.PENDING },
        data: { orderDetailStatus: OrderDetailStatus.CANCELED, note: 'Tự động hủy đơn do quá hạn' },
      }),
    ]);

    if (refunded.count + unpaid.count > 0) {
      this.logger.log(`Auto-cancelled ${refunded.count} overdue deposited trips, ${unpaid.count} unpaid trips`);
    }

    return { refunded: refunded.count, unpaid: unpaid.count };
  }

  /** Đơn chờ thanh toán bị bỏ dở (đóng tab, webhook không tới...) */
  @Cron(CronExpression.EVERY_30_MINUTES, { name: 'cancel-abandoned-checkouts' })
  async cancelAbandonedCheckouts() {
    const stale = {
      paymentStatus: PaymentStatus.PENDING,
      orderStatus: OrderStatus.PENDING,
      createdAt: { lt: new Date(Date.now() - UNPAID_ORDER_TTL_MS) },
    };

    const orders = await this.prisma.order.findMany({ where: stale, select: { id: true }, take: 500 });
    if (orders.length === 0) return 0;

    const ids = orders.map((order) => order.id);

    await this.prisma.$transaction([
      this.prisma.order.updateMany({ where: { id: { in: ids } }, data: { orderStatus: OrderStatus.CANCELED } }),
      this.prisma.orderDetail.updateMany({
        where: { orderId: { in: ids }, orderDetailStatus: OrderDetailStatus.PENDING },
        data: { orderDetailStatus: OrderDetailStatus.CANCELED, note: 'Chưa thanh toán tiền cọc' },
      }),
    ]);

    this.logger.log(`Cancelled ${ids.length} abandoned checkouts`);
    return ids.length;
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM, { name: 'purge-auth-sessions' })
  async purgeAuthSessions() {
    const count = await this.sessionsService.purgeStale();
    if (count > 0) this.logger.log(`Purged ${count} stale auth sessions`);

    return count;
  }
}
