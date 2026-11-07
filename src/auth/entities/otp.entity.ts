import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export enum OtpPurpose {
  REGISTER = 'REGISTER',
  RESET_PASSWORD = 'RESET_PASSWORD',
  CHECKOUT_VERIFY = 'CHECKOUT_VERIFY',
}

@Entity('otps')
@Index(['email', 'purpose'])
export class Otp {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  email: string;

  @Column()
  codeHash: string;

  @Column({ type: 'varchar' })
  purpose: OtpPurpose;

  @Column({ type: 'datetime' })
  expiresAt: Date;

  @Column({ type: 'datetime', nullable: true })
  consumedAt: Date | null;

  @Column({ default: 0 })
  attempts: number;

  @CreateDateColumn()
  createdAt: Date;
}
