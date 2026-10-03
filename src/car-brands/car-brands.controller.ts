import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
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
import { MetaSchema } from 'schemas';
import { Public, Roles } from 'src/auth/decorators';
import { RolesGuard } from 'src/auth/guards';

import { CarBrandsService } from './car-brands.service';
import { CarBrandDto, CreateCarBrandDto, UpdateCarBrandDto } from './dto';

@ApiBearerAuth()
@ApiTags('car-brands')
@Controller('car-brands')
export class CarBrandsController {
  constructor(private readonly carBrandsService: CarBrandsService) {}

  @ApiOperation({ summary: 'Create a car brand' })
  @ApiExtraModels(CarBrandDto)
  @ApiResponse({
    status: 201,
    description: 'Successfully',
    content: {
      'application/json': {
        schema: { $ref: getSchemaPath(CarBrandDto) },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @ApiBody({ type: CreateCarBrandDto })
  @Post()
  @Roles(RoleName.ADMIN)
  @UseGuards(RolesGuard)
  createCarBrand(@Body() createCarBrandDto: CreateCarBrandDto): Promise<CarBrandDto> {
    return this.carBrandsService.createCarBrand(createCarBrandDto);
  }

  @ApiOperation({ summary: 'Get all car brands' })
  @ApiExtraModels(CarBrandDto)
  @ApiResponse({
    status: 200,
    description: 'Successfully',
    content: {
      'application/json': {
        schema: {
          allOf: [
            {
              properties: {
                data: {
                  type: 'array',
                  items: { $ref: getSchemaPath(CarBrandDto) },
                },
              },
            },
            {
              properties: {
                meta: {
                  $ref: getSchemaPath(MetaSchema),
                },
              },
            },
          ],
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @UseGuards(RolesGuard)
  @Public()
  @Get()
  findAllCarBrands(@Query('page') page: number, @Query('limit') limit: number): Promise<any> {
    return this.carBrandsService.findAllCarBrands(page, limit);
  }

  @ApiOperation({ summary: 'Get car brand by id' })
  @ApiExtraModels(CarBrandDto)
  @ApiResponse({
    status: 200,
    description: 'Successfully',
    content: {
      'application/json': {
        schema: { $ref: getSchemaPath(CarBrandDto) },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({
    status: 404,
    description: 'Car brand with id: {id} not found',
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @ApiParam({ name: 'id', required: true })
  @UseGuards(RolesGuard)
  @Public()
  @Get(':id')
  findOneById(@Param('id') id: number): Promise<CarBrandDto> {
    return this.carBrandsService.findOneById(+id);
  }

  @ApiOperation({ summary: 'Update a car brand' })
  @ApiExtraModels(CarBrandDto)
  @ApiResponse({
    status: 201,
    description: 'Successfully',
    content: {
      'application/json': {
        schema: { $ref: getSchemaPath(CarBrandDto) },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({
    status: 404,
    description: 'Car brand with id: {id} not found',
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @ApiParam({ name: 'id', required: true })
  @ApiBody({ type: UpdateCarBrandDto })
  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN)
  @Patch(':id')
  updateCarBrand(@Param('id') id: number, @Body() updateCarBrandDto: UpdateCarBrandDto): Promise<CarBrandDto> {
    return this.carBrandsService.updateCarBrand(+id, updateCarBrandDto);
  }

  @ApiOperation({ summary: 'Delete a car brand' })
  @ApiExtraModels(CarBrandDto)
  @ApiResponse({
    status: 200,
    description: 'Successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({
    status: 404,
    description: 'Car brand with id: {id} not found',
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @ApiParam({ name: 'id', required: true })
  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN)
  @Delete(':id')
  removeCarBrand(@Param('id') id: number): Promise<string> {
    return this.carBrandsService.removeCarBrand(+id);
  }

  @Public()
  @Get('/and/models')
  findAllCarBrandsWithModels(): Promise<any> {
    return this.carBrandsService.findAllCarBrandsWithModels();
  }
}
