# Key Flows

## Guest Checkout (Transactional)

```mermaid
sequenceDiagram
    participant FE as Checkout Wizard
    participant API as OrdersController
    participant SVC as OrdersService
    participant DB as Database (transaction)

    FE->>API: POST /orders (customer, address, items)
    API->>SVC: CreateOrderDto (validated)
    SVC->>DB: BEGIN
    SVC->>SVC: Auto-create CUSTOMER user if email new
    loop each item
        SVC->>DB: Validate product active + variant + stock
        SVC->>DB: Decrement variant stock
        SVC->>DB: Snapshot line item (name, sku, size, price)
    end
    SVC->>SVC: subtotal = Σ price×qty
    SVC->>SVC: shipping = ₹150 (free ≥ ₹5000), discount = 0
    SVC->>DB: INSERT order + items, COMMIT
    API-->>FE: Created order (SW-YYYYMMDD-####)
```

Any failure (validation, insufficient stock) rolls back the entire transaction — stock is never partially decremented.

## Order Lifecycle

```mermaid
stateDiagram-v2
    [*] --> PENDING
    PENDING --> PROCESSING
    PROCESSING --> SHIPPED
    SHIPPED --> DELIVERED
    PENDING --> CANCELLED
    PROCESSING --> CANCELLED
    CANCELLED --> PENDING: un-cancel (re-deducts stock)
```

- **Cancel** (`PATCH /admin/orders/:id/status` with `CANCELLED`): restores variant stock.
- **Un-cancel**: re-deducts stock; fails with 400 if insufficient.
- Payment status updated independently via `PATCH /admin/orders/:id/payment-status`.

## Admin Auth Flow

```mermaid
sequenceDiagram
    participant FE as AdminLogin
    participant BE as Backend

    FE->>BE: POST /auth/login {email, password}
    BE->>BE: bcrypt compare
    BE-->>FE: { accessToken } (JWT, 1d)
    FE->>FE: Store token in localStorage
    Note over FE: authInterceptor attaches<br/>Bearer token to every request
    FE->>BE: GET /admin/orders (Bearer token)
    BE->>BE: JwtStrategy re-fetches user from DB
    BE->>BE: RolesGuard checks @Roles('ADMIN')
    BE-->>FE: 200 data (or 401/403)
```

## Image Upload Pipeline

```mermaid
flowchart LR
    A[Admin selects file] --> B[ImageUploadService<br/>validate: JPG/PNG/WEBP ≤5MB]
    B --> C[Canvas resize<br/>max 1600px]
    C --> D[WebP compress 82%<br/>JPEG fallback]
    D --> E[Base64 data URL]
    E --> F[POST/PATCH /products<br/>20MB body limit]
    F --> G["@IsImageDataUrl<br/>JPEG/PNG/WEBP ≤10MB, max 5"]
    G --> H[(stored as simple-json)]
```

No multipart/file storage — images are embedded as base64 data URLs in the product row.

## Cart State Flow (Frontend)

```mermaid
flowchart LR
    A[ProductDetail /<br/>ProductCard quick-add] --> B[CartService.addItem<br/>stock-validated]
    B --> C[(localStorage 'cart')]
    C --> D[items$ BehaviorSubject]
    D --> E[CartDrawer / CartPage]
    E --> F[Checkout wizard]
    F --> G[POST /orders]
    G --> H[Clear cart → /order/:orderNumber]
```
