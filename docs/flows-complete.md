# SwaggedUp — Complete Flow Documentation

Last verified: 2026-11-07 (full E2E pass on desktop + mobile 390px)

## 1. Customer Flows

### 1.1 Registration (OTP-based)
```
/register → details form (name, email, phone, password)
  → POST /auth/register        → creates unverified CUSTOMER + emails 6-digit OTP
  → OTP step → POST /auth/verify-otp {email, code, password}
  → email verified, password set (hashed), JWT returned → auto-login → /account
```
- OTP: 6-digit, bcrypt-hashed, 10-min expiry, max 5 attempts, 60s resend cooldown.
- **Dev only**: code `111111` is accepted when `NODE_ENV !== 'production'`. Never works in production.
- Re-registering an unverified email just re-sends the OTP (password is set at verify).
- Verified emails get 409 Conflict.

### 1.2 Login (password)
```
/login → POST /auth/login {email, password} → JWT → returnUrl or /account
```
- Unverified accounts are rejected with "Please verify your email before logging in".
- Rate limited: 10 attempts/min/IP.

### 1.3 Forgot / Reset password
```
/login → "Forgot password?" → POST /auth/forgot-password {email} → OTP emailed
→ POST /auth/reset-password {email, code, newPassword} → login with new password
```

### 1.4 Browse & search
```
/ (home) → banner carousel (admin-managed), category showcase, featured, new arrivals
/shop → filters: category, price, size, sort; pagination; search box → /products/search?q=
/shop/:slug → product detail: gallery, size/variant selection, stock-aware qty, related pieces
```

### 1.5 Cart & wishlist
- Cart: localStorage-backed (`cart`), drawer + /cart page, qty +/-, stock-capped.
- Wishlist: heart on product cards; guests → localStorage (`swaggedup_wishlist`), logged-in → server.
  On login, local wishlist merges to server via `POST /wishlist/merge`.

### 1.6 Checkout (guest or logged-in)
```
/cart → PROCEED TO CHECKOUT → /checkout (4 steps)
  1. Customer info (prefilled if logged in; guests allowed)
  2. Shipping address
  3. Shipping method
  4. Payment: COD or Razorpay (UPI/card/netbanking)
→ POST /orders → order number SW-YYYYMMDD-XXXX
→ COD: order confirmed immediately
→ Razorpay: checkout.js popup → POST /payments/verify → payment marked PAID
→ /order/:orderNumber confirmation page; email confirmation (if mail configured)
```
- Empty cart redirects to /shop (intended guard).

### 1.7 Account
```
/account (customerGuard) → tabs: Profile (PATCH /auth/profile), Order History, Wishlist
/order/:orderNumber → tracking timeline (PLACED → CONFIRMED → SHIPPED → DELIVERED)
```

## 2. Admin Flows (`/admin`, adminGuard: ADMIN or MANAGER)

### 2.1 Admin login
```
/admin/login (guestGuard) → POST /auth/login → role check → /admin/dashboard
```
- Seeded credentials (dev): admin@swaggedup.com / admin123 — **change before going live**.

### 2.2 Dashboard
- Stats: revenue, orders, products, low-stock alerts (GET /admin/orders/stats).

### 2.3 Products
- CRUD with variants (size/price/stock), featured/new-arrival flags.
- Images: file upload → client-side resize to 1600px → WebP base64 → stored in DB (max 5).

### 2.4 Categories
- CRUD; image via file upload (same pipeline). Slug auto-generated.

### 2.5 Banners (homepage carousel)
- CRUD: title, subtitle, link, sortOrder, isActive, image upload.
- `GET /banners` (public) returns only active banners ordered by sortOrder.
- HIDE/SHOW toggle takes effect immediately on the homepage.

### 2.6 Orders
- List all orders; inline payment-status select (PENDING/PAID/FAILED/REFUNDED).
- Order detail modal → update order status (CONFIRMED/SHIPPED/DELIVERED...).

### 2.7 Inventory
- Variant-level stock rows with filters; update stock inline.

## 3. Auth & Security Model
- JWT Bearer tokens, payload `{id, email, role}`, 1-day expiry, secret from `JWT_SECRET`
  (hard-fails at boot in production if missing).
- Roles: ADMIN > MANAGER > CUSTOMER (hierarchical RolesGuard on admin endpoints).
- JWT validation re-fetches the user from DB → role changes take effect immediately.
- Rate limiting: global 100 req/min/IP (1000 in dev); login 10/min, register 5/min.
- Helmet security headers on all responses.
- OTPs: hashed, single-use, expiring, attempt-capped; dummy `111111` dev-only.
- Passwords: bcrypt (cost 10). Registration password is set only after email verification.

## 4. Data Model (key tables)
`users` (role, isVerified) · `categories` (image) · `products` (images JSON, basePrice)
· `product_variants` (sku, size, price, stock) · `orders` + `order_items` · `payments`
· `otps` (email, purpose, codeHash, attempts) · `wishlists` · `banners` · `addresses`

## 5. Integrations
- **Mail (SMTP)**: OTP + order emails; silently skipped if MAIL_* unset (dev OK, prod MUST set).
- **Razorpay**: online payments + webhook verification; disabled with 400 if keys unset.
- **WhatsApp**: order notifications (optional; WHATSAPP_* env vars).
