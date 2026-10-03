import { OrderDetailStatus as D, OrderStatus as O, PaymentStatus as P } from '@prisma/client';

import { deriveOrderState } from './order-status-sync';

const pendingOrder = { orderStatus: O.PENDING, paymentStatus: P.DEPOSIT };
const detail = (orderDetailStatus: D, paymentStatus: P = P.DEPOSIT) => ({ orderDetailStatus, paymentStatus });

describe('deriveOrderState', () => {
  it('mọi chuyến bị huỷ và hoàn tiền thì đơn huỷ + hoàn tiền', () => {
    expect(deriveOrderState([detail(D.CANCELED, P.REFUND), detail(D.CANCELED, P.REFUND)], pendingOrder)).toEqual({
      orderStatus: O.CANCELED,
      paymentStatus: P.REFUND,
    });
  });

  it('còn chuyến chờ xác nhận thì đơn vẫn chờ', () => {
    expect(deriveOrderState([detail(D.CONFIRMED), detail(D.PENDING)], pendingOrder).orderStatus).toBe(O.PENDING);
  });

  it('các chuyến còn hiệu lực đều đã xác nhận/đang thuê thì đơn đã xác nhận', () => {
    expect(
      deriveOrderState([detail(D.CONFIRMED), detail(D.RECEIVED), detail(D.CANCELED)], pendingOrder).orderStatus,
    ).toBe(O.CONFIRMED);
  });

  it('các chuyến còn hiệu lực đều hoàn thành thì đơn hoàn thành, kể cả có chuyến bị huỷ', () => {
    expect(deriveOrderState([detail(D.COMPLETED, P.PAID), detail(D.CANCELED, P.REFUND)], pendingOrder)).toEqual({
      orderStatus: O.COMPLETED,
      paymentStatus: P.PAID,
    });
  });

  it('đơn chưa có chuyến nào thì giữ nguyên', () => {
    expect(deriveOrderState([], pendingOrder)).toBe(pendingOrder);
  });
});
