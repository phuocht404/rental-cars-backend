import { ApiProperty, ApiPropertyOptional, PartialType, PickType } from '@nestjs/swagger';
import { UserStatus } from '@prisma/client';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

import { CreateUserDto, PHONE_PATTERN } from './create-user.dto';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @ApiPropertyOptional({ enum: UserStatus })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;
}

// Người dùng tự cập nhật hồ sơ: không được đổi tài khoản, vai trò, trạng thái, mật khẩu
export class UpdateProfileDto extends PartialType(
  PickType(CreateUserDto, ['name', 'email', 'phone', 'gender', 'dateOfBirth', 'address'] as const),
) {}

export class UpdatePasswordDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @ApiProperty()
  @IsString()
  @MinLength(6)
  @MaxLength(100)
  newPassword: string;

  @ApiProperty()
  @IsString()
  confirmNewPassword: string;
}

export class OwnerRegistrationDto {
  @ApiProperty({ example: 'Nguyễn Văn A' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({ example: 'nguyenvana@gmail.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '0905123456' })
  @Matches(PHONE_PATTERN, { message: 'Số điện thoại không hợp lệ' })
  phone: string;

  @ApiProperty({ example: '43A-12345' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  licensePlates: string;
}

export class OwnerRegistrationDecisionDto {
  @ApiProperty()
  @IsBoolean()
  isConfirm: boolean;
}
