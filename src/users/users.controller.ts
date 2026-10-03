import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiExtraModels,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { MetaSchema } from 'schemas';
import { GetCurrentUser, Roles } from 'src/auth/decorators';
import { RolesGuard } from 'src/auth/guards';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { UploadAvatarDto } from 'src/users/dto/upload-avatar.dto';

import {
  CreateUserDto,
  OwnerRegistrationDecisionDto,
  OwnerRegistrationDto,
  UpdatePasswordDto,
  UpdateProfileDto,
  UpdateRoleUserDto,
  UpdateUserDto,
  UserDto,
} from './dto';
import { UsersService } from './users.service';

const ALL_ROLES = [RoleName.ADMIN, RoleName.CAROWNER, RoleName.TRAVELER];
const MAX_AVATAR_SIZE = 5 * 1024 * 1024;

@ApiBearerAuth()
@ApiTags('Users')
@Controller('users')
@UseGuards(RolesGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @ApiOperation({ summary: 'Get all users' })
  @ApiExtraModels(UserDto, MetaSchema)
  @ApiResponse({
    status: 200,
    description: 'Successfully',
    content: {
      'application/json': {
        schema: {
          properties: {
            data: { type: 'array', items: { $ref: getSchemaPath(UserDto) } },
            meta: { $ref: getSchemaPath(MetaSchema) },
          },
        },
      },
    },
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'q', required: false, description: 'Tìm theo tên, tài khoản, email, số điện thoại' })
  @ApiQuery({ name: 'status', required: false, description: 'ACTIVE,INACTIVE' })
  @ApiQuery({ name: 'role', required: false, description: 'ADMIN,CAROWNER,TRAVELER' })
  @Roles(RoleName.ADMIN)
  @Get()
  getAllUsers(
    @Query('page') page: number,
    @Query('limit') limit: number,
    @Query('q') q?: string,
    @Query('status') status?: string,
    @Query('role') role?: string,
  ) {
    return this.usersService.getAllUsers(page, limit, { q, status, role });
  }

  // Các route tĩnh phải khai báo trước route động ':id' để không bị ':id' bắt mất
  @ApiOperation({ summary: 'Get profile' })
  @Roles(...ALL_ROLES)
  @Get('/profile')
  getProfile(@GetCurrentUser() currentUser: any): Promise<any> {
    return this.usersService.getProfile(currentUser);
  }

  @ApiOperation({ summary: 'Update my profile' })
  @ApiBody({ type: UpdateProfileDto })
  @Roles(...ALL_ROLES)
  @Patch('/me')
  updateProfile(@Body() body: UpdateProfileDto, @GetCurrentUser() currentUser: any): Promise<any> {
    return this.usersService.updateUser(currentUser.id, body, currentUser);
  }

  @ApiOperation({ summary: 'Get user by username' })
  @ApiParam({ name: 'username', required: true, type: String })
  @Roles(...ALL_ROLES)
  @Get('/username/:username')
  getUserByUsername(@Param('username') username: string, @GetCurrentUser() currentUser: any): Promise<UserDto> {
    return this.usersService.getUserByUsername(username, currentUser);
  }

  @ApiOperation({ summary: 'Upload avatar' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UploadAvatarDto })
  @Roles(...ALL_ROLES)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_AVATAR_SIZE },
      fileFilter: (_req, file, callback) =>
        file.mimetype.startsWith('image/')
          ? callback(null, true)
          : callback(new BadRequestException('Chỉ chấp nhận file ảnh'), false),
    }),
  )
  @Patch('avatar/upload')
  async uploadAvatar(@GetCurrentUser() currentUser: any, @UploadedFile() file: Express.Multer.File): Promise<any> {
    if (!file) throw new BadRequestException('Vui lòng chọn ảnh');

    const image = await this.cloudinaryService.uploadAvatar(file, `${currentUser.username}-${Date.now()}-avatar`);

    return this.usersService.uploadAvatar(currentUser, image);
  }

  @ApiBody({ type: OwnerRegistrationDto })
  @Roles(RoleName.TRAVELER)
  @Patch('register/role/owner')
  ownerRegistration(@Body() body: OwnerRegistrationDto, @GetCurrentUser() currentUser: any) {
    return this.usersService.ownerRegistration(body, currentUser);
  }

  @Roles(RoleName.ADMIN)
  @Get('register/role/owner')
  getAllOwnerRegistration() {
    return this.usersService.getAllOwnerRegistration();
  }

  @ApiBody({ type: OwnerRegistrationDecisionDto })
  @Roles(RoleName.ADMIN)
  @Patch('register/role/owner/:id')
  updateRequestOwnerRegistration(@Param('id', ParseIntPipe) id: number, @Body() body: OwnerRegistrationDecisionDto) {
    return this.usersService.updateRequestOwnerRegistration(id, body.isConfirm);
  }

  @ApiBody({ type: UpdatePasswordDto })
  @Roles(...ALL_ROLES)
  @Patch('password/update')
  updatePassword(@Body() body: UpdatePasswordDto, @GetCurrentUser() currentUser: any) {
    return this.usersService.updatePassword(currentUser.id, body, currentUser.sessionId);
  }

  @ApiOperation({ summary: 'Update role user by user id' })
  @ApiParam({ name: 'userId', required: true, type: Number })
  @ApiBody({ type: UpdateRoleUserDto })
  @Roles(RoleName.ADMIN)
  @Patch('/role/:userId')
  updateRoleUser(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() updateRoleUserDto: UpdateRoleUserDto,
  ): Promise<any> {
    return this.usersService.updateRoleUser(userId, updateRoleUserDto);
  }

  @ApiOperation({ summary: 'Get user by id' })
  @ApiParam({ name: 'id', required: true, type: Number })
  @Roles(...ALL_ROLES)
  @Get(':id')
  getUserById(@Param('id', ParseIntPipe) id: number, @GetCurrentUser() currentUser: any): Promise<UserDto> {
    return this.usersService.getUserById(id, currentUser);
  }

  @ApiOperation({ summary: 'Create user' })
  @ApiBody({ type: CreateUserDto })
  @Roles(RoleName.ADMIN)
  @Post()
  createUser(@Body() createUserDto: CreateUserDto): Promise<UserDto> {
    return this.usersService.createUser(createUserDto);
  }

  @ApiOperation({ summary: 'Update user by id' })
  @ApiParam({ name: 'id', required: true, type: Number })
  @ApiBody({ type: UpdateUserDto })
  @Roles(...ALL_ROLES)
  @Patch(':id')
  updateUser(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
    @GetCurrentUser() currentUser: any,
  ): Promise<UserDto> {
    return this.usersService.updateUser(id, updateUserDto, currentUser);
  }

  @ApiOperation({ summary: 'Delete user by id' })
  @ApiParam({ name: 'id', required: true, type: Number })
  @Roles(RoleName.ADMIN)
  @Delete(':id')
  deleteUser(@Param('id', ParseIntPipe) id: number): Promise<any> {
    return this.usersService.deleteUser(id);
  }
}
