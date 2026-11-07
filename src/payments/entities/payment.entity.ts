import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export enum PaymentProvider {
  RAZORPAY = 'RAZORPAY',
}

export enum PaymentRecordStatus {
  CREATED = 'CREATED',
  PAID = 'PAID',
  FAILED = 'FAILED',
}

@Entity('payments')
@Index(['orderId'])
export class Payment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  orderId: number;

  @Column({ type: 'varchar', default: PaymentProvider.RAZORPAY })
  provider: PaymentProvider;

  @Column({ type: 'varchar' })
  providerOrderId: string; // Razorpay order id

  @Column({ type: 'varchar', nullable: true })
  providerPaymentId: string | null; // Razorpay payment id

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', default: PaymentRecordStatus.CREATED })
  status: PaymentRecordStatus;

  @Column({ type: 'text', nullable: true })
  rawPayload: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
