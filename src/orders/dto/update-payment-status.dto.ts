import { IsEnum, IsNotEmpty } from 'class-validator';
import { PaymentStatus } from '../entities/order.entity';

export class UpdatePaymentStatusDto {
  @IsNotEmpty()
  @IsEnum(PaymentStatus, { message: 'Invalid payment status value' })
  paymentStatus: PaymentStatus;
}
