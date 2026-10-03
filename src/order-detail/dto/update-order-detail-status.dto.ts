import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderDetailStatus, PaymentStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateOrderDetailStatusDto {
  @ApiProperty({ enum: OrderDetailStatus })
  @IsEnum(OrderDetailStatus)
  orderDetailStatus: OrderDetailStatus;

  @ApiPropertyOptional({ example: 'Khách huỷ do thay đổi lịch trình' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

export class UpdatePaymentStatusDto {
  @ApiProperty({ enum: PaymentStatus })
  @IsEnum(PaymentStatus)
  paymentStatus: PaymentStatus;
}
