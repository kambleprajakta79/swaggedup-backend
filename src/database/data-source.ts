import { DataSource } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Category } from '../categories/entities/category.entity';
import { Product } from '../products/entities/product.entity';
import { ProductVariant } from '../products/entities/product-variant.entity';
import { Order } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { Otp } from '../auth/entities/otp.entity';
import { Wishlist } from '../wishlist/entities/wishlist.entity';
import { Payment } from '../payments/entities/payment.entity';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env
dotenv.config();

const dbType = process.env.DB_TYPE || 'sqlite';

const entities = [User, Category, Product, ProductVariant, Order, OrderItem, Otp, Wishlist, Payment];

export const AppDataSource = new DataSource(
  dbType === 'mysql'
    ? {
        type: 'mysql',
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT || '3306', 10),
        username: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE,
        entities,
        migrations: [path.join(__dirname, 'migrations', '*{.ts,.js}')],
        synchronize: false,
        logging: false,
      }
    : {
        type: 'better-sqlite3',
        database: process.env.DB_DATABASE || 'database.sqlite',
        entities,
        migrations: [path.join(__dirname, 'migrations', '*{.ts,.js}')],
        synchronize: false,
        logging: false,
      }
);
