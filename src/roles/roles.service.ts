import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { getPagination } from 'utils/utils';

import { CreateRoleDto, RolesDto, UpdateRoleDto } from './dto';

@Injectable()
export class RolesService {
  constructor(private readonly prismaService: PrismaService) {}

  async createRole(createRoleDto: CreateRoleDto): Promise<RolesDto> {
    const { name } = createRoleDto;
    const nameRole = name.toUpperCase();

    const exitsRole = await this.prismaService.role.findFirst({
      where: {
        name: nameRole as RoleName,
      },
    });

    if (exitsRole) {
      throw new ConflictException('Role already exists');
    }

    const role = await this.prismaService.role.create({
      data: {
        name: nameRole as RoleName,
      },
    });

    return role;
  }

  async findAllRoles(page: number, limit: number): Promise<any> {
    const { _page, _limit } = getPagination(page, limit);

    // Calculate the total number of users
    const totalRoles = await this.prismaService.role.count();
    const totalPages = Math.ceil(totalRoles / _limit);

    // Calculate the number of items to skip
    const offset = (_page - 1) * _limit;

    const roles = await this.prismaService.role.findMany({
      skip: offset,
      take: _limit,
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      data: roles,
      meta: {
        totalRoles,
        totalPages,
        page: _page,
        limit: _limit,
      },
    };
  }

  async findOneById(id: number): Promise<RolesDto> {
    const role = await this.prismaService.role.findUnique({
      where: {
        id,
      },
    });

    if (!role) {
      throw new NotFoundException('Role not found with id ' + id);
    }

    return role;
  }

  async updateRole(id: number, updateRoleDto: UpdateRoleDto): Promise<any> {
    const { name } = updateRoleDto;
    const nameRole = name.toUpperCase();

    const role = await this.prismaService.role.update({
      where: {
        id,
      },
      data: {
        name: nameRole as RoleName,
      },
    });

    if (!role) {
      throw new NotFoundException('Role not found with id ' + id);
    }

    return role;
  }

  async removeRole(id: number): Promise<any> {
    const role = await this.prismaService.role.delete({
      where: {
        id,
      },
    });

    if (!role) {
      throw new NotFoundException('Role not found with id ' + id);
    }

    return `Removed a #${id} role`;
  }
}
