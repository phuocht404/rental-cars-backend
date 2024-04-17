import {
  Body,
  Controller,
  Delete,
  Get,
  InternalServerErrorException,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiExtraModels,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { GetCurrentUser, Public, Roles } from 'src/auth/decorators';
import { RolesGuard } from 'src/auth/guards';
import { CarDto, CreateCarDto, UpdateCarDto } from 'src/cars/dto';

import { CarsService } from './cars.service';

@ApiBearerAuth()
@ApiTags('cars')
@Controller('cars')
export class CarsController {
  constructor(private readonly carsService: CarsService) {}

  @ApiOperation({ summary: 'Create a new car' })
  @ApiExtraModels(CarDto)
  @ApiResponse({
    status: 201,
    description: 'Car created successfully.',
    content: {
      'application/json': {
        schema: { $ref: getSchemaPath(CarDto) },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 500, description: 'Internal server error.' })
  @ApiBody({ type: CreateCarDto })
  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN, RoleName.CAROWNER)
  @Post()
  createCar(@GetCurrentUser() currentUser: any, @Body() createCarDto: any): Promise<any> {
    try {
      return this.carsService.createCar(createCarDto, currentUser);
    } catch (e) {
      throw new Error(e);
    }
  }

  @ApiOperation({ summary: 'Get all cars' })
  @ApiExtraModels(CarDto)
  @ApiResponse({
    status: 200,
    description: 'Get all cars successfully.',
    content: {
      'application/json': {
        schema: { $ref: getSchemaPath(CarDto) },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 500, description: 'Internal server error.' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 1 })
  @UseGuards(RolesGuard)
  @Public()
  @Get()
  findAllCar(@Query('page') page: number, @Query('limit') limit: number): Promise<any> {
    try {
      return this.carsService.findAllCar(page, limit);
    } catch (e) {
      throw new Error(e);
    }
  }

  @ApiOperation({ summary: 'Get a car by id' })
  @ApiExtraModels(CarDto)
  @ApiResponse({
    status: 200,
    description: 'Get a car by id successfully.',
    content: {
      'application/json': {
        schema: { $ref: getSchemaPath(CarDto) },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Car not found.' })
  @ApiResponse({ status: 500, description: 'Internal server error.' })
  @ApiParam({ name: 'id', required: true, type: Number, example: 1 })
  @Public()
  @Get(':id')
  findOneById(@Param('id') id: number): Promise<any> {
    try {
      return this.carsService.findOneById(+id);
    } catch (e) {
      throw new Error(e);
    }
  }

  @ApiOperation({ summary: 'Update a car by id' })
  @ApiExtraModels(CarDto)
  @ApiResponse({
    status: 200,
    description: 'Update a car by id successfully.',
    content: {
      'application/json': {
        schema: { $ref: getSchemaPath(CarDto) },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Car not found.' })
  @ApiResponse({ status: 500, description: 'Internal server error.' })
  @ApiParam({ name: 'id', required: true, type: Number, example: 1 })
  @ApiBody({ type: UpdateCarDto })
  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN, RoleName.CAROWNER)
  @Patch(':id')
  updateCarById(@Param('id') id: number, @Body() updateCarDto: UpdateCarDto): Promise<any> {
    try {
      return this.carsService.updateCarById(+id, updateCarDto);
    } catch (e) {
      throw new Error(e);
    }
  }

  @ApiOperation({ summary: 'Delete a car by id' })
  @ApiExtraModels(CarDto)
  @ApiResponse({
    status: 200,
    description: 'Delete a car by id successfully.',
  })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Car not found.' })
  @ApiResponse({ status: 500, description: 'Internal server error.' })
  @ApiParam({ name: 'id', required: true, type: Number, example: 1 })
  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN, RoleName.CAROWNER)
  @Delete(':id')
  removeById(@Param('id') id: number): Promise<any> {
    try {
      return this.carsService.removeById(+id);
    } catch (e) {
      throw new Error(e);
    }
  }

  @Public()
  @Get('/newest/cars')
  getNewestCar(): Promise<any> {
    try {
      return this.carsService.getNewestCar();
    } catch (e) {
      throw new InternalServerErrorException(e);
    }
  }

  @Public()
  @Get('/slug/:slug')
  getCarBySlug(@Param('slug') slug: string): Promise<any> {
    try {
      return this.carsService.getCarBySlug(slug);
    } catch (e) {
      throw new InternalServerErrorException(e);
    }
  }

  @Public()
  @Get('/search/cars')
  searchCars(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 12,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('sortPrice') sortPrice: string,
    @Query('priceRange') priceRange: number[],
    @Query('seats') seats: number[],
    @Query('brandId') brandId: number,
    @Query('modelId') modelId: number,
  ): Promise<any> {
    try {
      const filter = {
        sortPrice,
        priceRange,
        seats,
        brandId,
        modelId,
      };

      return this.carsService.searchCars(page, limit, startDate, endDate, filter);
    } catch (e) {
      throw new InternalServerErrorException(e);
    }
  }

  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN, RoleName.CAROWNER)
  @Get('/user/my-cars')
  getAllCarByUserId(@GetCurrentUser() currentUser: any): Promise<any> {
    try {
      const userId = currentUser.id;

      return this.carsService.getAllCarByUserId(+userId);
    } catch (e) {
      throw new InternalServerErrorException(e);
    }
  }

  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN, RoleName.CAROWNER)
  @Patch('/status/:id')
  updateCarStatus(@Param('id') id: number, @Body() body: any): Promise<any> {
    try {
      return this.carsService.updateCarStatus(+id, body);
    } catch (e) {
      throw new InternalServerErrorException(e);
    }
  }

  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN)
  @Get('/status/renting')
  getAllCarIsRenting(): Promise<any> {
    try {
      return this.carsService.getAllCarIsRenting();
    } catch (e) {
      throw new InternalServerErrorException(e);
    }
  }

  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN)
  @Get('/status/get-all')
  getAllCarByStatus(@Query('status') status: string): Promise<any> {
    try {
      return this.carsService.getAllCarByStatus(status);
    } catch (e) {
      throw new InternalServerErrorException(e);
    }
  }
}
