import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Query, UseGuards } from '@nestjs/common';
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
import { GetCurrentUser, Roles } from 'src/auth/decorators';
import { RolesGuard } from 'src/auth/guards';

import { OrderDto, UpdateOrderDto } from './dto';
import { OrdersService } from './orders.service';

@ApiBearerAuth()
@ApiTags('Orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @ApiOperation({ summary: 'Get all orders' })
  @ApiExtraModels(OrderDto)
  @ApiResponse({
    status: 200,
    description: 'Get all orders successfully.',
    content: {
      'application/json': {
        schema: { $ref: getSchemaPath(OrderDto) },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 500, description: 'Internal server error.' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'q', required: false, description: 'Mã đơn hoặc tên khách' })
  @ApiQuery({ name: 'orderStatus', required: false })
  @ApiQuery({ name: 'paymentStatus', required: false })
  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN)
  @Get()
  findAllOrders(
    @Query('page') page: number,
    @Query('limit') limit: number,
    @Query('q') q?: string,
    @Query('orderStatus') orderStatus?: string,
    @Query('paymentStatus') paymentStatus?: string,
  ): Promise<any> {
    return this.ordersService.findAllOrders(page, limit, { q, orderStatus, paymentStatus });
  }

  @ApiOperation({ summary: 'Get order by id' })
  @ApiExtraModels(OrderDto)
  @ApiResponse({
    status: 200,
    description: 'Get order by id successfully.',
    content: {
      'application/json': {
        schema: { $ref: getSchemaPath(OrderDto) },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Order not found.' })
  @ApiResponse({ status: 500, description: 'Internal server error.' })
  @ApiParam({ name: 'id', required: true, type: Number })
  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN, RoleName.CAROWNER, RoleName.TRAVELER)
  @Get(':id')
  findOneById(@Param('id', ParseIntPipe) id: number, @GetCurrentUser() currentUser: any): Promise<any> {
    return this.ordersService.findOneById(id, currentUser);
  }

  @ApiOperation({ summary: 'Update order by id' })
  @ApiExtraModels(OrderDto)
  @ApiResponse({
    status: 200,
    description: 'Update order by id successfully.',
    content: {
      'application/json': {
        schema: { $ref: getSchemaPath(OrderDto) },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Order not found.' })
  @ApiResponse({ status: 500, description: 'Internal server error.' })
  @ApiParam({ name: 'id', required: true, type: Number })
  @ApiBody({ type: UpdateOrderDto })
  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN)
  @Patch(':id')
  updateOrderById(@Param('id', ParseIntPipe) id: number, @Body() updateOrderDto: UpdateOrderDto): Promise<any> {
    return this.ordersService.updateOrderById(id, updateOrderDto);
  }

  @ApiOperation({ summary: 'Remove order by id' })
  @ApiExtraModels(OrderDto)
  @ApiResponse({
    status: 200,
    description: 'Remove order by id successfully.',
    content: {
      'application/json': {
        schema: { $ref: getSchemaPath(OrderDto) },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Order not found.' })
  @ApiResponse({ status: 500, description: 'Internal server error.' })
  @ApiParam({ name: 'id', required: true, type: Number })
  @UseGuards(RolesGuard)
  @Roles(RoleName.ADMIN)
  @Delete(':id')
  removeById(@Param('id', ParseIntPipe) id: number): Promise<any> {
    return this.ordersService.removeById(id);
  }

  @ApiOperation({ summary: 'Get my orders' })
  @ApiExtraModels(OrderDto)
  @ApiResponse({
    status: 200,
    description: 'Get my orders successfully.',
    content: {
      'application/json': {
        schema: { $ref: getSchemaPath(OrderDto) },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 500, description: 'Internal server error.' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @UseGuards(RolesGuard)
  @Roles(RoleName.TRAVELER, RoleName.CAROWNER, RoleName.ADMIN)
  @Get('user/my-orders')
  getMyOrders(
    @GetCurrentUser() currentUser: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('orderStatus') orderStatus?: string,
    @Query('paymentStatus') paymentStatus?: string,
  ): Promise<any> {
    return this.ordersService.getMyOrders(currentUser, page, limit, { orderStatus, paymentStatus });
  }
}
