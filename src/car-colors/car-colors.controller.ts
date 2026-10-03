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

import { CarColorsService } from './car-colors.service';
import { CarColorsDto, CreateCarColorDto, UpdateCarColorDto } from './dto';

@ApiBearerAuth()
@ApiTags('car-colors')
@Controller('car-colors')
export class CarColorsController {
  constructor(private readonly carColorsService: CarColorsService) {}

  @ApiOperation({ summary: 'Create a new car color' })
  @ApiExtraModels(CarColorsDto)
  @ApiResponse({
    status: 201,
    description: 'The car color has been successfully created.',
    type: CarColorsDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden.',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error.',
  })
  @ApiBody({
    type: CreateCarColorDto,
    description: 'The car color to be created',
  })
  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN)
  @Post()
  createCarColor(@Body() createCarColorDto: CreateCarColorDto): Promise<CarColorsDto> {
    return this.carColorsService.createCarColor(createCarColorDto);
  }

  @ApiOperation({ summary: 'Get all car colors' })
  @ApiExtraModels(CarColorsDto)
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
                  items: { $ref: getSchemaPath(CarColorsDto) },
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
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 500, description: 'Internal server error.' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'The page number',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'The limit number',
  })
  @UseGuards(RolesGuard)
  @Public()
  @Get()
  findAllColor(@Query('page') page: number, @Query('limit') limit: number): Promise<any> {
    return this.carColorsService.findAllColor(page, limit);
  }

  @ApiOperation({ summary: 'Get a car color by id' })
  @ApiExtraModels(CarColorsDto)
  @ApiResponse({
    status: 200,
    description: 'Successfully',
    type: CarColorsDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Car color not found.' })
  @ApiResponse({ status: 500, description: 'Internal server error.' })
  @ApiParam({
    name: 'id',
    required: true,
    type: Number,
    description: 'The car color id',
  })
  @UseGuards(RolesGuard)
  @Public()
  @Get(':id')
  findOneById(@Param('id') id: number): Promise<CarColorsDto> {
    return this.carColorsService.findOneById(+id);
  }

  @ApiOperation({ summary: 'Update a car color by id' })
  @ApiExtraModels(CarColorsDto)
  @ApiResponse({
    status: 200,
    description: 'Successfully',
    type: CarColorsDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Car color not found.' })
  @ApiResponse({ status: 500, description: 'Internal server error.' })
  @ApiParam({
    name: 'id',
    required: true,
    type: Number,
    description: 'The car color id',
  })
  @ApiBody({
    type: UpdateCarColorDto,
    description: 'The car color to be updated',
  })
  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN)
  @Patch(':id')
  updateColor(@Param('id') id: number, @Body() updateCarColorDto: UpdateCarColorDto): Promise<CarColorsDto> {
    return this.carColorsService.updateColor(+id, updateCarColorDto);
  }

  @ApiOperation({ summary: 'Delete a car color by id' })
  @ApiResponse({
    status: 200,
    description: 'The car color has been successfully deleted.',
    type: String,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Car color not found.' })
  @ApiResponse({ status: 500, description: 'Internal server error.' })
  @ApiParam({
    name: 'id',
    required: true,
    type: Number,
    description: 'The car color id',
  })
  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN)
  @Delete(':id')
  removeColor(@Param('id') id: number): Promise<string> {
    return this.carColorsService.removeColor(+id);
  }
}
