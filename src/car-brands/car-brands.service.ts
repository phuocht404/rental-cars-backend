import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { getPagination } from 'utils/utils';

import { CarBrandDto, UpdateCarBrandDto } from './dto';

interface CreateCarBrandParams {
  name: string;
}

@Injectable()
export class CarBrandsService {
  constructor(private readonly prismaService: PrismaService) {}

  async createCarBrand({ name }: CreateCarBrandParams): Promise<CarBrandDto> {
    const carBrandExists = await this.prismaService.carBrand.findFirst({
      where: {
        name,
      },
    });

    if (carBrandExists) {
      throw new ConflictException('Car brand already exists');
    }

    const carBrand = await this.prismaService.carBrand.create({
      data: {
        name,
      },
    });

    return carBrand;
  }

  async findAllCarBrands(page, limit): Promise<any> {
    const { _page, _limit } = getPagination(page, limit);

    // Calculate the total number of users
    const totalCarBrand = await this.prismaService.carBrand.count();
    const totalPages = Math.ceil(totalCarBrand / _limit);

    // Calculate the number of items to skip
    const offset = (_page - 1) * _limit;

    const carBrands = await this.prismaService.carBrand.findMany({
      skip: offset,
      take: _limit,
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      data: carBrands,
      meta: {
        totalPages,
        _page,
        _limit,
        totalCarBrand,
      },
    };
  }

  async findOneById(id: number): Promise<CarBrandDto> {
    const carBrand = await this.prismaService.carBrand.findFirst({
      where: {
        id,
      },
    });

    if (!carBrand) {
      throw new NotFoundException(`Car brand with id ${id} not found`);
    }

    return carBrand;
  }

  async updateCarBrand(id: number, updateCarBrandDto: UpdateCarBrandDto): Promise<CarBrandDto> {
    const { name } = updateCarBrandDto;
    const carBrand = await this.prismaService.carBrand.update({
      where: {
        id,
      },
      data: {
        name,
      },
    });

    if (!carBrand) {
      throw new NotFoundException(`Car brand with id ${id} not found`);
    }

    return carBrand;
  }

  async removeCarBrand(id: number): Promise<string> {
    const carBrand = await this.prismaService.carBrand.delete({
      where: {
        id,
      },
    });

    if (!carBrand) {
      throw new NotFoundException(`Car brand with id ${id} not found`);
    }

    return `This action removes a #${id} carBrand`;
  }

  async findAllCarBrandsWithModels(): Promise<any> {
    const carBrands = await this.prismaService.carBrand.findMany({
      include: {
        CarModel: true,
      },
    });

    return carBrands.map((carBrand) => {
      return {
        id: carBrand.id,
        name: carBrand.name,
        models: carBrand.CarModel.map((carModel) => {
          return {
            id: carModel.id,
            name: carModel.name,
          };
        }),
      };
    });
  }
}
