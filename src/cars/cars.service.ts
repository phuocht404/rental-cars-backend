import { Injectable, NotFoundException } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CarStatus, Fuel, Transmission } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { formatDecimalToNumber, generateSlug, getPagination } from 'utils/utils';

@ApiBearerAuth()
@ApiTags('cars-images')
@Injectable()
export class CarsService {
  constructor(private readonly prismaService: PrismaService) {}

  async createCar(createCarDto: any, currentUser: any): Promise<any> {
    const model = await this.prismaService.carModel.findFirst({
      where: {
        id: Number(createCarDto.modelId),
      },
    });
    const name = model.name + ' ' + createCarDto.yearOfManufacture;

    const slug = generateSlug(createCarDto);

    const newCar = await this.prismaService.car.create({
      data: {
        name,
        slug,
        licensePlates: createCarDto.licensePlates,
        seats: createCarDto.seats,
        yearOfManufacture: createCarDto.yearOfManufacture,
        transmission: createCarDto.transmission.toUpperCase() as Transmission,
        fuel: createCarDto.fuel.toUpperCase() as Fuel,
        description: createCarDto.description,
        pricePerDay: createCarDto.pricePerDay,
        address: 'createCarDto.address',
        status: CarStatus.UNAVAILABLE,
        modelId: Number(createCarDto.modelId),
        userId: currentUser.id,
        CarImage: {
          create: createCarDto.images.map((image) => ({
            url: image,
          })),
        },
      },
    });

    const carFeatures = await this.prismaService.carFeature.createMany({
      data: createCarDto.features.map((feature: any) => ({
        carId: newCar.id,
        featureId: feature,
      })),
    });

    return newCar;
  }

  async findAllCar(page: number, limit: number): Promise<any> {
    const { _page, _limit } = getPagination(page, limit);

    // Calculate the total number of users
    const totalCars = await this.prismaService.car.count();
    const totalPages = Math.ceil(totalCars / _limit);

    // Calculate the number of items to skip
    const offset = (_page - 1) * _limit;

    const cars = await this.prismaService.car.findMany({
      skip: offset,
      take: _limit,
      orderBy: {
        createdAt: 'desc',
      },
      where: {
        OR: [
          {
            status: CarStatus.AVAILABLE,
          },
          {
            status: CarStatus.UNAVAILABLE,
          },
        ],
      },
      select: {
        id: true,
        name: true,
        slug: true,
        licensePlates: true,
        seats: true,
        yearOfManufacture: true,
        transmission: true,
        fuel: true,
        description: true,
        pricePerDay: true,
        address: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        model: {
          select: {
            name: true,
            brand: {
              select: {
                name: true,
              },
            },
          },
        },
        CarImage: {
          select: {
            url: true,
          },
        },
        CarFeature: {
          select: {
            feature: {
              select: {
                name: true,
              },
            },
          },
        },
        OrderDetail: {
          select: {
            id: true,
            startDate: true,
            endDate: true,
          },
          where: {
            OR: [
              {
                orderDetailStatus: 'CONFIRMED',
              },
              {
                orderDetailStatus: 'RECEIVED',
              },
            ],
          },
        },
      },
    });

    const carsResponse = cars.map((car) => ({
      ...car,
      model: car.model.name,
      brand: car.model.brand.name,
      CarImage: car.CarImage.map((image) => image.url),
      CarFeature: car.CarFeature.map((feature) => feature.feature.name),
      pricePerDay: formatDecimalToNumber(car.pricePerDay),
      orderDetails: car.OrderDetail.map((orderDetail) => ({
        startDate: orderDetail.startDate,
        endDate: orderDetail.endDate,
      })),
      OrderDetail: undefined,
    }));

    return {
      data: carsResponse,
      meta: {
        totalPages,
        _page,
        _limit,
        totalCars,
      },
    };
  }

