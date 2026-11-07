import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyPaymentDto {
  @ApiProperty({ example: 42, description: 'Internal order ID' })
  @IsNotEmpty()
  orderId: number;

  @ApiProperty({ example: 'pay_29QQoUBi66YJZk', description: 'Razorpay payment ID' })
  @IsNotEmpty()
  @IsString()
  razorpayPaymentId: string;

  @ApiProperty({ example: 'order_29QQoUBi66YJZk', description: 'Razorpay order ID' })
  @IsNotEmpty()
  @IsString()
  razorpayOrderId: string;

  @ApiProperty({ example: 'e2f4c1...', description: 'Razorpay signature from checkout handler' })
  @IsNotEmpty()
  @IsString()
  razorpaySignature: string;
}
