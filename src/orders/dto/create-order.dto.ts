import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsInt, IsPositive, Matches, ValidateNested } from 'class-validator';

const DMY_PATTERN = /^\d{2}\/\d{2}\/\d{4}$/;

// Client chỉ gửi xe và khoảng ngày; mọi giá trị tiền đều được server tính lại
export class CartItemDto {
  @ApiProperty({ example: 1, type: Number })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  carId: number;

  @ApiProperty({ example: '20/10/2026', description: 'DD/MM/YYYY' })
  @Matches(DMY_PATTERN, { message: 'startDate phải có dạng DD/MM/YYYY' })
  startDate: string;

  @ApiProperty({ example: '22/10/2026', description: 'DD/MM/YYYY' })
  @Matches(DMY_PATTERN, { message: 'endDate phải có dạng DD/MM/YYYY' })
  endDate: string;
}

export class CreateOrderDto {
  @ApiProperty({ type: [CartItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => CartItemDto)
  items: CartItemDto[];
}
