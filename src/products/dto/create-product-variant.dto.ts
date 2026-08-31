import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class CreateProductVariantDto {
  @IsNotEmpty({ message: 'SKU is required' })
  @IsString()
  sku: string;

  @IsNotEmpty({ message: 'Size is required' })
  @IsString()
  size: string;

  @IsNotEmpty({ message: 'Price is required' })
  @IsNumber({}, { message: 'Price must be a number' })
  @Min(0, { message: 'Price cannot be negative' })
  price: number;

  @IsNotEmpty({ message: 'Stock is required' })
  @IsNumber({}, { message: 'Stock must be a number' })
  @Min(0, { message: 'Stock cannot be negative' })
  stock: number;
}
