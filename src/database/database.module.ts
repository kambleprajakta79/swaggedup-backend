import { Module } from '@nestjs/common';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { Category } from '../categories/entities/category.entity';
import { Product } from '../products/entities/product.entity';
import { ProductVariant } from '../products/entities/product-variant.entity';
import { Order } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { Otp } from '../auth/entities/otp.entity';
import { Wishlist } from '../wishlist/entities/wishlist.entity';
import { Payment } from '../payments/entities/payment.entity';
import { Banner } from '../banners/entities/banner.entity';
import { SeederService } from './seeder.service';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config();

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: (): TypeOrmModuleOptions => {
        const dbType = process.env.DB_TYPE || 'sqlite';
        const entities = [User, Category, Product, ProductVariant, Order, OrderItem, Otp, Wishlist, Payment, Banner];
        const migrations = [path.join(__dirname, 'migrations', '*{.ts,.js}')];

        if (dbType === 'mysql') {
          return {
            type: 'mysql',
            host: process.env.DB_HOST,
            port: parseInt(process.env.DB_PORT || '3306', 10),
            username: process.env.DB_USERNAME,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_DATABASE,
            // Optional TLS (set DB_SSL=true for Oracle HeatWave / managed MySQL
            // with "Require Secure Client Connections" enabled)
            ...(process.env.DB_SSL === 'true' ? { ssl: { rejectUnauthorized: false } } : {}),
            entities,
            migrations,
            migrationsRun: true,
            synchronize: false,
            logging: false,
          } as unknown as TypeOrmModuleOptions;
        } else {
          return {
            type: 'better-sqlite3',
            database: process.env.DB_DATABASE || 'database.sqlite',
            entities,
            migrations,
            migrationsRun: true,
            synchronize: false,
            logging: false,
          } as unknown as TypeOrmModuleOptions;
        }
      },
    }),
    TypeOrmModule.forFeature([User, Category, Product, ProductVariant, Banner]),
  ],
  providers: [SeederService],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
