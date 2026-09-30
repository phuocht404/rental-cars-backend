import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
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

import { CreateUserDto, UpdateRoleUserDto, UpdateUserDto, UserDto } from './dto';
import { UsersService } from './users.service';

@ApiBearerAuth()
@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @ApiOperation({ summary: 'Get all user' })
  @ApiExtraModels(UserDto, MetaSchema)
  @ApiResponse({
    status: 200,
    description: 'Successfully',
    content: {
      'application/json': {
        schema: {
          allOf: [
            {
              properties: {
                data: {
                  type: 'array',
                  items: { $ref: getSchemaPath(UserDto) },
                },
              },
            },
            {
              properties: {
                meta: {
                  $ref: getSchemaPath(MetaSchema),
                },
              },
            },
          ],
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @Get()
  @Roles(RoleName.ADMIN)
  @UseGuards(RolesGuard)
  getAllUsers(@Query('page') page: number, @Query('limit') limit: number): Promise<any> {
    return this.usersService.getAllUsers(page, limit);
  }

  @ApiOperation({ summary: 'Get user by id' })
  @ApiExtraModels(UserDto)
  @ApiResponse({
    status: 200,
    description: 'Successfully',
    content: {
      'application/json': {
        schema: { $ref: getSchemaPath(UserDto) },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'User with id: {id} not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @ApiParam({ name: 'id', required: true, type: Number })
  @Get(':id')
  @Roles(RoleName.ADMIN, RoleName.TRAVELER, RoleName.CAROWNER)
  @UseGuards(RolesGuard)
  getUserById(@Param('id') id: number): Promise<UserDto> {
    try {
      return this.usersService.getUserById(id);
    } catch (error) {
      throw new Error(error.message);
    }
  }

  @ApiOperation({ summary: 'Get user by username' })
  @ApiExtraModels(UserDto)
  @ApiResponse({
    status: 200,
    description: 'Successfully',
    content: {
      'application/json': {
        schema: { $ref: getSchemaPath(UserDto) },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({
    status: 404,
    description: 'User with username: {username} not found',
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @ApiParam({ name: 'username', required: true, type: String })
  @Get('/username/:username')
  @Roles(RoleName.ADMIN, RoleName.TRAVELER, RoleName.CAROWNER)
  @UseGuards(RolesGuard)
  getUserByUsername(@Param('username') username: string): Promise<UserDto> {
    return this.usersService.getUserByUsername(username);
  }

  @ApiOperation({ summary: 'Get profile' })
  @ApiExtraModels(UserDto)
  @ApiResponse({
    status: 200,
    description: 'Successfully',
    content: {
      'application/json': {
        schema: { $ref: getSchemaPath(UserDto) },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN, RoleName.CAROWNER, RoleName.TRAVELER)
  @Get('/profile')
  getProfile(@GetCurrentUser() currentUser: any): Promise<any> {
    try {
      return this.usersService.getProfile(currentUser);
    } catch (error) {
      throw new Error(error.message);
    }
  }

  @ApiOperation({ summary: 'Add new user' })
  @ApiExtraModels(UserDto)
  @ApiResponse({
    status: 201,
    description: 'Successfully',
    content: {
      'application/json': {
        schema: { $ref: getSchemaPath(UserDto) },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @ApiBody({ type: CreateUserDto })
  @Post()
  @Roles(RoleName.ADMIN)
  @UseGuards(RolesGuard)
  createUser(@Body() createUserDto: CreateUserDto): Promise<UserDto> {
    return this.usersService.createUser(createUserDto);
  }

  //  update user by id
  @ApiOperation({ summary: 'Update user by id' })
  @ApiExtraModels(UserDto)
  @ApiResponse({
    status: 200,
    description: 'Successfully',
    content: {
      'application/json': {
        schema: { $ref: getSchemaPath(UserDto) },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({
    status: 404,
    description: 'User with id: {id} not found',
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @ApiParam({ name: 'id', required: true, type: Number })
  @ApiBody({ type: UpdateUserDto })
  @Patch(':id')
  @Roles(RoleName.ADMIN, RoleName.TRAVELER, RoleName.CAROWNER)
  @UseGuards(RolesGuard)
  updateUser(
    @Param('id') id: number,
    @Body() updateUserDto: UpdateUserDto,
    @GetCurrentUser() currentUser: any,
  ): Promise<UserDto> {
    return this.usersService.updateUser(id, updateUserDto, currentUser);
  }

  //  delete user by id
  @ApiOperation({ summary: 'Delete user by id' })
  @ApiResponse({
    status: 200,
    description: 'User: ${user.name} has been deleted',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({
    status: 404,
    description: 'User with id: {id} not found',
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @ApiParam({ name: 'id', required: true, type: Number })
  @Delete(':id')
  @Roles(RoleName.ADMIN)
  @UseGuards(RolesGuard)
  deleteUser(@Param('id') id: number): Promise<UserDto> {
    return this.usersService.deleteUser(id);
  }

  // update role user by user id
  @ApiOperation({ summary: 'Update role user by user id' })
  @ApiResponse({
    status: 200,
    description: 'Successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({
    status: 404,
    description: 'Role with name ${role} not found',
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @ApiParam({ name: 'userId', required: true, type: Number })
  @ApiBody({ type: UpdateRoleUserDto })
  @Patch('/role/:userId')
  @Roles(RoleName.ADMIN)
  @UseGuards(RolesGuard)
  updateRoleUser(@Param('userId') userId: number, @Body() updateRoleUserDto: UpdateRoleUserDto): Promise<any> {
    try {
      return this.usersService.updateRoleUser(userId, updateRoleUserDto);
    } catch (error) {
      throw new Error(error.message);
    }
  }

  @ApiOperation({ summary: 'Upload avatar' })
  @ApiExtraModels(UserDto)
  @ApiResponse({
    status: 200,
    description: 'Successfully',
    content: {
      'application/json': {
        schema: { $ref: getSchemaPath(UserDto) },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @ApiConsumes('multipart/forms-data')
  @ApiBody({
    description: 'List of cats',
    type: UploadAvatarDto,
  })
  @Roles(RoleName.ADMIN, RoleName.CAROWNER, RoleName.TRAVELER)
  @UseGuards(RolesGuard)
  @UseInterceptors(FileInterceptor('file'))
  @Patch('avatar/upload')
  async uploadAvatar(
    @GetCurrentUser() currentUser: any,
    @UploadedFile('file') file: Express.Multer.File,
  ): Promise<any> {
    try {
      const nameImage = `${currentUser.username}-${Date.now()}-avatar`;

      if (!file) throw new Error('File not found');
      const image = await this.cloudinaryService.uploadAvatar(file, nameImage);

      return this.usersService.uploadAvatar(currentUser, image);
    } catch (error) {
      throw new Error(error);
    }
  }

  @UseGuards(RolesGuard)
  @Roles(RoleName.TRAVELER)
  @Patch('register/role/owner')
  ownerRegistration(@Body() body: any, @GetCurrentUser() currentUser: any) {
    return this.usersService.ownerRegistration(body, currentUser);
  }

  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN)
  @Get('register/role/owner')
  getAllOwnerRegistration() {
    return this.usersService.getAllOwnerRegistration();
  }

  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN)
  @Patch('register/role/owner/:id')
  updateRequestOwnerRegistration(@Param('id') id: number, @Body() body: any) {
    return this.usersService.updateRequestOwnerRegistration(id, body);
  }

  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN, RoleName.CAROWNER, RoleName.TRAVELER)
  @Patch('password/update')
  updatePassword(@Body() body: any, @GetCurrentUser() currentUser: any) {
    const { id } = currentUser;

    return this.usersService.updatePassword(id, body);
  }
}
