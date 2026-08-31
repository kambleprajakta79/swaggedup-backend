import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Order, OrderStatus, PaymentStatus } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Product } from '../products/entities/product.entity';
import { ProductVariant } from '../products/entities/product-variant.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { User } from '../users/entities/user.entity';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(ProductVariant)
    private readonly variantRepository: Repository<ProductVariant>,
    private readonly dataSource: DataSource,
  ) {}

  async create(createOrderDto: CreateOrderDto): Promise<Order> {
    // Run order creation inside a transaction to prevent partial state updates
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Normalize customer email and find/create customer account inside transaction
      const emailNormalized = createOrderDto.customerEmail.toLowerCase().trim();
      let customerUser = await queryRunner.manager.findOne(User, {
        where: { email: emailNormalized },
      });

      if (!customerUser) {
        customerUser = new User();
        customerUser.email = emailNormalized;
        
        // Generate secure random password (never expose or send to client)
        const tempPassword = crypto.randomBytes(32).toString('hex');
        customerUser.password = await bcrypt.hash(tempPassword, 10);
        customerUser.role = 'CUSTOMER';
        
        await queryRunner.manager.save(customerUser);
      }

      const orderNumber = this.generateOrderNumber();
      
      const order = new Order();
      order.orderNumber = orderNumber;
      order.customerName = createOrderDto.customerName;
      order.customerEmail = createOrderDto.customerEmail;
      order.customerPhone = createOrderDto.customerPhone;
      order.addressLine1 = createOrderDto.addressLine1;
      order.addressLine2 = createOrderDto.addressLine2 || null;
      order.city = createOrderDto.city;
      order.state = createOrderDto.state;
      order.postalCode = createOrderDto.postalCode;
      order.country = createOrderDto.country;
      order.paymentMethod = createOrderDto.paymentMethod || 'COD';
      order.status = OrderStatus.PENDING;
      order.paymentStatus = PaymentStatus.PENDING;

      let subtotal = 0;
      const orderItems: OrderItem[] = [];

      for (const itemDto of createOrderDto.items) {
        // Find product
        const product = await queryRunner.manager.findOne(Product, {
          where: { id: itemDto.productId, isActive: true },
        });
        if (!product) {
          throw new BadRequestException(`Product with ID ${itemDto.productId} does not exist or is inactive`);
        }

        // Find variant
        const variant = await queryRunner.manager.findOne(ProductVariant, {
          where: { id: itemDto.productVariantId, productId: itemDto.productId },
        });
        if (!variant) {
          throw new BadRequestException(`Product variant with ID ${itemDto.productVariantId} not found`);
        }

        // Check stock
        if (variant.stock < itemDto.quantity) {
          throw new BadRequestException(`Insufficient stock for product "${product.name}" in size "${variant.size}". Available stock: ${variant.stock}`);
        }

        // Reduce stock
        variant.stock -= itemDto.quantity;
        await queryRunner.manager.save(variant);

        // Create line item (snapshot data)
        const orderItem = new OrderItem();
        orderItem.productId = product.id;
        orderItem.productVariantId = variant.id;
        orderItem.productName = product.name;
        orderItem.sku = variant.sku;
        orderItem.size = variant.size;
        orderItem.quantity = itemDto.quantity;
        orderItem.price = variant.price;
        orderItem.totalPrice = variant.price * itemDto.quantity;

        subtotal += orderItem.totalPrice;
        orderItems.push(orderItem);
      }

      order.items = orderItems;
      order.subtotal = subtotal;
      
      // Calculate shipping (Flat ₹150, free shipping above ₹5000)
      order.shippingAmount = subtotal >= 5000 ? 0 : 150;
      order.discountAmount = 0;
      order.totalAmount = order.subtotal + order.shippingAmount - order.discountAmount;

      const savedOrder = await queryRunner.manager.save(order);
      await queryRunner.commitTransaction();
      return savedOrder;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async findByOrderNumber(orderNumber: string): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { orderNumber },
      relations: { items: true },
    });
    if (!order) {
      throw new NotFoundException(`Order with order number "${orderNumber}" not found`);
    }
    return order;
  }

  async findAll(): Promise<Order[]> {
    return this.orderRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: { items: true },
    });
    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }
    return order;
  }

  async updateStatus(id: number, status: OrderStatus): Promise<Order> {
    const order = await this.findOne(id);
    const oldStatus = order.status;

    // Handle stock restoration on cancellation
    if (status === OrderStatus.CANCELLED && oldStatus !== OrderStatus.CANCELLED) {
      for (const item of order.items) {
        const variant = await this.variantRepository.findOne({ where: { id: item.productVariantId } });
        if (variant) {
          variant.stock += item.quantity;
          await this.variantRepository.save(variant);
        }
      }
    }

    // Handle stock re-deduction if moving away from cancelled (edge case)
    if (oldStatus === OrderStatus.CANCELLED && status !== OrderStatus.CANCELLED) {
      for (const item of order.items) {
        const variant = await this.variantRepository.findOne({ where: { id: item.productVariantId } });
        if (variant) {
          if (variant.stock < item.quantity) {
            throw new BadRequestException(`Cannot restore order: Insufficient stock for variant "${variant.sku}"`);
          }
          variant.stock -= item.quantity;
          await this.variantRepository.save(variant);
        }
      }
    }

    order.status = status;
    return this.orderRepository.save(order);
  }

  async updatePaymentStatus(id: number, paymentStatus: PaymentStatus): Promise<Order> {
    const order = await this.findOne(id);
    order.paymentStatus = paymentStatus;
    return this.orderRepository.save(order);
  }

  async getDashboardStats(): Promise<any> {
    const totalOrders = await this.orderRepository.count();
    const pendingOrders = await this.orderRepository.count({ where: { status: OrderStatus.PENDING } });
    
    // Total Revenue (Only Paid Orders count towards revenue)
    const paidOrders = await this.orderRepository.find({ where: { paymentStatus: PaymentStatus.PAID } });
    const totalRevenue = paidOrders.reduce((sum, order) => sum + Number(order.totalAmount), 0);

    const recentOrders = await this.orderRepository.find({
      order: { createdAt: 'DESC' },
      take: 5,
    });

    const totalProducts = await this.productRepository.count();
    const lowStockProducts = await this.variantRepository
      .createQueryBuilder('variant')
      .where('variant.stock <= 5')
      .getCount();

    const lowStockDetails = await this.variantRepository
      .createQueryBuilder('variant')
      .leftJoinAndSelect('variant.product', 'product')
      .where('variant.stock <= 5')
      .orderBy('variant.stock', 'ASC')
      .getMany();

    return {
      totalOrders,
      totalRevenue,
      pendingOrders,
      recentOrders,
      totalProducts,
      lowStockProducts,
      lowStockDetails,
    };
  }

  private generateOrderNumber(): string {
    const today = new Date();
    const dateStr = today.getFullYear().toString() +
      (today.getMonth() + 1).toString().padStart(2, '0') +
      today.getDate().toString().padStart(2, '0');
    const random = Math.floor(1000 + Math.random() * 9000);
    return `SW-${dateStr}-${random}`;
  }
}
