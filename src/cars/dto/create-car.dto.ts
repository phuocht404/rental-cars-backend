import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CarStatus, Fuel, Transmission } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const upper = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.toUpperCase() : value);

export class CreateCarDto {
  @ApiProperty({ example: '43A-12345' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  licensePlates: string;

  @ApiProperty({ example: 4 })
  @Type(() => Number)
  @IsInt()
  @Min(2)
  @Max(50)
  seats: number;

  @ApiProperty({ example: 2022 })
  @Type(() => Number)
  @IsInt()
  @Min(1980)
  @Max(new Date().getFullYear() + 1)
  yearOfManufacture: number;

  @ApiProperty({ enum: Transmission })
  @Transform(upper)
  @IsEnum(Transmission)
  transmission: Transmission;

  @ApiProperty({ enum: Fuel })
  @Transform(upper)
  @IsEnum(Fuel)
  fuel: Fuel;

  @ApiProperty({ example: 'Xe mới, sạch sẽ' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  description: string;

  @ApiProperty({ example: 800000 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1000)
  @Max(99_999_999)
  pricePerDay: number;

  @ApiPropertyOptional({ example: 'Hải Châu, Đà Nẵng' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

  @ApiProperty({ example: 1 })
  @Type(() => Number)
  @IsInt()
  modelId: number;

  @ApiPropertyOptional({ type: [Number], example: [1, 2] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @Type(() => Number)
  @IsInt({ each: true })
  features?: number[];

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  carColorId?: number;

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @IsUrl({}, { each: true })
  images: string[];
}

export class UpdateCarStatusDto {
  @ApiProperty({ enum: CarStatus })
  @IsEnum(CarStatus)
  status: CarStatus;
}
