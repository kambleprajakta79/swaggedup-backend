import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Category } from '../categories/entities/category.entity';
import { Product } from '../products/entities/product.entity';
import { ProductVariant } from '../products/entities/product-variant.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class SeederService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(ProductVariant)
    private readonly variantRepository: Repository<ProductVariant>,
  ) {}

  async onApplicationBootstrap() {
    // Only run seeder in development or when explicitly enabled
    if (process.env.NODE_ENV === 'production' && process.env.RUN_SEEDER !== 'true') {
      console.log('Production environment detected. Skipping seeder. Set RUN_SEEDER=true to force.');
      return;
    }
    console.log('--- Starting Database Seeding Check ---');
    await this.seedAdmin();
    await this.seedCategoriesAndProducts();
    console.log('--- Database Seeding Complete ---');
  }

  private async seedAdmin() {
    const adminCount = await this.userRepository.count();
    if (adminCount === 0) {
      console.log('No admin users found. Seeding default admin user...');
      const hashedPassword = await bcrypt.hash('admin123', 10);
      const admin = this.userRepository.create({
        email: 'admin@swaggedup.com',
        password: hashedPassword,
        role: 'ADMIN',
        isVerified: true,
      });
      await this.userRepository.save(admin);
      console.log('Admin user seeded: admin@swaggedup.com');
    }
  }

  private async seedCategoriesAndProducts() {
    const categoryCount = await this.categoryRepository.count();
    if (categoryCount > 0) {
      console.log('Categories already seeded. Skipping product seeding.');
      return;
    }

    console.log('Seeding categories and premium menswear products...');

    // 1. Seed Categories
    const categoriesData = [
      { name: 'Coats & Jackets', slug: 'coats-jackets', description: 'Luxury coats, leather jackets, and outerwear.', image: 'https://images.unsplash.com/photo-1544022613-e87ca75a784a?q=80&w=800&auto=format&fit=crop' },
      { name: 'Shirts', slug: 'shirts', description: 'Premium cotton dress shirts and casual linens.', image: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?q=80&w=800&auto=format&fit=crop' },
      { name: 'T-Shirts', slug: 't-shirts', description: 'Premium Supima cotton basic and oversized tees.', image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=800&auto=format&fit=crop' },
      { name: 'Knitwear', slug: 'knitwear', description: 'Fine merino wool and cashmere knit pieces.', image: 'https://images.unsplash.com/photo-1614975058789-41316d0e2e9c?q=80&w=800&auto=format&fit=crop' },
      { name: 'Trousers', slug: 'trousers', description: 'Tailored trousers, casual chinos, and pleated pants.', image: 'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?q=80&w=800&auto=format&fit=crop' },
      { name: 'Suits & Blazers', slug: 'suits-blazers', description: 'Sartorial tailoring and double-breasted blazers.', image: 'https://images.unsplash.com/photo-1593030103066-0093718efeb9?q=80&w=800&auto=format&fit=crop' },
      { name: 'Denim', slug: 'denim', description: 'Japanese selvedge denim jeans and raw denim jackets.', image: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?q=80&w=800&auto=format&fit=crop' },
      { name: 'Accessories', slug: 'accessories', description: 'Italian leather belts, silk ties, and premium eyewear.', image: 'https://images.unsplash.com/photo-1617137968427-85924c800a22?q=80&w=800&auto=format&fit=crop' },
      { name: 'Shoes', slug: 'shoes', description: 'Handcrafted loafers, Chelsea boots, and leather sneakers.', image: 'https://images.unsplash.com/photo-1533867617858-e7b97e060509?q=80&w=800&auto=format&fit=crop' },
    ];

    const categoriesMap: { [slug: string]: Category } = {};
    for (const cData of categoriesData) {
      const category = this.categoryRepository.create(cData);
      const savedCategory = await this.categoryRepository.save(category);
      categoriesMap[savedCategory.slug] = savedCategory;
    }
    console.log('Seeded 9 categories.');

    // 2. Seed Products
    const productsData = [
      {
        name: 'Midnight Tailored Blazer',
        description: 'Meticulously crafted from 100% fine Italian virgin wool. Features structural shoulder pads, notch lapels, a double button fastening, and double vents for a timeless sartorial silhouette.',
        basePrice: 8999,
        categorySlug: 'suits-blazers',
        brand: 'SWAGGER & CO',
        material: '100% Italian Virgin Wool',
        color: 'Midnight Blue',
        images: [
          'https://images.unsplash.com/photo-1507679799987-c73779587ccf?q=80&w=800&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1555069519-03000b2f58b5?q=80&w=800&auto=format&fit=crop'
        ],
        isFeatured: true,
        isNewArrival: false,
        variantsCode: 'MNT-BLZ'
      },
      {
        name: 'Obsidian Leather Jacket',
        description: 'An iconic silhouette reconstructed in buttery-soft lambskin leather. Complete with silver-finished metal hardware, an asymmetric front zip closure, and traditional biker lapels.',
        basePrice: 12999,
        categorySlug: 'coats-jackets',
        brand: 'SWAGGER & CO',
        material: '100% Lambskin Leather',
        color: 'Obsidian Black',
        images: [
          'https://images.unsplash.com/photo-1551028719-00167b16eac5?q=80&w=800&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1618886614638-80e3c103d31a?q=80&w=800&auto=format&fit=crop'
        ],
        isFeatured: true,
        isNewArrival: true,
        variantsCode: 'OBS-JKT'
      },
      {
        name: 'Urban Oversized Shirt',
        description: 'Tailored for a relaxed, drape-like fit from organic cotton. Designed with a dropped shoulder silhouette, wide collar, and curved hem, perfect for casual layering.',
        basePrice: 2999,
        categorySlug: 'shirts',
        brand: 'SWAGGER & CO',
        material: '100% Organic Cotton',
        color: 'Off-White',
        images: [
          'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?q=80&w=800&auto=format&fit=crop'
        ],
        isFeatured: false,
        isNewArrival: true,
        variantsCode: 'URB-OVS'
      },
      {
        name: 'Classic Oxford Shirt',
        description: 'A classic wardrobe anchor spun from heavy Oxford cotton weave. Features a clean button-down collar, front chest pocket, and single-button rounded cuffs.',
        basePrice: 3499,
        categorySlug: 'shirts',
        brand: 'SWAGGER & CO',
        material: '100% Oxford Cotton',
        color: 'Celeste Blue',
        images: [
          'https://images.unsplash.com/photo-1603252109303-2751441dd157?q=80&w=800&auto=format&fit=crop'
        ],
        isFeatured: false,
        isNewArrival: false,
        variantsCode: 'CLS-OXF'
      },
      {
        name: 'Noir Straight-Fit Trousers',
        description: 'Sleek, straight-leg trousers cut from premium tropical wool blend. Features French slant pockets, button-through welt pockets at the back, and a clean hook-and-bar closure.',
        basePrice: 4499,
        categorySlug: 'trousers',
        brand: 'SWAGGER & CO',
        material: 'Wool Blend',
        color: 'Noir Black',
        images: [
          'https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?q=80&w=800&auto=format&fit=crop'
        ],
        isFeatured: true,
        isNewArrival: false,
        variantsCode: 'NOR-TRSR'
      },
      {
        name: 'Signature Wool Overcoat',
        description: 'Double-breasted overcoat crafted from an opulent virgin wool and cashmere blend. Designed with exaggerated peak lapels, deep pockets, and a rear vent for dramatic motion.',
        basePrice: 14999,
        categorySlug: 'coats-jackets',
        brand: 'SWAGGER & CO',
        material: '80% Virgin Wool / 20% Cashmere',
        color: 'Camel Brown',
        images: [
          'https://images.unsplash.com/photo-1544022613-e87ca75a784a?q=80&w=800&auto=format&fit=crop'
        ],
        isFeatured: true,
        isNewArrival: false,
        variantsCode: 'SIG-COAT'
      },
      {
        name: 'Premium Knit Polo',
        description: 'Lightweight and exceptionally breathable polo knit from ultra-fine Merino wool. Completed with a seamless three-button placket and finely ribbed trims.',
        basePrice: 3999,
        categorySlug: 'knitwear',
        brand: 'SWAGGER & CO',
        material: '100% Merino Wool',
        color: 'Forest Green',
        images: [
          'https://images.unsplash.com/photo-1614975058789-41316d0e2e9c?q=80&w=800&auto=format&fit=crop'
        ],
        isFeatured: false,
        isNewArrival: true,
        variantsCode: 'PRM-POLO'
      },
      {
        name: 'Midnight Denim Jacket',
        description: 'Constructed from heavy 14oz Japanese selvedge raw denim. Over time, it will mold and fade uniquely to your body. Accented with contrast copper stitching and metal shank buttons.',
        basePrice: 5499,
        categorySlug: 'denim',
        brand: 'SWAGGER & CO',
        material: '14oz Selvedge Denim',
        color: 'Indigo Blue',
        images: [
          'https://images.unsplash.com/photo-1611312449412-6cefac5dc3e4?q=80&w=800&auto=format&fit=crop'
        ],
        isFeatured: false,
        isNewArrival: false,
        variantsCode: 'MNT-DNM'
      },
      {
        name: 'Executive Slim Blazer',
        description: 'Impeccably tailored executive blazer structured from a luxurious wool-silk blend. Combines sleek slim contours with comfortable flexibility for modern high-profile business wear.',
        basePrice: 9999,
        categorySlug: 'suits-blazers',
        brand: 'SWAGGER & CO',
        material: 'Wool Silk Blend',
        color: 'Charcoal Grey',
        images: [
          'https://images.unsplash.com/photo-1555069519-03000b2f58b5?q=80&w=800&auto=format&fit=crop'
        ],
        isFeatured: false,
        isNewArrival: false,
        variantsCode: 'EXC-BLZ'
      },
      {
        name: 'Essential Cotton Tee',
        description: 'The ultimate luxury base layer. Knitted from ultra-soft long-staple Supima cotton that maintains its shape and rich color wash after wash.',
        basePrice: 1499,
        categorySlug: 't-shirts',
        brand: 'SWAGGER & CO',
        material: '100% Supima Cotton',
        color: 'Pure White',
        images: [
          'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=800&auto=format&fit=crop'
        ],
        isFeatured: false,
        isNewArrival: true,
        variantsCode: 'ESS-TEE'
      },
      {
        name: 'Heavyweight Oversized Tee',
        description: 'A structural, heavyweight knit jersey (300GSM) that hangs beautifully off the shoulders. Designed with wide elbows and a robust rib-bound neck.',
        basePrice: 1799,
        categorySlug: 't-shirts',
        brand: 'SWAGGER & CO',
        material: '300GSM Cotton Jersey',
        color: 'Charcoal',
        images: [
          'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?q=80&w=800&auto=format&fit=crop'
        ],
        isFeatured: false,
        isNewArrival: false,
        variantsCode: 'HVY-TEE'
      },
      {
        name: 'Cashmere Mockneck Sweater',
        description: 'Spun from pure, double-ply Mongolian cashmere. Delivers unparalleled insulation and a cloud-like skin feel, finished with an elegant mock neck collar.',
        basePrice: 7999,
        categorySlug: 'knitwear',
        brand: 'SWAGGER & CO',
        material: '100% Mongolian Cashmere',
        color: 'Oatmeal Ivory',
        images: [
          'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?q=80&w=800&auto=format&fit=crop'
        ],
        isFeatured: true,
        isNewArrival: true,
        variantsCode: 'CSH-MOCK'
      },
      {
        name: 'Pleated Dress Trousers',
        description: 'Double-pleated, high-rise trousers featuring side tab adjusters and a generous relaxed leg. Provides a sophisticated vintage drape adapted for modern styling.',
        basePrice: 4999,
        categorySlug: 'trousers',
        brand: 'SWAGGER & CO',
        material: '100% Lightweight Wool',
        color: 'Taupe',
        images: [
          'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?q=80&w=800&auto=format&fit=crop'
        ],
        isFeatured: false,
        isNewArrival: false,
        variantsCode: 'PLT-TRSR'
      },
      {
        name: 'Selvedge Slim Jeans',
        description: 'Tailored slim-fit raw selvedge denim jeans. Crafted from unwashed Japanese denim featuring clean red-line selvedge cuffs when rolled up.',
        basePrice: 5999,
        categorySlug: 'denim',
        brand: 'SWAGGER & CO',
        material: 'Japanese Selvedge Denim',
        color: 'Raw Indigo',
        images: [
          'https://images.unsplash.com/photo-1542272604-787c3835535d?q=80&w=800&auto=format&fit=crop'
        ],
        isFeatured: false,
        isNewArrival: true,
        variantsCode: 'SLV-JEAN'
      },
      {
        name: 'Suede Chelsea Boots',
        description: 'Masterfully built from plush Italian calf suede on a Goodyear-welted rubber-injected leather sole. Elasticated side panels and pull tabs ensure effortless entry.',
        basePrice: 8999,
        categorySlug: 'shoes',
        brand: 'SWAGGER & CO',
        material: 'Italian Calf Suede',
        color: 'Chocolate Brown',
        images: [
          'https://images.unsplash.com/photo-1520639888713-7851133b1ed0?q=80&w=800&auto=format&fit=crop'
        ],
        isFeatured: true,
        isNewArrival: false,
        variantsCode: 'SDE-CHLS'
      },
      {
        name: 'Handcrafted Leather Loafers',
        description: 'Traditional penny loafers cut from full-grain calfskin. Hand-painted and hand-burnished for a multi-tonal patina that matures elegantly over time.',
        basePrice: 9999,
        categorySlug: 'shoes',
        brand: 'SWAGGER & CO',
        material: 'Calfskin Leather',
        color: 'Tan Brown',
        images: [
          'https://images.unsplash.com/photo-1533867617858-e7b97e060509?q=80&w=800&auto=format&fit=crop'
        ],
        isFeatured: true,
        isNewArrival: true,
        variantsCode: 'HND-LOAF'
      },
      {
        name: 'Minimalist Leather Sneakers',
        description: 'Clean, low-top sneakers constructed with Italian Nappa leather. Featuring leather linings, waxed cotton laces, and a durable Margom rubber cupsole.',
        basePrice: 7499,
        categorySlug: 'shoes',
        brand: 'SWAGGER & CO',
        material: 'Nappa Leather',
        color: 'Ivory White',
        images: [
          'https://images.unsplash.com/photo-1549298916-b41d501d3772?q=80&w=800&auto=format&fit=crop'
        ],
        isFeatured: false,
        isNewArrival: false,
        variantsCode: 'MNM-SNKR'
      },
      {
        name: 'Classic Silk Tie',
        description: 'Italian-woven silk tie handmade in Como. Cut to a versatile 8cm width with a full self-loop lining that creates a firm, robust knot.',
        basePrice: 2499,
        categorySlug: 'accessories',
        brand: 'SWAGGER & CO',
        material: '100% Mulberry Silk',
        color: 'Burgundy Wine',
        images: [
          'https://images.unsplash.com/photo-1617137968427-85924c800a22?q=80&w=800&auto=format&fit=crop'
        ],
        isFeatured: false,
        isNewArrival: false,
        variantsCode: 'SLK-TIE'
      },
      {
        name: 'Grained Leather Belt',
        description: 'Polished calfskin leather belt with a subtle pebbled finish. Accented with a solid brass buckle in a brushed nickel finish.',
        basePrice: 2999,
        categorySlug: 'accessories',
        brand: 'SWAGGER & CO',
        material: 'Grained Calfskin Leather',
        color: 'Black',
        images: [
          'https://images.unsplash.com/photo-1624222247344-550fb8ecf7c4?q=80&w=800&auto=format&fit=crop'
        ],
        isFeatured: false,
        isNewArrival: false,
        variantsCode: 'GRN-BELT'
      },
      {
        name: 'Premium Wool Scarf',
        description: 'An incredibly soft, medium-weight scarf knit from extra-fine Merino wool. Features a subtle ribbed edge finish for simple, textured styling.',
        basePrice: 3499,
        categorySlug: 'accessories',
        brand: 'SWAGGER & CO',
        material: '100% Extra-fine Merino Wool',
        color: 'Heather Grey',
        images: [
          'https://images.unsplash.com/photo-1520903928273-0f44b2a2eed5?q=80&w=800&auto=format&fit=crop'
        ],
        isFeatured: false,
        isNewArrival: true,
        variantsCode: 'WOL-SCRF'
      }
    ];

    const sizes = ['S', 'M', 'L', 'XL'];
    const shoeSizes = ['7', '8', '9', '10'];
    const accessorySizes = ['One Size'];

    for (const pData of productsData) {
      const category = categoriesMap[pData.categorySlug];
      if (!category) continue;

      const product = this.productRepository.create({
        name: pData.name,
        description: pData.description,
        basePrice: pData.basePrice,
        categoryId: category.id,
        brand: pData.brand,
        material: pData.material,
        color: pData.color,
        images: pData.images,
        isFeatured: pData.isFeatured,
        isNewArrival: pData.isNewArrival,
        isActive: true,
        slug: pData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.floor(1000 + Math.random() * 9000),
      });

      const savedProduct = await this.productRepository.save(product);

      // Determine size array based on category
      let availableSizes = sizes;
      if (pData.categorySlug === 'shoes') {
        availableSizes = shoeSizes;
      } else if (pData.categorySlug === 'accessories') {
        availableSizes = accessorySizes;
      }

      // Add Variants
      for (const size of availableSizes) {
        // Random stock between 3 and 15, occasionally 0 to test out-of-stock scenario
        const stock = Math.random() < 0.1 ? 0 : Math.floor(Math.random() * 12) + 3;
        const variant = this.variantRepository.create({
          productId: savedProduct.id,
          sku: `SKU-${pData.variantsCode}-${size.replace(' ', '')}`.toUpperCase(),
          size,
          price: savedProduct.basePrice, // default price matches base
          stock,
        });
        await this.variantRepository.save(variant);
      }
    }

    console.log('Seeded 20 premium menswear products with corresponding size-wise variants.');
  }
}
