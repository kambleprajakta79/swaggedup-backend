import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, DeleteDateColumn } from 'typeorm';

@Entity('banners')
export class Banner {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  subtitle: string;

  /** Image as base64 data-URL or external URL. */
  @Column({ type: 'text', nullable: true })
  image: string;

  /** Optional in-app link, e.g. /shop?category=festive */
  @Column({ nullable: true })
  link: string;

  /** Lower value = shown earlier in the carousel. */
  @Column({ default: 0 })
  sortOrder: number;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
