import { IsNotEmpty, IsNumber, IsOptional, IsString, IsBoolean, IsArray, ValidateNested, Min, ArrayMaxSize } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateProductVariantDto } from './create-product-variant.dto';
import { IsImageDataUrl } from '../validators/image-data-url.validator';

export class CreateProductDto {
  @ApiProperty({ example: 'Classic Oxford Shirt', description: 'Product name' })
  @IsNotEmpty({ message: 'Product name is required' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'classic-oxford-shirt', description: 'URL slug (auto-generated if omitted)' })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiPropertyOptional({ example: 'Premium cotton oxford shirt', description: 'Product description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 2499, description: 'Base price in INR' })
  @IsNotEmpty({ message: 'Base price is required' })
  @IsNumber({}, { message: 'Base price must be a number' })
  @Min(0, { message: 'Base price cannot be negative' })
  basePrice: number;

  @ApiProperty({ example: 1, description: 'Category ID' })
  @IsNotEmpty({ message: 'Category ID is required' })
  @IsNumber({}, { message: 'Category ID must be a number' })
  categoryId: number;

  @ApiPropertyOptional({ example: 'SWAGGER & CO' })
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiPropertyOptional({ example: '100% Cotton' })
  @IsOptional()
  @IsString()
  material?: string;

  @ApiPropertyOptional({ example: 'Navy' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({ type: [String], description: 'Base64 data-URL images (max 5)' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5, { message: 'Maximum 5 images are allowed per product' })
  @IsString({ each: true })
  @IsImageDataUrl({ each: true })
  images?: string[];

  @ApiPropertyOptional({ example: false, description: 'Show in featured section' })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({ example: false, description: 'Show in new arrivals' })
  @IsOptional()
  @IsBoolean()
  isNewArrival?: boolean;

  @ApiPropertyOptional({ example: true, description: 'Product is visible on storefront' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: true, description: 'Product supports custom prints — customers can contact SwaggedUp for customization' })
  @IsOptional()
  @IsBoolean()
  isCustomizable?: boolean;

  @ApiPropertyOptional({ example: 'Custom prints available on request. Contact us to design yours.', description: 'Note shown on the product page when isCustomizable is true' })
  @IsOptional()
  @IsString()
  customizationNote?: string;

  @ApiProperty({ type: [CreateProductVariantDto], description: 'Product variants (size, SKU, price, stock)' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductVariantDto)
  variants: CreateProductVariantDto[];
}
