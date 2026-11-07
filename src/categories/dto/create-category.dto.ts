import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Shirts', description: 'Category name' })
  @IsNotEmpty({ message: 'Category name is required' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'shirts', description: 'URL slug (auto-generated if omitted)' })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiPropertyOptional({ example: 'Premium formal and casual shirts' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Category image (base64 data-URL or URL)' })
  @IsOptional()
  @IsString()
  image?: string;
}
