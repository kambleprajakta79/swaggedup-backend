import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Like } from 'typeorm';
import { Product } from './entities/product.entity';
import { ProductVariant } from './entities/product-variant.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(ProductVariant)
    private readonly variantRepository: Repository<ProductVariant>,
  ) {}

  async findAll(query: {
    search?: string;
    categorySlug?: string;
    minPrice?: number;
    maxPrice?: number;
    sizes?: string[];
    sort?: string;
    page?: number;
    limit?: number;
  }): Promise<{ products: Product[]; total: number; page: number; limit: number }> {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const queryBuilder = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.variants', 'variant')
      .where('product.isActive = :isActive', { isActive: true });

    if (query.search) {
      queryBuilder.andWhere(
        '(product.name LIKE :search OR product.description LIKE :search OR product.brand LIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    if (query.categorySlug) {
      queryBuilder.andWhere('category.slug = :categorySlug', { categorySlug: query.categorySlug });
    }

    if (query.minPrice !== undefined) {
      queryBuilder.andWhere('product.basePrice >= :minPrice', { minPrice: query.minPrice });
    }

    if (query.maxPrice !== undefined) {
      queryBuilder.andWhere('product.basePrice <= :maxPrice', { maxPrice: query.maxPrice });
    }

    if (query.sizes && query.sizes.length > 0) {
      // Find product IDs that have these sizes
      const sizeQuery = this.variantRepository
        .createQueryBuilder('variant')
        .select('DISTINCT variant.productId', 'productId')
        .where('variant.size IN (:...sizes)', { sizes: query.sizes });
      
      const sizeResults = await sizeQuery.getRawMany();
      const productIds = sizeResults.map((r) => r.productId);

      if (productIds.length > 0) {
        queryBuilder.andWhere('product.id IN (:...productIds)', { productIds });
      } else {
        // No products have these sizes
        return { products: [], total: 0, page, limit };
      }
    }

    // Sorting
    if (query.sort) {
      switch (query.sort) {
        case 'price_asc':
          queryBuilder.orderBy('product.basePrice', 'ASC');
          break;
        case 'price_desc':
          queryBuilder.orderBy('product.basePrice', 'DESC');
          break;
        case 'newest':
          queryBuilder.orderBy('product.createdAt', 'DESC');
          break;
        case 'name_asc':
          queryBuilder.orderBy('product.name', 'ASC');
          break;
        case 'name_desc':
          queryBuilder.orderBy('product.name', 'DESC');
          break;
        default:
          queryBuilder.orderBy('product.createdAt', 'DESC');
          break;
      }
    } else {
      queryBuilder.orderBy('product.createdAt', 'DESC');
    }

    // Take and skip for pagination
    queryBuilder.take(limit).skip(skip);

    const [products, total] = await queryBuilder.getManyAndCount();
    return { products, total, page, limit };
  }

  async findOneBySlug(slug: string): Promise<{ products: Product[]; total: number; page: number; limit: number }> {
    const product = await this.productRepository.findOne({
      where: { slug, isActive: true },
      relations: { category: true, variants: true },
    });
    if (!product) {
      throw new NotFoundException(`Product with slug "${slug}" not found`);
    }
    return { products: [product], total: 1, page: 1, limit: 1 };
  }

  async findOne(id: number): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: { id },
      relations: { category: true, variants: true },
    });
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
    return product;
  }

  async findFeatured(limit = 8): Promise<{ products: Product[]; total: number; page: number; limit: number }> {
    const [products, total] = await this.productRepository.findAndCount({
      where: { isFeatured: true, isActive: true },
      relations: { category: true, variants: true },
      take: limit,
      order: { createdAt: 'DESC' },
    });
    return { products, total, page: 1, limit };
  }

  async findNewArrivals(limit = 8): Promise<{ products: Product[]; total: number; page: number; limit: number }> {
    const [products, total] = await this.productRepository.findAndCount({
      where: { isNewArrival: true, isActive: true },
      relations: { category: true, variants: true },
      take: limit,
      order: { createdAt: 'DESC' },
    });
    return { products, total, page: 1, limit };
  }

  async create(createProductDto: CreateProductDto): Promise<Product> {
    const slug = createProductDto.slug || this.generateSlug(createProductDto.name);

    const existing = await this.productRepository.findOne({ where: { slug } });
    if (existing) {
      throw new ConflictException(`Product with slug "${slug}" already exists`);
    }

    // Verify variants SKUs are unique
    const skus = createProductDto.variants.map((v) => v.sku);
    const existingVariants = await this.variantRepository.findOne({ where: { sku: In(skus) } });
    if (existingVariants) {
      throw new ConflictException(`Variant with SKU "${existingVariants.sku}" already exists`);
    }

    const product = this.productRepository.create({
      ...createProductDto,
      slug,
    });

    return this.productRepository.save(product);
  }

  async update(id: number, updateProductDto: UpdateProductDto): Promise<Product> {
    const product = await this.findOne(id);

    if (updateProductDto.name && !updateProductDto.slug) {
      updateProductDto.slug = this.generateSlug(updateProductDto.name);
    }

    if (updateProductDto.slug && updateProductDto.slug !== product.slug) {
      const existing = await this.productRepository.findOne({ where: { slug: updateProductDto.slug } });
      if (existing && existing.id !== id) {
        throw new ConflictException(`Product with slug "${updateProductDto.slug}" already exists`);
      }
    }

    // Update product fields (excluding variants for now)
    const { variants, ...productFields } = updateProductDto;
    Object.assign(product, productFields);

    if (variants) {
      // Manage variants: update, insert, delete
      const incomingIds = variants.filter((v) => v.id).map((v) => v.id);
      
      // Delete variants not in incoming list
      await this.variantRepository
        .createQueryBuilder()
        .delete()
        .where('productId = :productId', { productId: id })
        .andWhere('id NOT IN (:...incomingIds)', { incomingIds: incomingIds.length > 0 ? incomingIds : [-1] })
        .execute();

      // Save/Update new/existing variants
      const updatedVariants: ProductVariant[] = [];
      for (const vDto of variants) {
        if (vDto.id) {
          const existingVariant = await this.variantRepository.findOne({ where: { id: vDto.id, productId: id } });
          if (existingVariant) {
            Object.assign(existingVariant, vDto);
            updatedVariants.push(await this.variantRepository.save(existingVariant));
          }
        } else {
          // New variant, verify SKU is unique
          if (vDto.sku) {
            const existingSku = await this.variantRepository.findOne({ where: { sku: vDto.sku } });
            if (existingSku) {
              throw new ConflictException(`Variant with SKU "${vDto.sku}" already exists`);
            }
          }
          const newVariant = this.variantRepository.create({
            ...vDto,
            productId: id,
          });
          updatedVariants.push(await this.variantRepository.save(newVariant));
        }
      }
      product.variants = updatedVariants;
    }

    return this.productRepository.save(product);
  }

  async remove(id: number): Promise<void> {
    const product = await this.productRepository.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
    await this.productRepository.softRemove(product);
  }

  async count(): Promise<number> {
    return this.productRepository.count();
  }

  async countLowStock(threshold = 5): Promise<number> {
    return this.variantRepository
      .createQueryBuilder('variant')
      .where('variant.stock <= :threshold', { threshold })
      .getCount();
  }

  async getLowStockProducts(threshold = 5): Promise<any[]> {
    return this.variantRepository.find({
      where: { stock: In([0, 1, 2, 3, 4, 5]) },
      relations: { product: true },
      order: { stock: 'ASC' },
    });
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '') + '-' + Math.floor(1000 + Math.random() * 9000);
  }
}
