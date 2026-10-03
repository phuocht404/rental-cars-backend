import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RoleName } from '@prisma/client';
import { Roles } from 'src/auth/decorators';
import { RolesGuard } from 'src/auth/guards';

import { AnalyticsService } from './analytics.service';

@ApiTags('Analytics')
@ApiBearerAuth()
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @ApiOperation({ summary: 'Get analytics' })
  @ApiResponse({
    status: 200,
    description: 'Successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @Roles(RoleName.ADMIN)
  @UseGuards(RolesGuard)
  @Get()
  getCardAnalytics(): Promise<any> {
    return this.analyticsService.getCardAnalytics();
  }

  @ApiOperation({ summary: 'Get order analytics' })
  @ApiResponse({
    status: 200,
    description: 'Successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @ApiQuery({ name: 'fromDay', required: false, type: Date })
  @ApiQuery({ name: 'toDay', required: false, type: Date })
  @Roles(RoleName.ADMIN)
  @UseGuards(RolesGuard)
  @Get('revenue')
  getRevenueAnalytics(@Query('fromDay') fromDay: Date, @Query('toDay') toDay: Date): Promise<any> {
    const from = fromDay || new Date(new Date().getFullYear(), 0, 1);
    const to = toDay || new Date();

    return this.analyticsService.getRevenueAnalytics(from, to);
  }

  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN)
  @Get('user-type')
  getUserTypeAnalytics(): Promise<any> {
    return this.analyticsService.getUserTypeAnalytics();
  }
}
