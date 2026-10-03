import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Gender, RoleName } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export const PHONE_PATTERN = /^\+?\d{9,14}$/;

// Form thường gửi chuỗi rỗng cho trường bỏ trống; coi như không gửi để @IsOptional hoạt động
const emptyToUndefined = ({ value }: { value: unknown }) => (value === '' || value === null ? undefined : value);

export class CreateUserDto {
  @ApiProperty({ example: 'Nguyễn Văn A' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({ example: 'nguyenvana' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  username: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @MinLength(6)
  @MaxLength(100)
  @Transform(emptyToUndefined)
  password: string;

  @ApiProperty({ example: 'nguyenvana@gmail.com' })
  @IsEmail()
  @MaxLength(100)
  email: string;

  @ApiPropertyOptional({ example: '0905123456' })
  @IsOptional()
  @Matches(PHONE_PATTERN, { message: 'Số điện thoại không hợp lệ' })
  @Transform(emptyToUndefined)
  phone?: string;

  @ApiPropertyOptional({ enum: Gender })
  @IsOptional()
  @IsEnum(Gender)
  @Transform(emptyToUndefined)
  gender?: Gender;

  @ApiPropertyOptional({ example: '2000-01-01' })
  @IsOptional()
  @IsDateString()
  @Transform(emptyToUndefined)
  dateOfBirth?: string;

  @ApiPropertyOptional({ example: 'Đà Nẵng' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Transform(emptyToUndefined)
  address?: string;

  @ApiPropertyOptional({ description: 'URL ảnh đã upload lên Cloudinary' })
  @IsOptional()
  @IsUrl({ protocols: ['https'], require_protocol: true, host_whitelist: ['res.cloudinary.com'] })
  @Transform(emptyToUndefined)
  avatarUrl?: string;

  @ApiPropertyOptional({ enum: RoleName })
  @IsOptional()
  @IsEnum(RoleName)
  @Transform(emptyToUndefined)
  role?: RoleName;
}
