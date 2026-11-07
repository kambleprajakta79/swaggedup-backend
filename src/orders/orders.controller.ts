import { Controller, Post, Get, Body, Param, UseGuards, Request } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiOkResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @ApiOperation({ summary: 'Place an order (guest or logged-in checkout)' })
  @ApiOkResponse({ description: 'Created order with order number' })
  @Post()
  @UseGuards(OptionalJwtAuthGuard)
  async create(@Request() req: any, @Body() createOrderDto: CreateOrderDto) {
    // Logged-in customers get the order linked to their account; guests pass req.user = undefined
    return this.ordersService.create(createOrderDto, req.user?.id);
  }

  @ApiOperation({ summary: 'My order history (logged-in customers)' })
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @Get('mine')
  async findMine(@Request() req: any) {
    return { orders: await this.ordersService.findMine(req.user.id) };
  }

  @ApiOperation({ summary: 'Track an order by order number (public)' })
  @Get(':orderNumber')
  async findByOrderNumber(@Param('orderNumber') orderNumber: string) {
    const order = await this.ordersService.findByOrderNumber(orderNumber);
    return { orders: [order], total: 1, page: 1, limit: 1 };
  }
}
