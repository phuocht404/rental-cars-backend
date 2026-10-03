import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { CartItemDto } from 'src/orders/dto';
import { OrdersService } from 'src/orders/orders.service';
import Stripe from 'stripe';

// Stripe yêu cầu phiên thanh toán sống tối thiểu 30 phút
const CHECKOUT_SESSION_TTL_SECONDS = 30 * 60;

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  public readonly stripe: Stripe;

  constructor(private readonly ordersService: OrdersService) {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
    });
  }

  /**
   * Tạo đơn chờ thanh toán ở server rồi mới mở phiên thanh toán. Đơn chỉ được chuyển sang
   * "đã đặt cọc" khi Stripe xác nhận (webhook hoặc khi trang success kiểm tra lại phiên).
   */
  async checkout(items: CartItemDto[], user: any) {
    const order = await this.ordersService.createPendingOrder(user, items);
    const clientUrl = (process.env.CLIENT_URL || 'http://localhost:3000').split(',')[0];

    try {
      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'payment',
        line_items: order.items.map((item) => ({
          price_data: {
            currency: 'vnd',
            product_data: {
              name: `${item.carName} (${item.days} ngày) - tiền cọc`,
              images: item.carImage ? [item.carImage] : [],
            },
            unit_amount: item.deposits,
          },
          quantity: 1,
        })),
        client_reference_id: String(user.id),
        customer_email: user.email ?? undefined,
        metadata: { orderId: String(order.id), userId: String(user.id) },
        expires_at: Math.floor(Date.now() / 1000) + CHECKOUT_SESSION_TTL_SECONDS,
        success_url: `${clientUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${clientUrl}/payment/cancel?session_id={CHECKOUT_SESSION_ID}`,
      });

      await this.ordersService.attachStripeSession(order.id, session.id);

      return { id: session.id, url: session.url, orderId: order.id };
    } catch (error) {
      await this.ordersService.discardUnpaidOrder(order.id);
      this.logger.error(`Cannot create checkout session for order ${order.id}`, error?.stack);
      throw new ServiceUnavailableException('Không tạo được phiên thanh toán, vui lòng thử lại');
    }
  }

  private async retrieveOwnedSession(sessionId: string, user: any) {
    let session: Stripe.Checkout.Session;

    try {
      session = await this.stripe.checkout.sessions.retrieve(sessionId);
    } catch {
      throw new NotFoundException('Không tìm thấy phiên thanh toán');
    }

    // Không tiết lộ phiên thanh toán của người khác
    if (user.role !== RoleName.ADMIN && session.metadata?.userId !== String(user.id)) {
      throw new NotFoundException('Không tìm thấy phiên thanh toán');
    }

    return session;
  }

  async getSession(sessionId: string, user: any) {
    const session = await this.retrieveOwnedSession(sessionId, user);

    // Dự phòng khi webhook chưa tới (hoặc chưa cấu hình ở môi trường dev)
    if (session.payment_status === 'paid') {
      await this.ordersService.markOrderDepositPaid(session.id);
    }

    return {
      id: session.id,
      status: session.status,
      paymentStatus: session.payment_status,
      amountTotal: session.amount_total,
      currency: session.currency,
      orderId: Number(session.metadata?.orderId) || null,
    };
  }

  async cancelSession(sessionId: string, user: any) {
    const session = await this.retrieveOwnedSession(sessionId, user);

    if (session.status === 'open') {
      await this.stripe.checkout.sessions.expire(session.id);
    }

    if (session.payment_status !== 'paid') {
      await this.ordersService.cancelUnpaidOrder(session.id);
    }

    return { success: true };
  }

  async handleWebhook(rawBody: Buffer | undefined, signature: string | undefined) {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!secret) throw new ServiceUnavailableException('Webhook chưa được cấu hình');
    if (!rawBody || !signature) throw new BadRequestException('Thiếu chữ ký webhook');

    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(rawBody, signature, secret);
    } catch (error) {
      this.logger.warn(`Invalid Stripe webhook signature: ${error?.message}`);
      throw new BadRequestException('Chữ ký webhook không hợp lệ');
    }

    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded': {
        const session = event.data.object as Stripe.Checkout.Session;

        if (session.payment_status === 'paid') {
          await this.ordersService.markOrderDepositPaid(session.id);
        }
        break;
      }
      case 'checkout.session.expired':
      case 'checkout.session.async_payment_failed': {
        const session = event.data.object as Stripe.Checkout.Session;

        await this.ordersService.cancelUnpaidOrder(session.id);
        break;
      }
      default:
        break;
    }

    return { received: true };
  }
}
