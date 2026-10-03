import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { GetCurrentUser, Public, Roles } from 'src/auth/decorators';
import { RolesGuard } from 'src/auth/guards';
import { CreateCarDto, UpdateCarDto, UpdateCarStatusDto } from 'src/cars/dto';

import { CarsService } from './cars.service';

// Query dạng mảng có thể tới dưới dạng "a" hoặc ["a", "b"] tuỳ client
const toArray = (value: unknown): string[] | undefined =>
  value === undefined ? undefined : Array.isArray(value) ? value : String(value).split(',');

@ApiBearerAuth()
@ApiTags('cars')
@Controller('cars')
export class CarsController {
  constructor(private readonly carsService: CarsService) {}

  @ApiOperation({ summary: 'Create a new car' })
  @ApiBody({ type: CreateCarDto })
  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN, RoleName.CAROWNER)
  @Post()
  createCar(@GetCurrentUser() currentUser: any, @Body() createCarDto: CreateCarDto): Promise<any> {
    return this.carsService.createCar(createCarDto, currentUser);
  }

  @ApiOperation({ summary: 'Get all cars (admin)' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'q', required: false, description: 'Tìm theo tên xe, biển số' })
  @ApiQuery({ name: 'status', required: false, description: 'AVAILABLE,RENTING,UNAVAILABLE' })
  @ApiQuery({ name: 'fuel', required: false, description: 'GASOLINE,DIESEL,ELECTRIC' })
  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN)
  @Get()
  findAllCar(
    @Query('page') page: number,
    @Query('limit') limit: number,
    @Query('q') q?: string,
    @Query('status') status?: string,
    @Query('fuel') fuel?: string,
  ): Promise<any> {
    return this.carsService.findAllCar(page, limit, { q, status, fuel });
  }

  @ApiOperation({ summary: 'Danh sách slug cho sitemap' })
  @Public()
  @Get('/sitemap/cars')
  getSitemapCars(): Promise<any> {
    return this.carsService.getSitemapCars();
  }

  @Public()
  @Get('/newest/cars')
  getNewestCar(): Promise<any> {
    return this.carsService.getNewestCar();
  }

  @Public()
  @Get('/slug/:slug')
  getCarBySlug(@Param('slug') slug: string): Promise<any> {
    return this.carsService.getCarBySlug(slug);
  }

  @ApiQuery({ name: 'startDate', required: false, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'endDate', required: false, description: 'YYYY-MM-DD' })
  @Public()
  @Get('/search/cars')
  searchCars(
    @Query('page') page: number,
    @Query('limit') limit: number,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('sortPrice') sortPrice: string,
    @Query('priceRange') priceRange: string | string[],
    @Query('seats') seats: string | string[],
    @Query('years') years: string | string[],
    @Query('fuel') fuel: string,
    @Query('transmission') transmission: string,
    @Query('brandId') brandId: number,
    @Query('modelId') modelId: number,
  ): Promise<any> {
    return this.carsService.searchCars(page || 1, limit || 12, startDate, endDate, {
      sortPrice,
      priceRange: toArray(priceRange),
      seats: toArray(seats),
      years: toArray(years),
      fuel,
      transmission,
      brandId,
      modelId,
    });
  }

  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN, RoleName.CAROWNER)
  @Get('/user/my-cars')
  getAllCarByUserId(@GetCurrentUser() currentUser: any): Promise<any> {
    return this.carsService.getAllCarByUserId(currentUser.id);
  }

  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN)
  @Patch('/status/:id')
  updateCarStatus(@Param('id', ParseIntPipe) id: number, @Body() body: UpdateCarStatusDto): Promise<any> {
    return this.carsService.updateCarStatus(id, body.status);
  }

  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN)
  @Get('/status/renting')
  getAllCarIsRenting(): Promise<any> {
    return this.carsService.getAllCarIsRenting();
  }

  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN)
  @Get('/status/get-all')
  getAllCarByStatus(@Query('status') status: string): Promise<any> {
    return this.carsService.getAllCarByStatus(status);
  }

  // Trả về đầy đủ thông tin (biển số...) để chỉnh sửa nên chỉ chủ xe hoặc admin được xem
  @ApiOperation({ summary: 'Get a car by id (owner/admin)' })
  @ApiParam({ name: 'id', required: true, type: Number, example: 1 })
  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN, RoleName.CAROWNER)
  @Get(':id')
  findOneById(@Param('id', ParseIntPipe) id: number, @GetCurrentUser() currentUser: any): Promise<any> {
    return this.carsService.findOneById(id, currentUser);
  }

  @ApiOperation({ summary: 'Update a car by id' })
  @ApiParam({ name: 'id', required: true, type: Number, example: 1 })
  @ApiBody({ type: UpdateCarDto })
  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN, RoleName.CAROWNER)
  @Patch(':id')
  updateCarById(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCarDto: UpdateCarDto,
    @GetCurrentUser() currentUser: any,
  ): Promise<any> {
    return this.carsService.updateCarById(id, updateCarDto, currentUser);
  }

  @ApiOperation({ summary: 'Delete a car by id' })
  @ApiParam({ name: 'id', required: true, type: Number, example: 1 })
  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN, RoleName.CAROWNER)
  @Delete(':id')
  removeById(@Param('id', ParseIntPipe) id: number, @GetCurrentUser() currentUser: any): Promise<any> {
    return this.carsService.removeById(id, currentUser);
  }
}
