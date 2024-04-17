import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { RoleName } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { convertBase64ToFile, getPagination } from 'utils/utils';

import { UpdateRoleUserDto } from './dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async getAllUsers(page: number, limit: number): Promise<any> {
    const { _page, _limit } = getPagination(page, limit);

    // Calculate the total number of users
    const totalUsers = await this.prismaService.user.count();
    const totalPages = Math.ceil(totalUsers / _limit);

    // Calculate the number of items to skip
    const offset = (_page - 1) * _limit;

    const users = await this.prismaService.user.findMany({
      skip: offset,
      take: _limit,
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        phone: true,
        gender: true,
        dateOfBirth: true,
        address: true,
        avatarUrl: true,
        status: true,
        role: {
          select: {
            name: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    });

    // change role from object to string
    const usersResponse = users.map((user) => {
      return { ...user, role: user.role.name };
    });

    return {
      data: usersResponse,
      meta: {
        totalPages,
        _page,
        _limit,
        totalUsers,
      },
    };
  }

  async getUserById(id: number): Promise<any> {
    const user = await this.prismaService.user.findFirst({
      where: {
        id: Number(id),
      },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        phone: true,
        gender: true,
        dateOfBirth: true,
        address: true,
        avatarUrl: true,
        status: true,
        role: {
          select: {
            name: true,
          },
        },
        Order: {
          select: {
            OrderDetail: {
              select: {
                carId: true,
                orderDetailStatus: true,
              },
            },
            orderStatus: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    });

    // calculate success rate
    const totalTrips = user.Order.length;
    const totalSuccessTrips = user.Order.filter((order) => order.orderStatus === 'COMPLETED').length;
    const successRate = (totalSuccessTrips / totalTrips) * 100 || 0;

    if (!user) throw new NotFoundException(`User with id ${id} not found`);

    return {
      ...user,
      role: user.role.name,
      trips: totalSuccessTrips,
      successRate: successRate,
      Order: undefined,
    };
  }

  async getUserByUsername(username: string): Promise<any> {
    const user = await this.prismaService.user.findUnique({
      where: {
        username,
      },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        phone: true,
        gender: true,
        dateOfBirth: true,
        address: true,
        avatarUrl: true,
        status: true,
        role: {
          select: {
            name: true,
          },
        },
        createdAt: true,
        updatedAt: true,
        Order: {
          where: {
            orderStatus: 'COMPLETED',
          },
        },
      },
    });

    if (!user) throw new NotFoundException(`User with username ${username} not found`);

    return { ...user, role: user.role.name, trips: user.Order.length, Order: undefined };
  }

  async getProfile(currentUser: any): Promise<any> {
    return currentUser;
  }

  async createUser(data: any): Promise<any> {
    const roleId = await this.prismaService.role.findFirst({
      where: {
        name: (data.role as RoleName) || RoleName.TRAVELER,
      },
      select: {
        id: true,
      },
    });

    // upload avatar
    if (!data.avatarUrl) {
      data.avatarUrl =
        'https://res.cloudinary.com/dj1v6wmjv/image/upload/v1701074365/rental-cars-cloudinary/avatars/avatar-default.jpg';
    } else {
      const avatarFile = convertBase64ToFile(data.avatarUrl);

      const nameImage = `${data.username}-${Date.now()}-avatar`;
      const avatar = await this.cloudinaryService.uploadAvatar(avatarFile, nameImage);

      data.avatarUrl = avatar.url;
    }

    delete data.role;

    // hash password
    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = await this.prismaService.user.create({
      data: {
        ...data,
        password: hashedPassword,
        roleId: Number(roleId.id),
      },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        phone: true,
        gender: true,
        dateOfBirth: true,
        address: true,
        avatarUrl: true,
        status: true,
        role: {
          select: {
            name: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) throw new Error('Cannot create user');

    return { ...user, role: user.role.name };
  }

  async updateUser(id: number, data: any): Promise<any> {
    const roleId = await this.prismaService.role.findFirst({
      where: {
        name: (data.role as RoleName) || RoleName.TRAVELER,
      },
      select: {
        id: true,
      },
    });

    // hash password
    if (data.password) {
      data.password = await bcrypt.hash(data.password, 10);
    }

    const existUser = await this.prismaService.user.findUnique({
      where: {
        id: Number(id),
      },
      select: {
        avatarUrl: true,
      },
    });

    if (data.avatarUrl !== existUser.avatarUrl) {
      const avatarFile = convertBase64ToFile(data.avatarUrl);

      const nameImage = `${data.username}-${Date.now()}-avatar`;
      const avatar = await this.cloudinaryService.uploadAvatar(avatarFile, nameImage);

      data.avatarUrl = avatar.url;
    }

    delete data.role;

    const user = await this.prismaService.user.update({
      where: {
        id: Number(id),
      },
      data: {
        ...data,
        roleId: Number(roleId.id),
      },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        phone: true,
        gender: true,
        dateOfBirth: true,
        address: true,
        avatarUrl: true,
        status: true,
        role: {
          select: {
            name: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) throw new NotFoundException(`User with id ${id} not found`);

    return { ...user, role: user.role.name };
  }

  async deleteUser(id: number): Promise<any> {
    const user = await this.prismaService.user.findUnique({
      where: {
        id: Number(id),
      },
    });

    if (!user) throw new NotFoundException(`User with id ${id} not found`);

    await this.prismaService.user.delete({
      where: {
        id: Number(id),
      },
    });

    return `User: ${user.name} has been deleted`;
  }

  async updateRoleUser(userId: number, body: UpdateRoleUserDto): Promise<any> {
    const { role } = body;

    const isRole = await this.prismaService.role.findFirst({
      where: {
        name: role as RoleName,
      },
      select: {
        id: true,
      },
    });

    if (!isRole) throw new NotFoundException(`Role with name ${role} not found`);

    const user = await this.prismaService.user.update({
      where: {
        id: userId,
      },
      data: {
        roleId: Number(isRole?.id),
      },
      select: {
        username: true,
        name: true,
        role: {
          select: {
            name: true,
          },
        },
      },
    });

    return { ...user, role: user.role.name };
  }

  async uploadAvatar(currentUser: any, image: any): Promise<any> {
    const { id } = currentUser;
    const { url } = image;

    const user = await this.prismaService.user.update({
      where: {
        id: Number(id),
      },
      data: {
        avatarUrl: url,
      },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        phone: true,
        gender: true,
        dateOfBirth: true,
        address: true,
        avatarUrl: true,
        status: true,
        role: {
          select: {
            name: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) throw new NotFoundException(`User with id ${id} not found`);

    return { ...user, role: user.role.name };
  }

  async ownerRegistration(body: any, currentUser: any): Promise<any> {
    const { name, email, phone, licensePlates } = body;

    const isLicensePlates = await this.prismaService.car.findFirst({
      where: {
        licensePlates,
      },
    });

    if (isLicensePlates) throw new BadRequestException(`Biển số xe: ${licensePlates} đã tồn tại`);

    const user = await this.prismaService.user.update({
      where: {
        id: Number(currentUser.id),
      },
      data: {
        registerOwner: true,
      },
    });

    return user;
  }

  async getAllOwnerRegistration(): Promise<any> {
    const users = await this.prismaService.user.findMany({
      where: {
        registerOwner: true,
      },
      select: {
        id: true,
        name: true,
        avatarUrl: true,
        registerAt: true,
      },
      orderBy: {
        registerAt: 'desc',
      },
    });

    return users;
  }

  async updateRequestOwnerRegistration(id: number, body: any): Promise<any> {
    const { isConfirm } = body;

    if (isConfirm) {
      const ownerRole = await this.prismaService.role.findFirst({
        where: {
          name: RoleName.CAROWNER,
        },
        select: {
          id: true,
        },
      });

      const user = await this.prismaService.user.update({
        where: {
          id: Number(id),
        },
        data: {
          registerOwner: false,
          roleId: ownerRole.id,
        },
      });

      return user;
    } else {
      const travelerRole = await this.prismaService.role.findFirst({
        where: {
          name: RoleName.TRAVELER,
        },
        select: {
          id: true,
        },
      });

      const user = await this.prismaService.user.update({
        where: {
          id: Number(id),
        },
        data: {
          registerOwner: false,
          roleId: travelerRole.id,
        },
      });

      return user;
    }
  }

  async updatePassword(id: number, body: any): Promise<any> {
    const { currentPassword, newPassword, confirmNewPassword } = body;

    if (newPassword !== confirmNewPassword) throw new BadRequestException('Mật khẩu mới không khớp');

    const userOld = await this.prismaService.user.findUnique({
      where: {
        id: Number(id),
      },
      select: {
        password: true,
      },
    });

    const isMatch = await bcrypt.compare(currentPassword, userOld.password);

    if (!isMatch) throw new BadRequestException('Mật khẩu hiện tại không đúng');

    const hashedPassword = await bcrypt.hash(currentPassword, 10);

    const user = await this.prismaService.user.update({
      where: {
        id: Number(id),
      },
      data: {
        password: hashedPassword,
      },
    });

    return user;
  }
}
