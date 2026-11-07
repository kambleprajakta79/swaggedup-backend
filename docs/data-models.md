# Data Models

## Entity Relationship Diagram

```mermaid
erDiagram
    users {
        int id PK
        varchar email UK
        varchar password
        varchar role
        datetime createdAt
        datetime updatedAt
    }

    categories ||--o{ products : "has"

    categories {
        int id PK
        varchar name
        varchar slug UK
        text description
        varchar image
        datetime deletedAt
        datetime createdAt
        datetime updatedAt
    }

    products {
        int id PK
        varchar name
        varchar slug UK
        text description
        decimal basePrice
        int categoryId FK
        varchar brand
        varchar material
        varchar color
        simple-json images
        boolean isFeatured
        boolean isNewArrival
        boolean isActive
        datetime deletedAt
        datetime createdAt
        datetime updatedAt
    }

    products ||--o{ product_variants : "has"

    product_variants {
        int id PK
        int productId FK
        varchar sku UK
        varchar size
        decimal price
        int stock
        datetime createdAt
        datetime updatedAt
    }

    orders ||--o{ order_items : "contains"

    orders {
        int id PK
        varchar orderNumber UK
        varchar customerName
        varchar customerEmail
        varchar customerPhone
        varchar addressLine1
        varchar addressLine2
        varchar city
        varchar state
        varchar postalCode
        varchar country
        decimal subtotal
        decimal shippingAmount
        decimal discountAmount
        decimal totalAmount
        varchar status
        varchar paymentStatus
        varchar paymentMethod
        datetime createdAt
        datetime updatedAt
    }

    order_items {
        int id PK
        int orderId FK
        int productId
        int productVariantId
        varchar productName
        varchar sku
        varchar size
        int quantity
        decimal price
        decimal totalPrice
        datetime createdAt
        datetime updatedAt
    }
```

## Table Details

### `users`

| Column       | Type      | Constraints                          |
| ------------ | --------- | ------------------------------------ |
| id           | int       | PK, auto-increment                   |
| email        | varchar   | Unique                               |
| password     | varchar   | bcrypt hash, `@Exclude()` from JSON   |
| role         | varchar   | Default `'ADMIN'`; values: ADMIN, CUSTOMER |
| createdAt / updatedAt | datetime | Auto                              |

No registration endpoint — users are created by the seeder (admin) or auto-created at checkout (CUSTOMER with random password).

### `categories`

Soft delete (`deletedAt`). `slug` unique, auto-generated from `name`. OneToMany → products (cascade).

### `products`

- `basePrice` decimal(10,2); `images` stored as `simple-json` (array of base64 data URLs, max 5).
- Flags: `isFeatured`, `isNewArrival`, `isActive`.
- `slug` unique, auto-generated with random 4-digit suffix.
- Soft delete; FK `categoryId` → categories (CASCADE).
- OneToMany → `product_variants` (cascade).

### `product_variants`

- `sku` unique; `size` string (S/M/L/XL, shoe 7–10, "One Size"); `price` decimal; `stock` int default 0.
- FK `productId` → products (CASCADE).

### `orders`

- `orderNumber` unique, format `SW-YYYYMMDD-####`.
- `status`: PENDING → PROCESSING → SHIPPED → DELIVERED (+ CANCELLED).
- `paymentStatus`: PENDING, PAID, FAILED, REFUNDED. `paymentMethod` default `'COD'`.
- Money columns decimal(10,2): subtotal, shippingAmount, discountAmount, totalAmount.

### `order_items` — Snapshot Pattern

Line items **snapshot** product data at purchase time (`productName`, `sku`, `size`, `price`, `totalPrice`) plus `productId`/`productVariantId` references. Historical orders remain accurate even if products are later modified or deleted.

## Migration & Seeding

- Schema managed only via migrations (`synchronize: false`, `migrationsRun: true`). Current: `1787303731806-InitialSchema.ts`.
- Seeder (on bootstrap; prod requires `RUN_SEEDER=true`): admin user (`admin@swaggedup.com` / `admin123` — dev only), 9 categories, 20 demo products with variants and randomized stock (some zero-stock for demo).
