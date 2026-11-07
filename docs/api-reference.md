# API Reference

Base URL: `http://localhost:3000` (dev) · `https://swaggedup-backend.onrender.com` (prod)

**Auth levels**: Public (no token) · JWT (`Authorization: Bearer <token>`) · ADMIN (JWT + ADMIN role)

**Error format** (all errors): `{ "success": false, "message": "…", "statusCode": <int> }`

## Root

| Method | Path      | Auth   | Response                          |
| ------ | --------- | ------ | --------------------------------- |
| GET    | `/`       | Public | `{ message: "Hello World!" }`      |
| GET    | `/health` | Public | `{ status: "ok" }`                |

## Auth

### POST `/auth/login` — Public

Request: `{ "email": "user@example.com", "password": "secret" }` (email must be valid; password min 6 chars)

Response: `{ "accessToken": "<jwt>" }` — token expires in 1 day, signed with `{ id, email, role }`.

Errors: `401` "Invalid credentials" (wrong email/password).

### GET `/auth/me` — JWT

Response: `{ "id": number, "email": "string", "role": "ADMIN" | "CUSTOMER" }`

## Categories

### GET `/categories` — Public

Response: `{ "categories": [...], "total": number, "page": number, "limit": number }`

### GET `/categories/:slug` — Public

Response: category entity (with related products). Errors: `404` if not found.

### POST `/categories` — ADMIN

Request: `{ "name": "Shirts" }` — optional: `slug`, `description`, `image` (strings). Slug auto-generated from name if omitted; `409` if slug already exists.

### PATCH `/categories/:id` — ADMIN

Partial update, same fields (all optional).

### DELETE `/categories/:id` — ADMIN

Soft delete. Products referencing the category cascade-delete.

## Products

### GET `/products` — Public

Query params:

| Param       | Type   | Notes                                              |
| ----------- | ------ | -------------------------------------------------- |
| `search`    | string | LIKE match on name/description/brand               |
| `category`  | string | Category slug                                      |
| `minPrice` / `maxPrice` | number | Price range (variant prices)             |
| `sizes`    | string | Comma-separated or repeated (`sizes=S,M` or `sizes=S&sizes=M`) |
| `sort`     | string | `price_asc` \| `price_desc` \| `newest` (default) \| `name_asc` \| `name_desc` |
| `page` / `limit` | number | Pagination                                    |

Response: `{ "products": [...], "total": number, "page": number, "limit": number }` — each product includes `variants` and `category`.

### GET `/products/featured?limit=` — Public
### GET `/products/new-arrivals?limit=` — Public
### GET `/products/search?q=&limit=` — Public

LIKE search on name/description/brand. Response: array of products.

### GET `/products/:slug` — Public

Response: product with `variants` and `category`. Errors: `404`.

### POST `/products` — ADMIN

Request (`CreateProductDto`):

```jsonc
{
  "name": "Oxford Shirt",            // required
  "basePrice": 2999,                 // required, ≥ 0
  "categoryId": 1,                   // required
  "description": "…", "brand": "…", "material": "…", "color": "…",  // optional
  "images": ["data:image/webp;base64,…"],  // optional, max 5; JPEG/PNG/WEBP data URLs ≤10MB each
  "variants": [                      // required, ≥ 1
    { "sku": "OXF-S-BLU", "size": "S", "price": 2999, "stock": 10 }
  ]
}
```

Slug auto-generated (name + random 4-digit suffix); SKU must be unique (`409`). Response: created product.

### PATCH `/products/:id` — ADMIN

Same shape, all fields optional. **Variant sync**: variants without `id` are inserted, with `id` updated, missing ones deleted.

### DELETE `/products/:id` — ADMIN

Soft delete.

## Orders (Storefront)

### POST `/orders` — Public (guest checkout)

Request (`CreateOrderDto`):

```jsonc
{
  "customerName": "…", "customerEmail": "…", "customerPhone": "…",  // required
  "addressLine1": "…", "addressLine2": "…", "city": "…", "state": "…",
  "postalCode": "…", "country": "…",                                // required (line2 optional)
  "paymentMethod": "COD",          // optional, default COD
  "items": [                       // required, min 1
    { "productId": 1, "productVariantId": 3, "quantity": 2 }  // quantity: int ≥ 1
  ]
}
```

Behavior (single DB transaction):
1. Auto-creates a `CUSTOMER` user for a new email (random password).
2. Validates each item: product active, variant belongs to product, sufficient stock.
3. Decrements variant stock; snapshots line items (name, SKU, size, price).
4. Shipping: flat ₹150, **free ≥ ₹5000**; discount hardcoded 0.
5. Order number format: `SW-YYYYMMDD-####`.

Response: created order with items. Errors: `400` (validation/insufficient stock) — stock changes rolled back.

### GET `/orders/:orderNumber` — Public

Response: order with items. Errors: `404`. Note: unauthenticated — anyone with the order number can view it.

## Admin Orders — all ADMIN

| Method | Path                                | Description                                        |
| ------ | ----------------------------------- | -------------------------------------------------- |
| GET    | `/admin/orders/dashboard/stats`     | totalOrders, totalRevenue (PAID only), pendingOrders, recentOrders (5), totalProducts, lowStockProducts (≤5) + details |
| GET    | `/admin/orders`                     | All orders                                         |
| GET    | `/admin/orders/:id`                 | One order                                          |
| PATCH  | `/admin/orders/:id/status`          | Body: `{ "status": "PENDING" \| "PROCESSING" \| "SHIPPED" \| "DELIVERED" \| "CANCELLED" }` |
| PATCH  | `/admin/orders/:id/payment-status`  | Body: `{ "paymentStatus": "PENDING" \| "PAID" \| "FAILED" \| "REFUNDED" }` |

Status side effects: cancelling restores stock; un-cancelling re-deducts (fails if insufficient).

## Enums

- **OrderStatus**: `PENDING`, `PROCESSING`, `SHIPPED`, `DELIVERED`, `CANCELLED`
- **PaymentStatus**: `PENDING`, `PAID`, `FAILED`, `REFUNDED`
- **Roles**: `ADMIN`, `CUSTOMER`
- **Product sort**: `price_asc`, `price_desc`, `newest`, `name_asc`, `name_desc`
