import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { GetCurrentUser, Roles } from 'src/auth/decorators';
import { RolesGuard } from 'src/auth/guards';

import { StripeService } from './stripe.service';

@ApiTags('Stripe')
@Controller('stripe')
export class StripeController {
  constructor(private readonly stripeService: StripeService) {}

  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN, RoleName.TRAVELER, RoleName.CAROWNER)
  @Post('checkout')
  checkout(@Body() cart: any, @GetCurrentUser() user: any) {
    return this.stripeService.checkout(cart, user);
  }

  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN, RoleName.TRAVELER, RoleName.CAROWNER)
  @Get('session/:sessionId')
  getSession(@Param('sessionId') sessionId: string) {
    return this.stripeService.getSession(sessionId);
  }
}
