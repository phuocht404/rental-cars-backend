import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';
import { priceCartItems } from 'src/orders/order-pricing';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class StripeService {
  public readonly stripe: Stripe;

  constructor(private readonly prismaService: PrismaService) {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
    });
  }

  async checkout(cart: any, user: any) {
    // Tiền cọc được tính lại ở server, không dùng giá trị client gửi lên
    const items = await priceCartItems(this.prismaService, cart);

    const lineItems = items.map((item) => ({
      price_data: {
        currency: 'vnd',
        product_data: {
          name: item.carName,
          images: item.carImage ? [item.carImage] : [],
        },
        unit_amount: item.deposits,
      },
      quantity: 1,
    }));

    return await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${process.env.CLIENT_URL}/payment/success`,
      cancel_url: `${process.env.CLIENT_URL}/payment/cancel`,
    });
  }

  async getSession(sessionId: string) {
    return await this.stripe.checkout.sessions.retrieve(sessionId);
  }
}
