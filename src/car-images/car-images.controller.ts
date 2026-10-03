import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
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

import { CarImagesService } from './car-images.service';
import { CarImageDto, CreateCarImageDto, UpdateCarImageDto } from './dto';

@ApiBearerAuth()
@ApiTags('car-images')
@Controller('car-images')
export class CarImagesController {
  constructor(private readonly carImagesService: CarImagesService) {}

  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN)
  @Post()
  create(@Body() createCarImageDto: CreateCarImageDto) {
    return this.carImagesService.create(createCarImageDto);
  }

  @ApiOperation({ summary: 'Get all car images' })
  @ApiExtraModels(CarImageDto)
  @ApiResponse({
    status: 200,
    description: 'Get all car images',
    content: {
      'application/json': {
        schema: {
          allOf: [
            {
              properties: {
                data: {
                  type: 'array',
                  items: { $ref: getSchemaPath(CarImageDto) },
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
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @UseGuards(RolesGuard)
  @Public()
  @Get()
  findAllCarImage(@Query('page') page: number = 1, @Query('limit') limit: number = 10): Promise<any> {
    return this.carImagesService.findAllCarImage(page, limit);
  }

  @ApiOperation({ summary: 'Get car image by id' })
  @ApiExtraModels(CarImageDto)
  @ApiResponse({
    status: 200,
    description: 'Get car image by id',
    content: {
      'application/json': {
        schema: { $ref: getSchemaPath(CarImageDto) },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Car image not found.' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @ApiParam({ name: 'id', required: true })
  @UseGuards(RolesGuard)
  @Public()
  @Get(':id')
  findOneById(@Param('id') id: string): Promise<any> {
    return this.carImagesService.findOneById(+id);
  }

  @ApiOperation({ summary: 'Get car images by car id' })
  @ApiExtraModels(CarImageDto)
  @ApiResponse({
    status: 200,
    description: 'Get car images by car id',
    content: {
      'application/json': {
        schema: { $ref: getSchemaPath(CarImageDto) },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Car image not found.' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @ApiParam({ name: 'id', required: true })
  @UseGuards(RolesGuard)
  @Public()
  @Get('car/:id')
  findOneByCarId(@Param('id') id: string): Promise<any> {
    return this.carImagesService.findOneByCarId(+id);
  }

  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN)
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateCarImageDto: UpdateCarImageDto): Promise<any> {
    return this.carImagesService.update(+id, updateCarImageDto);
  }

  @ApiOperation({ summary: 'Delete car image by id' })
  @ApiResponse({
    status: 200,
    description: 'Delete car image by id',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Car image not found.' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @ApiParam({ name: 'id', required: true })
  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN)
  @Delete(':id')
  removeById(@Param('id') id: string): Promise<any> {
    return this.carImagesService.remove(+id);
  }
}
