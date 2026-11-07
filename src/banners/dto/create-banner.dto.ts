import { IsBoolean, IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBannerDto {
  @ApiProperty({ example: 'Festive Season Sale', description: 'Banner headline' })
  @IsNotEmpty({ message: 'Title is required' })
  @IsString()
  @MinLength(2, { message: 'Title must be at least 2 characters' })
  title: string;

  @ApiPropertyOptional({ example: 'Up to 40% off on all shirts' })
  @IsOptional()
  @IsString()
  subtitle?: string;

  @ApiPropertyOptional({ description: 'Banner image (base64 data-URL or URL)' })
  @IsOptional()
  @IsString()
  image?: string;

  @ApiPropertyOptional({ example: '/shop?category=festive', description: 'In-app link the banner navigates to' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  link?: string;

  @ApiPropertyOptional({ example: 1, description: 'Lower value = shown earlier in the carousel' })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