  async findOneById(id: number): Promise<any> {
    const car = await this.prismaService.car.findFirst({
      where: {
        id,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        licensePlates: true,
        seats: true,
        yearOfManufacture: true,
        transmission: true,
        fuel: true,
        description: true,
        pricePerDay: true,
        address: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        model: {
          select: {
            id: true,
            name: true,
            brand: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        CarImage: {
          select: {
            url: true,
          },
        },
        CarFeature: {
          select: {
            feature: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    });

    if (!car) {
      throw new NotFoundException(`Car with id ${id} not found`);
    }

    return {
      ...car,
      model: car.model.name,
      brand: car.model.brand.name,
      CarImage: car.CarImage.map((image) => image.url),
      CarFeature: car.CarFeature.map((feature) => feature.feature.id),
      pricePerDay: formatDecimalToNumber(car.pricePerDay),
      brandId: car.model.brand.id,
      modelId: car.model.id,
    };
  }

  async updateCarById(id: number, updateCarDto: any): Promise<any> {
    updateCarDto = {
      ...updateCarDto,
      features: undefined,
    };

    const exitsCar = await this.prismaService.car.findFirst({
      where: {
        id,
      },
    });

    if (!exitsCar) {
      throw new NotFoundException(`Car with id ${id} not found`);
    }

    const slug = generateSlug(updateCarDto.name);

    const car = await this.prismaService.car.update({
      where: {
        id,
      },
      data: {
        name: updateCarDto.name,
        slug: slug,
        licensePlates: updateCarDto.licensePlates,
        seats: updateCarDto.seats,
        yearOfManufacture: updateCarDto.yearOfManufacture,
        transmission: updateCarDto.transmission.toUpperCase() as Transmission,
        fuel: updateCarDto.fuel.toUpperCase() as Fuel,
        description: updateCarDto.description,
        pricePerDay: updateCarDto.pricePerDay,
        address: updateCarDto.address,
        status: CarStatus.UNAVAILABLE,
        modelId: Number(updateCarDto.modelId),
      },
      select: {
        id: true,
        name: true,
        slug: true,
        licensePlates: true,
        seats: true,
        yearOfManufacture: true,
        transmission: true,
        fuel: true,
        description: true,
        pricePerDay: true,
        address: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        model: {
          select: {
            name: true,
            brand: {
              select: {
                name: true,
              },
            },
          },
        },
        CarImage: {
          select: {
            url: true,
          },
        },
        CarFeature: {
          select: {
            feature: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    return {
      ...car,
      model: car.model.name,
      brand: car.model.brand.name,
      CarImage: car.CarImage.map((image) => image.url),
      CarFeature: car.CarFeature.map((feature) => feature.feature.name),
    };
  }

  async removeById(id: number): Promise<any> {
    const car = await this.prismaService.car.delete({
      where: {
        id,
      },
    });

    if (!car) {
      throw new NotFoundException(`Car with id ${id} not found`);
    }

    return `Delete a car by id: ${id} successfully.`;
  }

  async getNewestCar(): Promise<any> {
    const newestCar = await this.prismaService.car.findMany({
      where: {
        OR: [
          {
            status: CarStatus.AVAILABLE,
          },
          {
            status: CarStatus.RENTING,
          },
        ],
      },
      take: 8,
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        name: true,
        slug: true,
        transmission: true,
        fuel: true,
        pricePerDay: true,
        address: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        CarImage: {
          select: {
            url: true,
          },
        },
        OrderDetail: {
          select: {
            id: true,
            startDate: true,
            endDate: true,
            review: true,
            orderDetailStatus: true,
          },
          where: {
            OR: [
              {
                orderDetailStatus: 'CONFIRMED',
              },
              {
                orderDetailStatus: 'RECEIVED',
              },
            ],
          },
        },
      },
    });

    return newestCar.map((car) => ({
      ...car,
      pricePerDay: formatDecimalToNumber(car.pricePerDay),
      images: car.CarImage.map((image) => image.url),
      thumbnail: car.CarImage[0].url,
      trips: car.OrderDetail.length,
      rating:
        car.OrderDetail.length > 0
          ? car.OrderDetail.map((orderDetail) => {
              if (!orderDetail.review) {
                return 5;
              }
              return orderDetail.review.rating;
            }).reduce((a, b) => a + b, 0) / car.OrderDetail.length
          : 0,
      address: car.address.split(',')[0],
      orderDetails: car.OrderDetail.map((orderDetail) => ({
        startDate: orderDetail.startDate,
        endDate: orderDetail.endDate,
      })),
      OrderDetail: undefined,
      Review: undefined,
      CarImage: undefined,
    }));
  }

  async getCarBySlug(slug: string): Promise<any> {
    const car = await this.prismaService.car.findUnique({
      where: {
        slug,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        seats: true,
        transmission: true,
        fuel: true,
        description: true,
        pricePerDay: true,
        address: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        CarImage: {
          select: {
            url: true,
          },
        },
        CarFeature: {
          select: {
            feature: {
              select: {
                name: true,
              },
            },
          },
        },
        OrderDetail: {
          select: {
            id: true,
            review: {
              include: {
                customer: true,
              },
            },
          },
          where: {
            orderDetailStatus: 'COMPLETED',
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });

    if (!car) {
      throw new NotFoundException(`Car with slug ${slug} not found`);
    }

    return {
      ...car,
      pricePerDay: formatDecimalToNumber(car.pricePerDay),
      images: car.CarImage.map((image) => image.url),
      CarFeature: car.CarFeature.map((feature) => feature.feature.name),
      trips: car.OrderDetail.length,
      rating:
        car.OrderDetail.length > 0
          ? car.OrderDetail.map((orderDetail) => {
              if (!orderDetail.review) {
                return 5;
              }
              return orderDetail.review.rating;
            }).reduce((a, b) => a + b, 0) / car.OrderDetail.length
          : 0,
      owner: car.user,
      reviews: {
        meta: {
          totalReviews: car.OrderDetail.map((orderDetail) => {
            if (!orderDetail.review) {
              return 0;
            }
            return 1;
          }).reduce((a, b) => a + b, 0),
          average:
            car.OrderDetail.length > 0
              ? car.OrderDetail.map((orderDetail) => {
                  if (!orderDetail.review) {
                    return 5;
                  }
                  return orderDetail.review.rating;
                }).reduce((a, b) => a + b, 0) / car.OrderDetail.length
              : 0,
        },
        // data: car.OrderDetail.map((orderDetail) => ({
        //   ...orderDetail.review,
        // })),
        data: car.OrderDetail.map(
          (orderDetail) =>
            orderDetail.review && {
              ...orderDetail.review,
              createdAt: orderDetail.review.createdAt.toISOString(),
            },
        ),
      },
      CarImage: undefined,
      OrderDetail: undefined,
      user: undefined,
      Review: undefined,
    };
  }

  async searchCars(page: number, limit: number, startDate: string, endDate: string, filter: any): Promise<any> {
    // check filter
    const whereConditions: any = {
      status: CarStatus.AVAILABLE,
      OrderDetail: {
        none: {
          startDate: { lte: new Date(endDate) },
          endDate: { gte: new Date(startDate) },
        },
      },
    };

    // Check if brandId is provided in the filter
    if (filter.brandId) {
      whereConditions.model = {
        brand: {
          id: Number(filter.brandId),
        },
      };
    }

    // Check if modelId is provided in the filter
    if (filter.modelId) {
      whereConditions.modelId = Number(filter.modelId);
    }

    // Check if seats range is provided in the filter
    if (filter.seats && filter.seats.length === 2) {
      whereConditions.seats = {
        gte: Number(filter.seats[0]),
        lte: Number(filter.seats[1]),
      };
    }

    // Check if priceRange is provided in the filter
    if (filter.priceRange && filter.priceRange.length === 2) {
      whereConditions.pricePerDay = {
        gte: filter.priceRange[0] * 1000,
        lte: filter.priceRange[1] * 1000,
      };
    }

    const { _page, _limit } = getPagination(page, limit);

    // Calculate the total number of users
    const totalCars = await this.prismaService.car.count({
      where: {
        status: CarStatus.AVAILABLE,

        OrderDetail: {
          none: {
            startDate: { lte: new Date(endDate) },
            endDate: { gte: new Date(startDate) },
          },
        },
      },
    });
    const totalPages = Math.ceil(totalCars / _limit);
    const offset = (_page - 1) * _limit;

    const cars = await this.prismaService.car.findMany({
      skip: offset,
      take: _limit,
      where: {
        ...whereConditions,
      },
      orderBy: [{ createdAt: 'desc' }, { pricePerDay: filter.sortPrice }],

      select: {
        id: true,
        name: true,
        slug: true,
        transmission: true,
        pricePerDay: true,
        address: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        CarImage: {
          select: {
            url: true,
          },
        },
        fuel: true,
        OrderDetail: {
          select: {
            id: true,
            startDate: true,
            endDate: true,
            review: true,
          },
          where: {
            OR: [
              {
                orderDetailStatus: 'CONFIRMED',
              },
              {
                orderDetailStatus: 'RECEIVED',
              },
            ],
          },
        },
      },
    });

    return {
      data: cars.map((car) => ({
        ...car,
        pricePerDay: formatDecimalToNumber(car.pricePerDay),
        thumbnail: car.CarImage[0].url,
        trips: car.OrderDetail.length,
        rating:
          car.OrderDetail.length > 0
            ? car.OrderDetail.map((orderDetail) => {
                if (!orderDetail.review) {
                  return 5;
                }
                return orderDetail.review.rating;
              }).reduce((a, b) => a + b, 0) / car.OrderDetail.length
            : 0,
        address: car.address.split(',')[0],
        orderDetails: car.OrderDetail.map((orderDetail) => ({
          startDate: orderDetail.startDate,
          endDate: orderDetail.endDate,
        })),
        CarImage: undefined,
        OrderDetail: undefined,
        Review: undefined,
      })),
      meta: {
        totalPages,
        _page,
        _limit,
        totalCars,
      },
    };
  }

  async getAllCarByUserId(id: number): Promise<any> {
    const cars = await this.prismaService.car.findMany({
      where: {
        userId: id,
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        name: true,
        slug: true,
        licensePlates: true,
        seats: true,
        yearOfManufacture: true,
        transmission: true,
        fuel: true,
        description: true,
        pricePerDay: true,
        address: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        model: {
          select: {
            name: true,
            brand: {
              select: {
                name: true,
              },
            },
          },
        },
        CarImage: {
          select: {
            url: true,
          },
        },
        CarFeature: {
          select: {
            feature: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    return cars.map((car) => ({
      ...car,
      model: car.model.name,
      brand: car.model.brand.name,
      pricePerDay: formatDecimalToNumber(car.pricePerDay),
      CarImage: car.CarImage.map((image) => image.url),
      CarFeature: car.CarFeature.map((feature) => feature.feature.name),
    }));
  }

  async updateCarStatus(id: number, body: any): Promise<any> {
    const exitsCar = await this.prismaService.car.findFirst({
      where: {
        id,
      },
    });

    if (!exitsCar) {
      throw new NotFoundException(`Car with id ${id} not found`);
    }

    const car = await this.prismaService.car.update({
      where: {
        id,
      },
      data: {
        status: body.status,
      },
    });

    return car;
  }

  async getAllCarIsRenting(): Promise<any> {
    const cars = await this.prismaService.car.findMany({
      where: {
        status: CarStatus.RENTING,
      },
      include: {
        model: {
          include: {
            brand: true,
          },
        },
        CarImage: true,
        CarFeature: {
          include: {
            feature: true,
          },
        },
      },
    });

    return cars.map((car) => ({
      ...car,
      model: car.model.name,
      brand: car.model.brand.name,
      CarImage: car.CarImage.map((image) => image.url),
      CarFeature: car.CarFeature.map((feature) => feature.feature.name),
      pricePerDay: formatDecimalToNumber(car.pricePerDay),
    }));
  }

  async getAllCarByStatus(status: string): Promise<any> {
    const cars = await this.prismaService.car.findMany({
      where: {
        status: status.toUpperCase() as CarStatus,
      },
      include: {
        model: {
          include: {
            brand: true,
          },
        },
        CarImage: true,
        CarFeature: {
          include: {
            feature: true,
          },
        },
      },
    });

    return cars.map((car) => ({
      ...car,
      model: car.model.name,
      brand: car.model.brand.name,
      CarImage: car.CarImage.map((image) => image.url),
      CarFeature: car.CarFeature.map((feature) => feature.feature.name),
      pricePerDay: formatDecimalToNumber(car.pricePerDay),
    }));
  }
}
