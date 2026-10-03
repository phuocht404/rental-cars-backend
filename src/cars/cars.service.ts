import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CarStatus, Fuel, OrderDetailStatus, Prisma, RoleName, Transmission } from '@prisma/client';
import { BLOCKING_ORDER_DETAIL_STATUSES } from 'src/orders/order-pricing';
import { PrismaService } from 'src/prisma/prisma.service';
import { formatDecimalToNumber, generateSlug, getPagination, normalizeSearch, parseEnumList } from 'utils/utils';

import { CreateCarDto, UpdateCarDto } from './dto';

// Các xe hiển thị công khai (đã được duyệt)
const PUBLIC_CAR_STATUSES: CarStatus[] = [CarStatus.AVAILABLE, CarStatus.RENTING];

// Chỉ lấy các chuyến đang chiếm lịch để tính ngày bận
const blockingOrderDetailSelect = {
  select: { id: true, startDate: true, endDate: true },
  where: { orderDetailStatus: { in: BLOCKING_ORDER_DETAIL_STATUSES } },
} satisfies Prisma.Car$OrderDetailArgs;

// Chuyến đang chiếm lịch + chuyến đã hoàn thành (kèm đánh giá) để vừa tính điểm vừa hiển thị lịch bận trên thẻ xe
const cardTripsSelect = {
  select: { id: true, startDate: true, endDate: true, orderDetailStatus: true, review: { select: { rating: true } } },
  where: { orderDetailStatus: { in: [...BLOCKING_ORDER_DETAIL_STATUSES, OrderDetailStatus.COMPLETED] } },
} satisfies Prisma.Car$OrderDetailArgs;

type CardTrip = {
  startDate: Date;
  endDate: Date;
  orderDetailStatus: OrderDetailStatus;
  review: { rating: number } | null;
};

const toCardFields = (orderDetails: CardTrip[]) => {
  const completed = orderDetails.filter((trip) => trip.orderDetailStatus === OrderDetailStatus.COMPLETED);
  const upcoming = orderDetails.filter((trip) => trip.orderDetailStatus !== OrderDetailStatus.COMPLETED);

  return {
    ...summarizeTrips(completed),
    orderDetails: upcoming.map(({ startDate, endDate, orderDetailStatus }) => ({
      startDate,
      endDate,
      orderDetailStatus,
    })),
  };
};

const summarizeTrips = (trips: { review: { rating: number } | null }[]) => {
  const ratings = trips.filter((trip) => trip.review).map((trip) => trip.review!.rating);
  const rating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;

  return { trips: trips.length, rating: Math.round(rating * 10) / 10, totalReviews: ratings.length };
};

const toDateRanges = (orderDetails: { startDate: Date; endDate: Date }[]) =>
  orderDetails.map(({ startDate, endDate }) => ({ startDate, endDate }));

const shortAddress = (address: string) => address.split(',')[0];

const parseIsoDate = (value?: string) => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

@Injectable()
export class CarsService {
  constructor(private readonly prismaService: PrismaService) {}

  async createCar(createCarDto: CreateCarDto, currentUser: any): Promise<any> {
    const model = await this.prismaService.carModel.findUnique({
      where: { id: createCarDto.modelId },
    });
    if (!model) throw new BadRequestException('Mẫu xe không tồn tại');

    const name = `${model.name} ${createCarDto.yearOfManufacture}`;

    // Tạo xe, ảnh và tính năng trong một transaction để không bị xe "mồ côi" khi một bước lỗi.
    // Biển số trùng sẽ bị unique constraint chặn (P2002 → 409).
    return this.prismaService.car.create({
      data: {
        name,
        slug: generateSlug(name),
        licensePlates: createCarDto.licensePlates,
        seats: createCarDto.seats,
        yearOfManufacture: createCarDto.yearOfManufacture,
        transmission: createCarDto.transmission,
        fuel: createCarDto.fuel,
        description: createCarDto.description,
        pricePerDay: createCarDto.pricePerDay,
        address: createCarDto.address || 'Đà Nẵng',
        status: CarStatus.UNAVAILABLE,
        modelId: createCarDto.modelId,
        carColorId: createCarDto.carColorId,
        userId: currentUser.id,
        CarImage: {
          create: createCarDto.images.map((url) => ({ url })),
        },
        CarFeature: {
          create: [...new Set(createCarDto.features ?? [])].map((featureId) => ({ featureId })),
        },
      },
    });
  }

