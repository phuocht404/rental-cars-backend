import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiExtraModels,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { GetCurrentUser, Public, Roles } from 'src/auth/decorators';
import { RolesGuard } from 'src/auth/guards';

import { CreateReviewDto, ReviewDto, UpdateReviewDto } from './dto';
import { ReviewsService } from './reviews.service';

@ApiBearerAuth()
@ApiTags('Reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @ApiOperation({ summary: 'Create a new review' })
  @ApiExtraModels(ReviewDto)
  @ApiResponse({
    status: 201,
    description: 'The review has been successfully created.',
    type: ReviewDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 500, description: 'Internal server error.' })
  @ApiBody({ type: CreateReviewDto })
  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN, RoleName.CAROWNER, RoleName.TRAVELER)
  @Post()
  createReview(@GetCurrentUser() currentUser: any, @Body() createReviewDto: CreateReviewDto): Promise<any> {
    return this.reviewsService.createReview(currentUser, createReviewDto);
  }

  @ApiOperation({ summary: 'Get all reviews' })
  @ApiExtraModels(ReviewDto)
  @ApiResponse({
    status: 200,
    description: 'All reviews have been successfully retrieved.',
    type: ReviewDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 500, description: 'Internal server error.' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN)
  @Get()
  findAllReview(@Query('page') page: number, @Query('limit') limit: number): Promise<any> {
    return this.reviewsService.findAllReview(page, limit);
  }

  @ApiOperation({ summary: 'Get a review by id' })
  @ApiExtraModels(ReviewDto)
  @ApiResponse({
    status: 200,
    description: 'The review has been successfully retrieved.',
    type: ReviewDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Review not found.' })
  @ApiResponse({ status: 500, description: 'Internal server error.' })
  @ApiParam({ name: 'id', required: true, type: Number })
  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN, RoleName.CAROWNER, RoleName.TRAVELER)
  @Get(':id')
  findOneById(@Param('id') id: number): Promise<any> {
    return this.reviewsService.findOneById(+id);
  }

  @ApiOperation({ summary: 'Get all reviews by car id' })
  @ApiExtraModels(ReviewDto)
  @ApiResponse({
    status: 200,
    description: 'All reviews have been successfully retrieved.',
    type: ReviewDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Review not found.' })
  @ApiResponse({ status: 500, description: 'Internal server error.' })
  @ApiParam({ name: 'id', required: true, type: Number })
  @Public()
  @Get('car/:id')
  findAllByCarId(@Param('id', ParseIntPipe) id: number): Promise<any> {
    return this.reviewsService.findAllByCarId(id);
  }

  @ApiOperation({ summary: 'Update a review by id' })
  @ApiExtraModels(ReviewDto)
  @ApiResponse({
    status: 200,
    description: 'The review has been successfully updated.',
    type: ReviewDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Review not found.' })
  @ApiResponse({ status: 500, description: 'Internal server error.' })
  @ApiParam({ name: 'id', required: true, type: Number })
  @ApiBody({ type: UpdateReviewDto })
  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN, RoleName.CAROWNER, RoleName.TRAVELER)
  @Patch(':id')
  updateById(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateReviewDto: UpdateReviewDto,
    @GetCurrentUser() currentUser: any,
  ): Promise<any> {
    return this.reviewsService.updateById(id, updateReviewDto, currentUser);
  }

  @ApiOperation({ summary: 'Delete a review by id' })
  @ApiExtraModels(ReviewDto)
  @ApiResponse({
    status: 200,
    description: 'The review has been successfully deleted.',
    type: ReviewDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Review not found.' })
  @ApiResponse({ status: 500, description: 'Internal server error.' })
  @ApiParam({ name: 'id', required: true, type: Number })
  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN)
  @Delete(':id')
  removeById(@Param('id') id: number): Promise<any> {
    return this.reviewsService.removeById(+id);
  }
}
