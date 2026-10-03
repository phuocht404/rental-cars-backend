import { BadRequestException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { RoleName } from '@prisma/client';

import { StripeService } from './stripe.service';

const buildService = () => {
  const ordersService = {
    createPendingOrder: jest.fn().mockResolvedValue({
      id: 7,
      items: [{ carName: 'Xe A', days: 2, carImage: undefined, deposits: 300000 }],
    }),
    attachStripeSession: jest.fn(),
    discardUnpaidOrder: jest.fn(),
    markOrderDepositPaid: jest.fn(),
    cancelUnpaidOrder: jest.fn(),
  };
  const service = new StripeService(ordersService as any);
  const stripe: any = {
    checkout: {
      sessions: {
        create: jest.fn().mockResolvedValue({ id: 'cs_1', url: 'https://checkout.stripe.com/cs_1' }),
        retrieve: jest.fn(),
        expire: jest.fn(),
      },
    },
    webhooks: { constructEvent: jest.fn() },
  };
  (service as any).stripe = stripe;

  return { service, ordersService, stripe };
};

const traveler = { id: 5, role: RoleName.TRAVELER, email: 'a@b.c' };

describe('StripeService', () => {
  afterEach(() => {
    delete process.env.STRIPE_WEBHOOK_SECRET;
  });

  it('tạo đơn chờ thanh toán rồi gắn session id vào đơn', async () => {
    const { service, ordersService, stripe } = buildService();

    const result = await service.checkout([{ carId: 1, startDate: '01/01/2030', endDate: '02/01/2030' }], traveler);

    expect(ordersService.createPendingOrder).toHaveBeenCalled();
    expect(stripe.checkout.sessions.create.mock.calls[0][0].metadata).toEqual({ orderId: '7', userId: '5' });
    expect(ordersService.attachStripeSession).toHaveBeenCalledWith(7, 'cs_1');
    expect(result).toEqual({ id: 'cs_1', url: 'https://checkout.stripe.com/cs_1', orderId: 7 });
  });

  it('xoá đơn nếu Stripe không tạo được phiên thanh toán', async () => {
    const { service, ordersService, stripe } = buildService();
    stripe.checkout.sessions.create.mockRejectedValue(new Error('stripe down'));

    await expect(service.checkout([], traveler)).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(ordersService.discardUnpaidOrder).toHaveBeenCalledWith(7);
  });

  it('không cho xem phiên thanh toán của người khác', async () => {
    const { service, stripe } = buildService();
    stripe.checkout.sessions.retrieve.mockResolvedValue({ id: 'cs_1', metadata: { userId: '999' } });

    await expect(service.getSession('cs_1', traveler)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('đánh dấu đã cọc khi phiên đã thanh toán', async () => {
    const { service, stripe, ordersService } = buildService();
    stripe.checkout.sessions.retrieve.mockResolvedValue({
      id: 'cs_1',
      status: 'complete',
      payment_status: 'paid',
      amount_total: 300000,
      currency: 'vnd',
      metadata: { userId: '5', orderId: '7' },
    });

    const result = await service.getSession('cs_1', traveler);

    expect(ordersService.markOrderDepositPaid).toHaveBeenCalledWith('cs_1');
    expect(result.orderId).toBe(7);
  });

  it('webhook từ chối khi chưa cấu hình secret', async () => {
    const { service } = buildService();

    await expect(service.handleWebhook(Buffer.from('{}'), 'sig')).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('webhook từ chối chữ ký sai', async () => {
    const { service, stripe } = buildService();
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
    stripe.webhooks.constructEvent.mockImplementation(() => {
      throw new Error('bad signature');
    });

    await expect(service.handleWebhook(Buffer.from('{}'), 'sig')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('webhook checkout.session.expired huỷ đơn chưa thanh toán', async () => {
    const { service, stripe, ordersService } = buildService();
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
    stripe.webhooks.constructEvent.mockReturnValue({
      type: 'checkout.session.expired',
      data: { object: { id: 'cs_9' } },
    });

    await service.handleWebhook(Buffer.from('{}'), 'sig');

    expect(ordersService.cancelUnpaidOrder).toHaveBeenCalledWith('cs_9');
  });
});
