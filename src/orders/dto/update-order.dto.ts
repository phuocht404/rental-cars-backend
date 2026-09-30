import { ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

export class UpdateOrderDto {
  @ApiPropertyOptional({ enum: OrderStatus })
  @IsOptional()
  @IsEnum(OrderStatus)
  orderStatus?: OrderStatus;

  @ApiPropertyOptional({ enum: PaymentStatus })
  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;
}
