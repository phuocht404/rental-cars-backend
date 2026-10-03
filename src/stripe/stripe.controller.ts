import { Body, Controller, Get, Headers, HttpCode, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBody, ApiTags } from '@nestjs/swagger';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import { RoleName } from '@prisma/client';
import { Request } from 'express';
import { GetCurrentUser, Public, Roles } from 'src/auth/decorators';
import { RolesGuard } from 'src/auth/guards';
import { CreateOrderDto } from 'src/orders/dto';

import { StripeService } from './stripe.service';

@ApiTags('Stripe')
@Controller('stripe')
export class StripeController {
  constructor(private readonly stripeService: StripeService) {}

  @ApiBody({ type: CreateOrderDto })
  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN, RoleName.TRAVELER, RoleName.CAROWNER)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @Post('checkout')
  checkout(@Body() body: CreateOrderDto, @GetCurrentUser() user: any) {
    return this.stripeService.checkout(body.items, user);
  }

  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN, RoleName.TRAVELER, RoleName.CAROWNER)
  @Get('session/:sessionId')
  getSession(@Param('sessionId') sessionId: string, @GetCurrentUser() user: any) {
    return this.stripeService.getSession(sessionId, user);
  }

  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN, RoleName.TRAVELER, RoleName.CAROWNER)
  @HttpCode(200)
  @Post('session/:sessionId/cancel')
  cancelSession(@Param('sessionId') sessionId: string, @GetCurrentUser() user: any) {
    return this.stripeService.cancelSession(sessionId, user);
  }

  // Stripe gọi trực tiếp, xác thực bằng chữ ký trong header nên không cần JWT
  @Public()
  @SkipThrottle()
  @HttpCode(200)
  @Post('webhook')
  webhook(@Req() req: Request & { rawBody?: Buffer }, @Headers('stripe-signature') signature: string) {
    return this.stripeService.handleWebhook(req.rawBody, signature);
  }
}
