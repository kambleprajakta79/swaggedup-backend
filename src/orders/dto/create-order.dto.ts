import { IsNotEmpty, IsEmail, IsString, IsOptional, IsArray, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateOrderItemDto } from './create-order-item.dto';

export class CreateOrderDto {
  @ApiProperty({ example: 'Rahul Sharma' })
  @IsNotEmpty({ message: 'Customer name is required' })
  @IsString()
  customerName: string;

  @ApiProperty({ example: 'rahul@example.com' })
  @IsNotEmpty({ message: 'Customer email is required' })
  @IsEmail({}, { message: 'Invalid email address' })
  customerEmail: string;

  @ApiProperty({ example: '9876543210' })
  @IsNotEmpty({ message: 'Customer phone is required' })
  @IsString()
  customerPhone: string;

  @ApiProperty({ example: '221B Baker Street' })
  @IsNotEmpty({ message: 'Address line 1 is required' })
  @IsString()
  addressLine1: string;

  @ApiPropertyOptional({ example: 'Near City Mall' })
  @IsOptional()
  @IsString()
  addressLine2?: string;

  @ApiProperty({ example: 'Mumbai' })
  @IsNotEmpty({ message: 'City is required' })
  @IsString()
  city: string;

  @ApiProperty({ example: 'Maharashtra' })
  @IsNotEmpty({ message: 'State is required' })
  @IsString()
  state: string;

  @ApiProperty({ example: '400001' })
  @IsNotEmpty({ message: 'Postal code is required' })
  @IsString()
  postalCode: string;

  @ApiProperty({ example: 'India' })
  @IsNotEmpty({ message: 'Country is required' })
  @IsString()
  country: string;

  @ApiPropertyOptional({ example: 'COD', description: "Payment method: 'COD' or 'ONLINE'" })
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiProperty({ type: [CreateOrderItemDto], description: 'Order line items' })
  @IsArray()
  @ArrayMinSize(1, { message: 'Order must contain at least one item' })
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];
}
