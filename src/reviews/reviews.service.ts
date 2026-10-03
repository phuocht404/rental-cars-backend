import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderDetailStatus, RoleName } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { getPagination } from 'utils/utils';

import { CreateReviewDto, UpdateReviewDto } from './dto';

@Injectable()
export class ReviewsService {
  constructor(private readonly prismaService: PrismaService) {}

  async createReview(currentUser: any, createReviewDto: CreateReviewDto): Promise<any> {
    const orderDetail = await this.prismaService.orderDetail.findUnique({
      where: { id: createReviewDto.orderDetailId },
      select: { orderDetailStatus: true, order: { select: { travelerId: true } }, review: { select: { id: true } } },
    });

    if (!orderDetail) throw new NotFoundException('Không tìm thấy chuyến đi');

    // Chỉ người đã thuê và đã hoàn thành chuyến mới được đánh giá, mỗi chuyến một lần
    if (orderDetail.order?.travelerId !== currentUser.id) {
      throw new ForbiddenException('Bạn chỉ được đánh giá chuyến đi của chính mình');
    }
    if (orderDetail.orderDetailStatus !== OrderDetailStatus.COMPLETED) {
      throw new BadRequestException('Chỉ đánh giá được chuyến đi đã hoàn thành');
    }
    if (orderDetail.review) throw new ConflictException('Chuyến đi này đã được đánh giá');

    return this.prismaService.review.create({
      data: {
        content: createReviewDto.content,
        rating: createReviewDto.rating,
        orderDetailId: createReviewDto.orderDetailId,
        customerId: currentUser.id,
      },
    });
  }

  async findAllReview(page: number, limit: number): Promise<any> {
    const { _page, _limit } = getPagination(page, limit);

    // Calculate the total number of users
    const totalReviews = await this.prismaService.review.count();
    const totalPages = Math.ceil(totalReviews / _limit);

    // Calculate the number of items to skip
    const offset = (_page - 1) * _limit;

    const reviews = await this.prismaService.review.findMany({
      skip: offset,
      take: _limit,
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      data: reviews,
      meta: {
        total: totalReviews,
        page: _page,
        per_page: _limit,
        last_page: totalPages,
      },
    };
  }

  async findOneById(id: number): Promise<any> {
    const review = await this.prismaService.review.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        content: true,
        rating: true,
        orderDetailId: true,
        customer: {
          select: {
            avatarUrl: true,
            name: true,
          },
        },
        customerId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!review) {
      throw new NotFoundException(`Review with id ${id} not found`);
    }

    return review;
  }

  async findAllByCarId(carId: number): Promise<any> {
    const reviews = await this.prismaService.review.findMany({
      where: {
        orderDetail: { carId },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        content: true,
        rating: true,
        orderDetailId: true,
        customer: {
          select: {
            avatarUrl: true,
            name: true,
          },
        },
        customerId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return reviews;
  }

  async updateById(id: number, updateReviewDto: UpdateReviewDto, currentUser: any): Promise<any> {
    const existing = await this.prismaService.review.findUnique({ where: { id }, select: { customerId: true } });

    if (!existing) throw new NotFoundException(`Review with id ${id} not found`);

    if (currentUser.role !== RoleName.ADMIN && existing.customerId !== currentUser.id) {
      throw new ForbiddenException('Bạn chỉ được sửa đánh giá của chính mình');
    }

    const review = await this.prismaService.review.update({
      where: {
        id,
      },
      data: {
        content: updateReviewDto.content,
        rating: updateReviewDto.rating,
      },
      select: {
        id: true,
        content: true,
        rating: true,
        // carId: true,
        customer: {
          select: {
            avatarUrl: true,
            name: true,
          },
        },
        customerId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return review;
  }

  async removeById(id: number): Promise<any> {
    const exitsReview = await this.prismaService.review.findUnique({
      where: {
        id,
      },
    });

    if (!exitsReview) {
      throw new NotFoundException(`Review with id ${id} not found`);
    }

    await this.prismaService.review.delete({
      where: {
        id,
      },
    });

    return `This action removes a #${id} review`;
  }
}
