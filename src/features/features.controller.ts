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

import { CreateFeatureDto, FeaturesDto, UpdateFeatureDto } from './dto';
import { FeaturesService } from './features.service';

@ApiBearerAuth()
@ApiTags('features')
@Controller('features')
export class FeaturesController {
  constructor(private readonly featuresService: FeaturesService) {}

  @ApiOperation({ summary: 'Create a new feature' })
  @ApiExtraModels(FeaturesDto)
  @ApiResponse({
    status: 201,
    description: 'The feature has been successfully created.',
    type: FeaturesDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 500, description: 'Internal server error.' })
  @ApiBody({ type: CreateFeatureDto, description: 'The feature to be created' })
  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN)
  @Post()
  createFeature(@Body() createFeatureDto: CreateFeatureDto): Promise<FeaturesDto> {
    return this.featuresService.createFeature(createFeatureDto);
  }

  @ApiOperation({ summary: 'Get all features' })
  @ApiExtraModels(FeaturesDto)
  @ApiResponse({
    status: 200,
    description: 'All features have been successfully returned.',
    content: {
      'application/json': {
        schema: {
          allOf: [
            {
              properties: {
                data: {
                  type: 'array',
                  items: { $ref: getSchemaPath(FeaturesDto) },
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
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 500, description: 'Internal server error.' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 1 })
  @UseGuards(RolesGuard)
  @Public()
  @Get()
  findAllFeature(@Query('page') page: number, @Query('limit') limit: number): Promise<any> {
    return this.featuresService.findAllFeature(page, limit);
  }

  @ApiOperation({ summary: 'Get a feature by id' })
  @ApiExtraModels(FeaturesDto)
  @ApiResponse({
    status: 200,
    description: 'The feature has been successfully returned.',
    type: FeaturesDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Feature not found.' })
  @ApiResponse({ status: 500, description: 'Internal server error.' })
  @ApiParam({ name: 'id', description: 'Feature id', type: Number })
  @UseGuards(RolesGuard)
  @Public()
  @Get(':id')
  findOneById(@Param('id') id: number) {
    return this.featuresService.findOneById(+id);
  }

  @ApiOperation({ summary: 'Update a feature by id' })
  @ApiExtraModels(FeaturesDto)
  @ApiResponse({
    status: 200,
    description: 'The feature has been successfully updated.',
    type: FeaturesDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Feature not found.' })
  @ApiResponse({ status: 500, description: 'Internal server error.' })
  @ApiParam({ name: 'id', description: 'Feature id', type: Number })
  @ApiBody({ type: UpdateFeatureDto, description: 'The feature to be updated' })
  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN)
  @Patch(':id')
  updateFeature(@Param('id') id: number, @Body() updateFeatureDto: UpdateFeatureDto): Promise<FeaturesDto> {
    return this.featuresService.updateFeature(+id, updateFeatureDto);
  }

  @ApiOperation({ summary: 'Delete a feature by id' })
  @ApiExtraModels(FeaturesDto)
  @ApiResponse({
    status: 200,
    description: 'The feature has been successfully deleted.',
    type: FeaturesDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Feature not found.' })
  @ApiResponse({ status: 500, description: 'Internal server error.' })
  @ApiParam({ name: 'id', description: 'Feature id', type: Number })
  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN)
  @Delete(':id')
  removeFeature(@Param('id') id: number): Promise<string> {
    return this.featuresService.removeFeature(+id);
  }
}
