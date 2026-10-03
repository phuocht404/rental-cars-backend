import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsString, IsUrl } from 'class-validator';

export class CreateCarImageDto {
  @ApiProperty({
    example: 'https://www.example.com/image.png',
    type: String,
  })
  @IsString()
  @IsUrl()
  url: string;

  @ApiProperty({
    example: 1,
    type: Number,
  })
  @Type(() => Number)
  @IsInt()
  carId: number;
}
