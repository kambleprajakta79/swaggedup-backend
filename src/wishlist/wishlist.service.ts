import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wishlist } from './entities/wishlist.entity';
import { Product } from '../products/entities/product.entity';

@Injectable()
export class WishlistService {
  constructor(
    @InjectRepository(Wishlist)
    private readonly wishlistRepository: Repository<Wishlist>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  async getWishlist(userId: number): Promise<Product[]> {
    const entries = await this.wishlistRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
    if (entries.length === 0) return [];

    const productIds = entries.map((e) => e.productId);
    const products = await this.productRepository.find({
      where: productIds.map((id) => ({ id, isActive: true })) as any,
      relations: { variants: true },
    });
    // Preserve wishlist order
    const byId = new Map(products.map((p) => [p.id, p]));
    return productIds.map((id) => byId.get(id)).filter((p): p is Product => !!p);
  }

  async add(userId: number, productId: number): Promise<{ success: true }> {
    const product = await this.productRepository.findOne({ where: { id: productId } });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    const existing = await this.wishlistRepository.findOne({ where: { userId, productId } });
    if (!existing) {
      await this.wishlistRepository.save(this.wishlistRepository.create({ userId, productId }));
    }
    return { success: true };
  }

  async remove(userId: number, productId: number): Promise<{ success: true }> {
    await this.wishlistRepository.delete({ userId, productId });
    return { success: true };
  }

  /** Merge a list of localStorage product IDs into the server wishlist (on login). */
  async merge(userId: number, productIds: number[]): Promise<Product[]> {
    for (const id of productIds) {
      const exists = await this.productRepository.findOne({ where: { id } });
      if (exists) {
        const existing = await this.wishlistRepository.findOne({ where: { userId, productId: id } });
        if (!existing) {
          await this.wishlistRepository.save(this.wishlistRepository.create({ userId, productId: id }));
        }
      }
    }
    return this.getWishlist(userId);
  }
}
