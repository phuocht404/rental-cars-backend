import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus, Prisma, RoleName, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { getPagination, normalizeSearch, parseEnumList } from 'utils/utils';

import { CreateUserDto, OwnerRegistrationDto, UpdatePasswordDto, UpdateRoleUserDto, UpdateUserDto } from './dto';
import { PrismaService } from '../prisma/prisma.service';
import { SessionsService } from '../sessions/sessions.service';

const DEFAULT_AVATAR_URL =
  'https://res.cloudinary.com/dj1v6wmjv/image/upload/v1701074365/rental-cars-cloudinary/avatars/avatar-default.jpg';

// Thông tin an toàn để trả về (không bao giờ có mật khẩu)
const SAFE_USER_SELECT = {
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
  registerOwner: true,
  registerAt: true,
  role: { select: { name: true } },
  createdAt: true,
  updatedAt: true,
};

@Injectable()
export class UsersService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly sessionsService: SessionsService,
  ) {}

  async getAllUsers(page: number, limit: number, filter: { q?: string; status?: string; role?: string } = {}) {
    const { _page, _limit } = getPagination(page, limit);
    const q = normalizeSearch(filter.q);
    const statuses = parseEnumList(filter.status, UserStatus);
    const roles = parseEnumList(filter.role, RoleName);

    const where: Prisma.UserWhereInput = {
      ...(statuses && { status: { in: statuses } }),
      ...(roles && { role: { name: { in: roles } } }),
      ...(q && {
        OR: [
          { name: { contains: q } },
          { username: { contains: q } },
          { email: { contains: q } },
          { phone: { contains: q } },
        ],
      }),
    };

    const [totalUsers, users] = await this.prismaService.$transaction([
      this.prismaService.user.count({ where }),
      this.prismaService.user.findMany({
        where,
        skip: (_page - 1) * _limit,
        take: _limit,
        orderBy: {
          createdAt: 'desc',
        },
        select: SAFE_USER_SELECT,
      }),
    ]);

    return {
      data: users.map((user) => ({ ...user, role: user.role?.name })),
      meta: {
        totalPages: Math.ceil(totalUsers / _limit),
        _page,
        _limit,
        totalUsers,
      },
    };
  }

  // Chủ xe và người thuê có chung ít nhất một chuyến thì được xem thông tin liên hệ của nhau
  private async canSeeContact(targetId: number, currentUser: any): Promise<boolean> {
    if (!currentUser) return false;
    if (currentUser.role === RoleName.ADMIN || currentUser.id === targetId) return true;

    const sharedTrip = await this.prismaService.orderDetail.findFirst({
      where: {
        OR: [
          { car: { userId: targetId }, order: { travelerId: currentUser.id } },
          { car: { userId: currentUser.id }, order: { travelerId: targetId } },
        ],
      },
      select: { id: true },
    });

    return !!sharedTrip;
  }

  private async withTripStats(user: { id: number; role?: { name: RoleName } | null }, currentUser: any) {
    const [totalOrders, completedOrders, canSeeContact] = await Promise.all([
      this.prismaService.order.count({ where: { travelerId: user.id } }),
      this.prismaService.order.count({ where: { travelerId: user.id, orderStatus: OrderStatus.COMPLETED } }),
      this.canSeeContact(user.id, currentUser),
    ]);

    const result: any = {
      ...user,
      role: user.role?.name,
      trips: completedOrders,
      successRate: totalOrders > 0 ? Math.round((completedOrders / totalOrders) * 100) : 0,
    };

    if (!canSeeContact) {
      // Ẩn thông tin cá nhân với người không liên quan
      for (const key of [
        'email',
        'phone',
        'address',
        'dateOfBirth',
        'gender',
        'registerOwner',
        'registerAt',
        'status',
      ]) {
        delete result[key];
      }
    }

    return result;
  }

  async getUserById(id: number, currentUser?: any): Promise<any> {
    const user = await this.prismaService.user.findUnique({
      where: { id: Number(id) },
      select: SAFE_USER_SELECT,
    });

    if (!user) throw new NotFoundException(`User with id ${id} not found`);

    return this.withTripStats(user, currentUser);
  }

  async getUserByUsername(username: string, currentUser?: any): Promise<any> {
    const user = await this.prismaService.user.findUnique({
      where: { username },
      select: SAFE_USER_SELECT,
    });

    if (!user) throw new NotFoundException(`User with username ${username} not found`);

    return this.withTripStats(user, currentUser);
  }

  async getProfile(currentUser: any): Promise<any> {
    return this.getUserById(currentUser.id, currentUser);
  }

  async createUser(dto: CreateUserDto): Promise<any> {
    const { role: roleName, avatarUrl, ...data } = dto;

    const roleId = await this.prismaService.role.findFirst({
      where: {
        name: roleName || RoleName.TRAVELER,
      },
      select: {
        id: true,
      },
    });

    if (!roleId) throw new BadRequestException('Vai trò không hợp lệ');

    // hash password
    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = await this.prismaService.user.create({
      data: {
        ...data,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
        avatarUrl: avatarUrl ?? DEFAULT_AVATAR_URL,
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

    return { ...user, role: user.role.name };
  }

  async updateUser(id: number, body: UpdateUserDto, currentUser: any): Promise<any> {
    const isAdmin = currentUser?.role === RoleName.ADMIN;

    if (!isAdmin && Number(id) !== currentUser?.id) {
      throw new ForbiddenException('Bạn chỉ được cập nhật thông tin của chính mình');
    }

    const existUser = await this.prismaService.user.findUnique({
      where: {
        id: Number(id),
      },
      select: {
        avatarUrl: true,
      },
    });

    if (!existUser) throw new NotFoundException(`User with id ${id} not found`);

    // Chỉ cho phép các trường hồ sơ; vai trò, trạng thái, mật khẩu... chỉ admin mới được đổi
    const data: any = {};
    for (const key of ['name', 'email', 'phone', 'gender', 'address']) {
      if (body[key] !== undefined) data[key] = body[key];
    }
    // Prisma cần Date (hoặc ISO datetime đầy đủ), client có thể gửi "YYYY-MM-DD"
    if (body.dateOfBirth !== undefined) data.dateOfBirth = new Date(body.dateOfBirth);

    if (isAdmin) {
      if (body.username !== undefined) data.username = body.username;
      if (body.status !== undefined) data.status = body.status;
      if (body.password) data.password = await bcrypt.hash(body.password, 10);

      if (body.role) {
        const role = await this.prismaService.role.findFirst({
          where: { name: body.role as RoleName },
          select: { id: true },
        });

        if (!role) throw new BadRequestException('Vai trò không hợp lệ');

        data.roleId = role.id;
      }
    }

    if (body.avatarUrl !== undefined) data.avatarUrl = body.avatarUrl;

    const user = await this.prismaService.user.update({
      where: {
        id: Number(id),
      },
      data,
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

    // Bị khoá hoặc bị đổi mật khẩu bởi admin: đăng xuất mọi thiết bị; còn lại chỉ cần làm mới cache
    if (isAdmin && (data.status === UserStatus.INACTIVE || data.password)) {
      await this.sessionsService.revokeAllForUser(Number(id));
    } else {
      this.sessionsService.invalidateUser(Number(id));
    }

    return { ...user, role: user.role.name };
  }

  async deleteUser(id: number): Promise<any> {
    const user = await this.prismaService.user.findUnique({
      where: { id: Number(id) },
      select: { id: true, name: true, _count: { select: { Order: true, Car: true } } },
    });

    if (!user) throw new NotFoundException(`User with id ${id} not found`);

    // Người dùng đã có đơn hàng/xe thì chỉ khoá tài khoản để giữ lịch sử giao dịch
    if (user._count.Order > 0 || user._count.Car > 0) {
      await this.prismaService.user.update({ where: { id: user.id }, data: { status: UserStatus.INACTIVE } });
      await this.sessionsService.revokeAllForUser(user.id);

      return `User: ${user.name} has history, so the account was deactivated instead of deleted`;
    }

    await this.prismaService.user.delete({ where: { id: user.id } });
    this.sessionsService.invalidateUser(user.id);

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

    this.sessionsService.invalidateUser(Number(userId));

    return { ...user, role: user.role.name };
  }

  async uploadAvatar(currentUser: any, image: any): Promise<any> {
    const { id } = currentUser;
    const url = image.secure_url ?? image.url;

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

    this.sessionsService.invalidateUser(Number(id));

    return { ...user, role: user.role.name };
  }

  async ownerRegistration(body: OwnerRegistrationDto, currentUser: any): Promise<any> {
    const { name, licensePlates } = body;

    const isLicensePlates = await this.prismaService.car.findFirst({
      where: {
        licensePlates,
      },
      select: { id: true },
    });

    if (isLicensePlates) throw new BadRequestException(`Biển số xe: ${licensePlates} đã tồn tại`);

    const user = await this.prismaService.user.update({
      where: {
        id: Number(currentUser.id),
      },
      data: {
        name,
        registerOwner: true,
        registerAt: new Date(),
      },
      select: SAFE_USER_SELECT,
    });

    return { ...user, role: user.role?.name };
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

  async updateRequestOwnerRegistration(id: number, isConfirm: boolean): Promise<any> {
    const role = await this.prismaService.role.findFirst({
      where: {
        name: isConfirm ? RoleName.CAROWNER : RoleName.TRAVELER,
      },
      select: {
        id: true,
      },
    });

    if (!role) throw new BadRequestException('Vai trò không tồn tại');

    const user = await this.prismaService.user.update({
      where: {
        id: Number(id),
      },
      data: {
        registerOwner: false,
        roleId: role.id,
      },
      select: SAFE_USER_SELECT,
    });

    this.sessionsService.invalidateUser(Number(id));

    return { ...user, role: user.role?.name };
  }

  async updatePassword(id: number, body: UpdatePasswordDto, currentSessionId?: string): Promise<any> {
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

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const user = await this.prismaService.user.update({
      where: {
        id: Number(id),
      },
      data: {
        password: hashedPassword,
      },
      select: { id: true, username: true },
    });

    // Đổi mật khẩu: đăng xuất mọi thiết bị khác, giữ lại thiết bị đang thao tác
    await this.sessionsService.revokeAllForUser(Number(id), currentSessionId);

    return user;
  }
}
