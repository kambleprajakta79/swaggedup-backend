import { IsNotEmpty, IsEmail, IsString, IsOptional, IsArray, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateOrderItemDto } from './create-order-item.dto';

export class CreateOrderDto {
  @IsNotEmpty({ message: 'Customer name is required' })
  @IsString()
  customerName: string;

  @IsNotEmpty({ message: 'Customer email is required' })
  @IsEmail({}, { message: 'Invalid email address' })
  customerEmail: string;

  @IsNotEmpty({ message: 'Customer phone is required' })
  @IsString()
  customerPhone: string;

  @IsNotEmpty({ message: 'Address line 1 is required' })
  @IsString()
  addressLine1: string;

  @IsOptional()
  @IsString()
  addressLine2?: string;

  @IsNotEmpty({ message: 'City is required' })
  @IsString()
  city: string;

  @IsNotEmpty({ message: 'State is required' })
  @IsString()
  state: string;

  @IsNotEmpty({ message: 'Postal code is required' })
  @IsString()
  postalCode: string;

  @IsNotEmpty({ message: 'Country is required' })
  @IsString()
  country: string;

  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'Order must contain at least one item' })
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];
}
