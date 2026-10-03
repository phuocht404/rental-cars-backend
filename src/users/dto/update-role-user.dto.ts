import { ApiProperty } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateRoleUserDto {
  @ApiProperty({ enum: RoleName, example: RoleName.CAROWNER })
  @IsEnum(RoleName)
  role: RoleName;
}
