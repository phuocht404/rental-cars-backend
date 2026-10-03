import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { getPagination } from 'utils/utils';

import { CreateCarModelDto } from './dto/create-car-model.dto';
import { UpdateCarModelDto } from './dto/update-car-model.dto';

@Injectable()
export class CarModelsService {
  constructor(private readonly prismaService: PrismaService) {}

  async createCarModel(createCarModelDto: CreateCarModelDto): Promise<any> {
    const { name, brandId } = createCarModelDto;

    const exitsCarModel = await this.prismaService.carModel.findFirst({
      where: {
        name,
      },
    });

    if (exitsCarModel) {
      throw new ConflictException('Car model already exists');
    }

    const carModel = await this.prismaService.carModel.create({
      data: {
        name,
        brandId: Number(brandId),
      },
      select: {
        id: true,
        name: true,
        brand: {
          select: {
            name: true,
          },
        },
      },
    });

    const carModelResponse = { ...carModel, brand: carModel.brand.name };

    return carModelResponse;
  }

  async findAllCarModel(page: number, limit: number): Promise<any> {
    const { _page, _limit } = getPagination(page, limit);

    // Calculate the total number of users
    const totalCarModel = await this.prismaService.carModel.count();
    const totalPages = Math.ceil(totalCarModel / _limit);

    // Calculate the number of items to skip
    const offset = (_page - 1) * _limit;

    const carModels = await this.prismaService.carModel.findMany({
      skip: offset,
      take: _limit,
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        name: true,
        brand: {
          select: {
            name: true,
          },
        },
      },
    });

    const carModelsResponse = carModels.map((carModel) => ({
      ...carModel,
      brand: carModel.brand.name,
    }));

    return {
      data: carModelsResponse,
      meta: {
        totalPages,
        _page,
        _limit,
        totalCarModel,
      },
    };
  }

  async findOneById(id: number): Promise<any> {
    const carModel = await this.prismaService.carModel.findFirst({
      where: {
        id,
      },
      select: {
        id: true,
        name: true,
        brand: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!carModel) {
      throw new NotFoundException(`Car model with id ${id} not found`);
    }

    const carModelResponse = { ...carModel, brand: carModel.brand.name };

    return carModelResponse;
  }

  async updateById(id: number, updateCarModelDto: UpdateCarModelDto): Promise<any> {
    const { name, brandId } = updateCarModelDto;
    const carModel = await this.prismaService.carModel.update({
      where: {
        id,
      },
      data: {
        name,
        brandId: Number(brandId),
      },
      select: {
        id: true,
        name: true,
        brand: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!carModel) {
      throw new NotFoundException(`Car model with id ${id} not found`);
    }

    const carModelResponse = { ...carModel, brand: carModel.brand.name };

    return carModelResponse;
  }

  async removeById(id: number): Promise<string> {
    const carModel = await this.prismaService.carModel.delete({
      where: {
        id,
      },
    });

    if (!carModel) {
      throw new NotFoundException(`Car model with id ${id} not found`);
    }

    return `This action removes a #${id} carModel`;
  }
}
