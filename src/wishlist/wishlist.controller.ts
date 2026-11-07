import { Controller, Get, Post, Delete, Param, UseGuards, Request, ParseIntPipe, Body } from '@nestjs/common';
import { WishlistService } from './wishlist.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody } from '@nestjs/swagger';

@ApiTags('wishlist')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('wishlist')
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @ApiOperation({ summary: 'Get my wishlist products' })
  @Get()
  async getWishlist(@Request() req: any) {
    return this.wishlistService.getWishlist(req.user.id);
  }

  @ApiOperation({ summary: 'Add a product to my wishlist' })
  @Post(':productId')
  async add(@Request() req: any, @Param('productId', ParseIntPipe) productId: number) {
    return this.wishlistService.add(req.user.id, productId);
  }

  @ApiOperation({ summary: 'Remove a product from my wishlist' })
  @Delete(':productId')
  async remove(@Request() req: any, @Param('productId', ParseIntPipe) productId: number) {
    return this.wishlistService.remove(req.user.id, productId);
  }

  @ApiOperation({ summary: 'Merge local wishlist product IDs into my account (on login)' })
  @ApiBody({ schema: { type: 'object', properties: { productIds: { type: 'array', items: { type: 'number' } } } } })
  @Post('merge')
  async merge(@Request() req: any, @Body('productIds') productIds: number[]) {
    const products = await this.wishlistService.merge(req.user.id, productIds || []);
    return { products };
  }
}