  async findAllCar(page: number, limit: number, filter: { q?: string; status?: string; fuel?: string } = {}) {
    const { _page, _limit } = getPagination(page, limit);
    const q = normalizeSearch(filter.q);
    const statuses = parseEnumList(filter.status, CarStatus);
    const fuels = parseEnumList(filter.fuel, Fuel);

    const where: Prisma.CarWhereInput = {
      status: { in: statuses ?? Object.values(CarStatus) },
      ...(fuels && { fuel: { in: fuels } }),
      ...(q && { OR: [{ name: { contains: q } }, { licensePlates: { contains: q.toUpperCase() } }] }),
    };

    const [totalCars, cars] = await this.prismaService.$transaction([
      this.prismaService.car.count({ where }),
      this.prismaService.car.findMany({
        skip: (_page - 1) * _limit,
        take: _limit,
        orderBy: {
          createdAt: 'desc',
        },
        where,
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
          model: { select: { name: true, brand: { select: { name: true } } } },
          CarImage: { select: { url: true } },
          CarFeature: { select: { feature: { select: { name: true } } } },
          OrderDetail: blockingOrderDetailSelect,
        },
      }),
    ]);

    return {
      data: cars.map((car) => ({
        ...car,
        model: car.model?.name,
        brand: car.model?.brand?.name,
        CarImage: car.CarImage.map((image) => image.url),
        CarFeature: car.CarFeature.map((feature) => feature.feature.name),
        pricePerDay: formatDecimalToNumber(car.pricePerDay),
        orderDetails: toDateRanges(car.OrderDetail),
        OrderDetail: undefined,
      })),
      meta: {
        totalPages: Math.ceil(totalCars / _limit),
        _page,
        _limit,
        totalCars,
      },
    };
  }

  async findOneById(id: number, currentUser: any): Promise<any> {
    const car = await this.prismaService.car.findUnique({
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
        userId: true,
        createdAt: true,
        updatedAt: true,
        model: { select: { id: true, name: true, brand: { select: { id: true, name: true } } } },
        CarImage: { select: { url: true } },
        CarFeature: { select: { feature: { select: { id: true } } } },
      },
    });

    if (!car) {
      throw new NotFoundException(`Car with id ${id} not found`);
    }

    this.assertCanManage(car, currentUser);

    return {
      ...car,
      model: car.model?.name,
      brand: car.model?.brand?.name,
      CarImage: car.CarImage.map((image) => image.url),
      CarFeature: car.CarFeature.map((feature) => feature.feature.id),
      pricePerDay: formatDecimalToNumber(car.pricePerDay),
      brandId: car.model?.brand?.id,
      modelId: car.model?.id,
    };
  }

  async updateCarById(id: number, updateCarDto: UpdateCarDto, currentUser: any): Promise<any> {
    const existingCar = await this.prismaService.car.findUnique({
      where: { id },
      select: { id: true, userId: true, name: true, slug: true, yearOfManufacture: true, modelId: true },
    });

    if (!existingCar) {
      throw new NotFoundException(`Car with id ${id} not found`);
    }

    this.assertCanManage(existingCar, currentUser);

    // Tên xe được suy ra từ mẫu xe + năm sản xuất; chỉ đổi slug khi tên thực sự thay đổi
    let name = existingCar.name;
    const modelId = updateCarDto.modelId ?? existingCar.modelId;
    const year = updateCarDto.yearOfManufacture ?? existingCar.yearOfManufacture;

    if (modelId !== existingCar.modelId || year !== existingCar.yearOfManufacture) {
      const model = await this.prismaService.carModel.findUnique({ where: { id: modelId } });
      if (!model) throw new BadRequestException('Mẫu xe không tồn tại');
      name = `${model.name} ${year}`;
    }

    const slug = name !== existingCar.name ? generateSlug(name) : existingCar.slug;

    const car = await this.prismaService.$transaction(async (tx) => {
      if (updateCarDto.features) {
        await tx.carFeature.deleteMany({ where: { carId: id } });
        await tx.carFeature.createMany({
          data: [...new Set(updateCarDto.features)].map((featureId) => ({ carId: id, featureId })),
        });
      }

      if (updateCarDto.images?.length) {
        await tx.carImage.deleteMany({ where: { carId: id } });
        await tx.carImage.createMany({ data: updateCarDto.images.map((url) => ({ carId: id, url })) });
      }

      return tx.car.update({
        where: { id },
        data: {
          name,
          slug,
          licensePlates: updateCarDto.licensePlates,
          seats: updateCarDto.seats,
          yearOfManufacture: updateCarDto.yearOfManufacture,
          transmission: updateCarDto.transmission,
          fuel: updateCarDto.fuel,
          description: updateCarDto.description,
          pricePerDay: updateCarDto.pricePerDay,
          address: updateCarDto.address,
          modelId: updateCarDto.modelId,
          carColorId: updateCarDto.carColorId,
          // Chủ xe sửa thông tin thì xe phải được admin duyệt lại
          status: currentUser.role === RoleName.ADMIN ? undefined : CarStatus.UNAVAILABLE,
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
          model: { select: { name: true, brand: { select: { name: true } } } },
          CarImage: { select: { url: true } },
          CarFeature: { select: { feature: { select: { name: true } } } },
        },
      });
    });

    return {
      ...car,
      pricePerDay: formatDecimalToNumber(car.pricePerDay),
      model: car.model?.name,
      brand: car.model?.brand?.name,
      CarImage: car.CarImage.map((image) => image.url),
      CarFeature: car.CarFeature.map((feature) => feature.feature.name),
    };
  }

  private assertCanManage(car: { userId: number | null }, currentUser: any) {
    if (currentUser?.role !== RoleName.ADMIN && car.userId !== currentUser?.id) {
      throw new ForbiddenException('Bạn không có quyền thao tác trên xe này');
    }
  }

  async removeById(id: number, currentUser: any): Promise<any> {
    const car = await this.prismaService.car.findUnique({
      where: {
        id,
      },
      select: { id: true, userId: true, _count: { select: { OrderDetail: true } } },
    });

    if (!car) {
      throw new NotFoundException(`Car with id ${id} not found`);
    }

    this.assertCanManage(car, currentUser);

    // Xe đã có lịch sử thuê thì chỉ ẩn đi để giữ dữ liệu đơn hàng/doanh thu
    if (car._count.OrderDetail > 0) {
      await this.prismaService.car.update({ where: { id }, data: { status: CarStatus.UNAVAILABLE } });

      return `Car ${id} has rental history, so it was hidden instead of deleted.`;
    }

    await this.prismaService.car.delete({
      where: {
        id,
      },
    });

    return `Delete a car by id: ${id} successfully.`;
  }

  async getNewestCar(): Promise<any> {
    const newestCar = await this.prismaService.car.findMany({
      where: { status: { in: PUBLIC_CAR_STATUSES } },
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
        seats: true,
        pricePerDay: true,
        address: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        CarImage: { select: { url: true }, take: 1 },
        OrderDetail: cardTripsSelect,
      },
    });

    return newestCar.map(({ CarImage, OrderDetail, ...car }) => ({
      ...car,
      ...toCardFields(OrderDetail),
      pricePerDay: formatDecimalToNumber(car.pricePerDay),
      thumbnail: CarImage[0]?.url,
      address: shortAddress(car.address),
    }));
  }

  async getSitemapCars(): Promise<any> {
    return this.prismaService.car.findMany({
      where: { status: { in: PUBLIC_CAR_STATUSES } },
      select: { slug: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
      take: 5000,
    });
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
        yearOfManufacture: true,
        transmission: true,
        fuel: true,
        description: true,
        pricePerDay: true,
        address: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        model: { select: { name: true, brand: { select: { name: true } } } },
        CarImage: { select: { url: true } },
        CarFeature: { select: { feature: { select: { name: true } } } },
        OrderDetail: {
          select: {
            id: true,
            review: {
              select: {
                id: true,
                content: true,
                rating: true,
                createdAt: true,
                // Chỉ lấy thông tin công khai, tuyệt đối không trả về mật khẩu/email/số điện thoại
                customer: { select: { id: true, name: true, avatarUrl: true } },
              },
            },
          },
          where: {
            orderDetailStatus: OrderDetailStatus.COMPLETED,
          },
          orderBy: { createdAt: 'desc' },
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

    const { trips, rating, totalReviews } = summarizeTrips(car.OrderDetail);
    const reviews = car.OrderDetail.filter((orderDetail) => orderDetail.review).map((orderDetail) => ({
      ...orderDetail.review,
      createdAt: orderDetail.review.createdAt.toISOString(),
    }));

    return {
      ...car,
      model: car.model?.name,
      brand: car.model?.brand?.name,
      pricePerDay: formatDecimalToNumber(car.pricePerDay),
      images: car.CarImage.map((image) => image.url),
      CarFeature: car.CarFeature.map((feature) => feature.feature.name),
      trips,
      rating,
      owner: car.user,
      reviews: {
        meta: {
          totalReviews,
          average: rating,
        },
        data: reviews,
      },
      CarImage: undefined,
      OrderDetail: undefined,
      user: undefined,
    };
  }

  async searchCars(page: number, limit: number, startDate: string, endDate: string, filter: any): Promise<any> {
    const start = parseIsoDate(startDate);
    const end = parseIsoDate(endDate);

    if ((startDate && !start) || (endDate && !end)) {
      throw new BadRequestException('Ngày tìm kiếm phải có dạng YYYY-MM-DD');
    }
    if (start && end && end < start) {
      throw new BadRequestException('Ngày kết thúc phải sau ngày bắt đầu');
    }

    const whereConditions: Prisma.CarWhereInput = {
      status: CarStatus.AVAILABLE,
    };

    // Chỉ loại các xe có chuyến đã xác nhận/đang thuê trùng lịch (đơn huỷ hoặc chờ không chiếm lịch)
    if (start && end) {
      whereConditions.OrderDetail = {
        none: {
          orderDetailStatus: { in: BLOCKING_ORDER_DETAIL_STATUSES },
          startDate: { lte: end },
          endDate: { gte: start },
        },
      };
    }

    if (filter.brandId) {
      whereConditions.model = { brandId: Number(filter.brandId) };
    }

    if (filter.modelId) {
      whereConditions.modelId = Number(filter.modelId);
    }

    if (filter.seats?.length === 2) {
      whereConditions.seats = {
        gte: Number(filter.seats[0]),
        lte: Number(filter.seats[1]),
      };
    }

    const fuels = parseEnumList(filter.fuel, Fuel);
    if (fuels) whereConditions.fuel = { in: fuels };

    const transmissions = parseEnumList(filter.transmission, Transmission);
    if (transmissions) whereConditions.transmission = { in: transmissions };

    if (filter.years?.length === 2) {
      whereConditions.yearOfManufacture = {
        gte: Number(filter.years[0]),
        lte: Number(filter.years[1]),
      };
    }

    if (filter.priceRange?.length === 2) {
      // Giá trên bộ lọc tính theo nghìn đồng
      whereConditions.pricePerDay = {
        gte: Number(filter.priceRange[0]) * 1000,
        lte: Number(filter.priceRange[1]) * 1000,
      };
    }

    const { _page, _limit } = getPagination(page, limit);

    const [totalCars, cars] = await this.prismaService.$transaction([
      this.prismaService.car.count({ where: whereConditions }),
      this.prismaService.car.findMany({
        skip: (_page - 1) * _limit,
        take: _limit,
        where: whereConditions,
        orderBy:
          filter.sortPrice === 'asc' || filter.sortPrice === 'desc'
            ? [{ pricePerDay: filter.sortPrice }, { createdAt: 'desc' }]
            : [{ createdAt: 'desc' }],
        select: {
          id: true,
          name: true,
          slug: true,
          transmission: true,
          fuel: true,
          seats: true,
          pricePerDay: true,
          address: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          CarImage: { select: { url: true }, take: 1 },
          OrderDetail: cardTripsSelect,
        },
      }),
    ]);

    return {
      data: cars.map(({ CarImage, OrderDetail, ...car }) => ({
        ...car,
        ...toCardFields(OrderDetail),
        pricePerDay: formatDecimalToNumber(car.pricePerDay),
        thumbnail: CarImage[0]?.url,
        address: shortAddress(car.address),
      })),
      meta: {
        totalPages: Math.ceil(totalCars / _limit),
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
        model: { select: { name: true, brand: { select: { name: true } } } },
        CarImage: { select: { url: true } },
        CarFeature: { select: { feature: { select: { name: true } } } },
      },
    });

    return cars.map((car) => ({
      ...car,
      model: car.model?.name,
      brand: car.model?.brand?.name,
      pricePerDay: formatDecimalToNumber(car.pricePerDay),
      CarImage: car.CarImage.map((image) => image.url),
      CarFeature: car.CarFeature.map((feature) => feature.feature.name),
    }));
  }

  async updateCarStatus(id: number, status: CarStatus): Promise<any> {
    // P2025 (không tồn tại) được filter đổi thành 404
    return this.prismaService.car.update({
      where: {
        id,
      },
      data: {
        status,
      },
    });
  }

  private async findCarsWithDetails(where: Prisma.CarWhereInput, orderBy?: Prisma.CarOrderByWithRelationInput) {
    const cars = await this.prismaService.car.findMany({
      where,
      orderBy,
      include: {
        model: { include: { brand: true } },
        CarImage: true,
        CarFeature: { include: { feature: true } },
      },
    });

    return cars.map((car) => ({
      ...car,
      model: car.model?.name,
      brand: car.model?.brand?.name,
      CarImage: car.CarImage.map((image) => image.url),
      CarFeature: car.CarFeature.map((feature) => feature.feature.name),
      pricePerDay: formatDecimalToNumber(car.pricePerDay),
    }));
  }

  async getAllCarIsRenting(): Promise<any> {
    return this.findCarsWithDetails({ status: CarStatus.RENTING });
  }

  async getAllCarByStatus(status: string): Promise<any> {
    const carStatus = status?.toUpperCase() as CarStatus;

    if (!Object.values(CarStatus).includes(carStatus)) {
      throw new BadRequestException('Trạng thái xe không hợp lệ');
    }

    return this.findCarsWithDetails({ status: carStatus }, { updatedAt: 'desc' });
  }
}
