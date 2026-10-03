import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiExtraModels,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { MetaSchema } from 'schemas';
import { Public, Roles } from 'src/auth/decorators';
import { RolesGuard } from 'src/auth/guards';

import { CarModelsService } from './car-models.service';
import { CarModelDto, CreateCarModelDto, UpdateCarModelDto } from './dto';

@ApiBearerAuth()
@ApiTags('car-models')
@Controller('car-models')
export class CarModelsController {
  constructor(private readonly carModelsService: CarModelsService) {}

  @ApiOperation({ summary: 'Create new a car brand' })
  @ApiExtraModels(CarModelDto)
  @ApiResponse({
    status: 201,
    description: 'Successfully',
    content: {
      'application/json': {
        schema: { $ref: getSchemaPath(CarModelDto) },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @ApiBody({ type: CreateCarModelDto })
  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN)
  @Post()
  createCarModel(@Body() createCarModelDto: CreateCarModelDto): Promise<any> {
    return this.carModelsService.createCarModel(createCarModelDto);
  }

  @ApiOperation({ summary: 'Get all car models' })
  @ApiExtraModels(CarModelDto)
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
                  items: { $ref: getSchemaPath(CarModelDto) },
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
  findAllCarModel(@Query('page') page: number, @Query('limit') limit: number): Promise<any> {
    return this.carModelsService.findAllCarModel(page, limit);
  }

  @ApiOperation({ summary: 'Get a car model by id' })
  @ApiExtraModels(CarModelDto)
  @ApiResponse({
    status: 200,
    description: 'Successfully',
    content: {
      'application/json': {
        schema: { $ref: getSchemaPath(CarModelDto) },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Not found.' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @UseGuards(RolesGuard)
  @Public()
  @Get(':id')
  findOneById(@Param('id') id: string): Promise<CarModelDto> {
    return this.carModelsService.findOneById(+id);
  }

  @ApiOperation({ summary: 'Update a car model by id' })
  @ApiExtraModels(CarModelDto)
  @ApiResponse({
    status: 200,
    description: 'Successfully',
    content: {
      'application/json': {
        schema: { $ref: getSchemaPath(CarModelDto) },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Not found.' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @ApiBody({ type: UpdateCarModelDto })
  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN)
  @Patch(':id')
  updateById(@Param('id') id: string, @Body() updateCarModelDto: UpdateCarModelDto) {
    return this.carModelsService.updateById(+id, updateCarModelDto);
  }

  @ApiOperation({ summary: 'Delete a car model by id' })
  @ApiResponse({
    status: 200,
    description: 'Successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Not found.' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN)
  @Delete(':id')
  removeById(@Param('id') id: string) {
    return this.carModelsService.removeById(+id);
  }
}
