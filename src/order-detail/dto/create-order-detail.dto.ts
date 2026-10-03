import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsInt, IsNumber, Min } from 'class-validator';

export class CreateOrderDetailDto {
  @ApiProperty({ example: 1, type: Number })
  @Type(() => Number)
  @IsInt()
  orderId: number;

  @ApiProperty({ example: 1, type: Number })
  @Type(() => Number)
  @IsInt()
  carId: number;

  @ApiProperty({ example: 800000, type: Number })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  pricePerDay: number;

  @ApiProperty({ example: '2026-10-20', type: Date })
  @Type(() => Date)
  @IsDate()
  startDate: Date;

  @ApiProperty({ example: '2026-10-22', type: Date })
  @Type(() => Date)
  @IsDate()
  endDate: Date;

  @ApiProperty({ example: 2400000, type: Number })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  totalAmount: number;
}
