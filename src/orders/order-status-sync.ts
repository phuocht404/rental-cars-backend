import { OrderDetailStatus, OrderStatus, PaymentStatus, Prisma, PrismaClient } from '@prisma/client';

type PrismaLike = PrismaClient | Prisma.TransactionClient;

interface DetailState {
  orderDetailStatus: OrderDetailStatus;
  paymentStatus: PaymentStatus | null;
}

interface OrderState {
  orderStatus: OrderStatus;
  paymentStatus: PaymentStatus | null;
}

/**
 * Trạng thái của đơn tổng suy ra từ các chuyến con:
 * - mọi chuyến bị huỷ → đơn huỷ
 * - mọi chuyến còn lại đã hoàn thành → đơn hoàn thành
 * - không còn chuyến chờ xác nhận và có chuyến đã xác nhận/đang thuê → đơn đã xác nhận
 * - còn lại → chờ xác nhận
 * Thanh toán: mọi chuyến đã hoàn tiền → đơn hoàn tiền; mọi chuyến còn hiệu lực đã thanh toán → đơn đã thanh toán.
 */
export function deriveOrderState(details: DetailState[], current: OrderState): OrderState {
  if (details.length === 0) return current;

  const active = details.filter((detail) => detail.orderDetailStatus !== OrderDetailStatus.CANCELED);

  let orderStatus: OrderStatus;
  if (active.length === 0) {
    orderStatus = OrderStatus.CANCELED;
  } else if (active.every((detail) => detail.orderDetailStatus === OrderDetailStatus.COMPLETED)) {
    orderStatus = OrderStatus.COMPLETED;
  } else if (active.every((detail) => detail.orderDetailStatus !== OrderDetailStatus.PENDING)) {
    orderStatus = OrderStatus.CONFIRMED;
  } else {
    orderStatus = OrderStatus.PENDING;
  }

  let paymentStatus = current.paymentStatus;
  if (details.every((detail) => detail.paymentStatus === PaymentStatus.REFUND)) {
    paymentStatus = PaymentStatus.REFUND;
  } else if (active.length > 0 && active.every((detail) => detail.paymentStatus === PaymentStatus.PAID)) {
    paymentStatus = PaymentStatus.PAID;
  }

  return { orderStatus, paymentStatus };
}

/** Cập nhật lại trạng thái các đơn tổng sau khi chuyến con thay đổi (chỉ ghi khi thực sự khác) */
export async function syncOrderStates(prisma: PrismaLike, orderIds: (number | null | undefined)[]) {
  const ids = [...new Set(orderIds.filter((id): id is number => typeof id === 'number'))];
  if (ids.length === 0) return;

  const orders = await prisma.order.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      orderStatus: true,
      paymentStatus: true,
      OrderDetail: { select: { orderDetailStatus: true, paymentStatus: true } },
    },
  });

  for (const order of orders) {
    const next = deriveOrderState(order.OrderDetail, order);

    if (next.orderStatus !== order.orderStatus || next.paymentStatus !== order.paymentStatus) {
      await prisma.order.update({ where: { id: order.id }, data: next });
    }
  }
}
