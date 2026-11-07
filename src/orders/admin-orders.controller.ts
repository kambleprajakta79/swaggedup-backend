import { Controller, Get, Patch, Body, Param, UseGuards, ParseIntPipe } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { UpdatePaymentStatusDto } from './dto/update-payment-status.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('admin-orders')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin/orders')
export class AdminOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @ApiOperation({ summary: 'Dashboard statistics (revenue, orders, status counts)' })
  @Get('dashboard/stats')
  async getDashboardStats() {
    return this.ordersService.getDashboardStats();
  }

  @ApiOperation({ summary: 'List all orders' })
  @Get()
  async findAll() {
    const orders = await this.ordersService.findAll();
    return { orders, total: orders.length, page: 1, limit: orders.length || 1 };
  }

  @ApiOperation({ summary: 'Get a single order by ID' })
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const order = await this.ordersService.findOne(id);
    return { orders: [order], total: 1, page: 1, limit: 1 };
  }

  @ApiOperation({ summary: 'Update order status (PENDING/PROCESSING/SHIPPED/DELIVERED/CANCELLED)' })
  @Patch(':id/status')
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateStatusDto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateStatus(id, updateStatusDto.status);
  }

  @ApiOperation({ summary: 'Update payment status (PENDING/PAID/FAILED/REFUNDED)' })
  @Patch(':id/payment-status')
  async updatePaymentStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePaymentStatusDto: UpdatePaymentStatusDto,
  ) {
    return this.ordersService.updatePaymentStatus(id, updatePaymentStatusDto.paymentStatus);
  }
}
