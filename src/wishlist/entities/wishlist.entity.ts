import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Unique } from 'typeorm';

@Entity('wishlists')
@Unique(['userId', 'productId'])
export class Wishlist {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  userId: number;

  @Column({ type: 'int' })
  productId: number;

  @CreateDateColumn()
  createdAt: Date;
}
