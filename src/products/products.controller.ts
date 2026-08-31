import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get('featured')
  async findFeatured(@Query('limit') limit?: number) {
    return this.productsService.findFeatured(limit ? Number(limit) : 8);
  }

  @Get('new-arrivals')
  async findNewArrivals(@Query('limit') limit?: number) {
    return this.productsService.findNewArrivals(limit ? Number(limit) : 8);
  }

  @Get('search')
  async search(@Query('q') q?: string, @Query('limit') limit?: number) {
    return this.productsService.findAll({ search: q, limit: limit ? Number(limit) : 20 });
  }

  @Get(':slug')
  async findOneBySlug(@Param('slug') slug: string) {
    return this.productsService.findOneBySlug(slug);
  }

  @Get()
  async findAll(
    @Query('search') search?: string,
    @Query('category') categorySlug?: string,
    @Query('minPrice') minPrice?: number,
    @Query('maxPrice') maxPrice?: number,
    @Query('sizes') sizes?: string | string[],
    @Query('sort') sort?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    let parsedSizes: string[] = [];
    if (sizes) {
      parsedSizes = Array.isArray(sizes) ? sizes : sizes.split(',');
    }
    return this.productsService.findAll({
      search,
      categorySlug,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      sizes: parsedSizes,
      sort,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post()
  async create(@Body() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() updateProductDto: UpdateProductDto) {
    return this.productsService.update(id, updateProductDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.productsService.remove(id);
    return { success: true, message: 'Product deleted successfully' };
  }
}
