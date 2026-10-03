import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsPositive, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreateReviewDto {
  @ApiProperty({
    example: 'Great car!',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  content: string;

  @ApiProperty({
    example: 5,
    type: Number,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiProperty({
    example: 1,
    type: Number,
    description: 'Chuyến đi (order detail) được đánh giá',
  })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  orderDetailId: number;
}
