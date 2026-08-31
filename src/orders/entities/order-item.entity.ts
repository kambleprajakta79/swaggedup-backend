import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Order } from './order.entity';

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  orderId: number;

  @ManyToOne(() => Order, (order) => order.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @Column()
  productId: number;

  @Column()
  productVariantId: number;

  @Column()
  productName: string; // Snapshot product name

  @Column()
  sku: string; // Snapshot SKU

  @Column()
  size: string; // Snapshot size

  @Column()
  quantity: number;

  @Column('decimal', { precision: 10, scale: 2 })
  price: number; // Snapshot price

  @Column('decimal', { precision: 10, scale: 2 })
  totalPrice: number; // Snapshot quantity * price
}
