# SwaggedUp E-Commerce — Feature Roadmap & Implementation Plan

> Master documentation for turning the SwaggedUp menswear storefront into a complete, production-ready e-commerce platform.
> Stack: **NestJS + TypeORM** (better-sqlite3 dev / MySQL prod) backend · **Angular 17 standalone** frontend.
>
> Decisions: **Razorpay** payments · **OTP-based customer auth** · **WhatsApp Cloud API** notifications · **Brevo SMTP** mail.

---

## Table of Contents

1. [Feature 1 — Customer Accounts & Checkout Auth](#feature-1--customer-accounts--checkout-auth)
2. [Feature 2 — Admin RBAC](#feature-2--admin-rbac)
3. [Feature 3 — Customizable Print Products](#feature-3--customizable-print-products)
4. [Feature 4 — Swagger API Documentation](#feature-4--swagger-api-documentation)
5. [Feature 5 — Razorpay Payment Gateway](#feature-5--razorpay-payment-gateway)
6. [Feature 6 — WhatsApp Integration](#feature-6--whatsapp-integration)
7. [Feature 7 — Transactional Mail (Brevo)](#feature-7--transactional-mail-brevo)
8. [Environment Variables](#environment-variables)
9. [Implementation Phases](#implementation-phases)
10. [API Endpoint Inventory](#api-endpoint-inventory)
11. [Security Notes](#security-notes)
12. [Testing Checklist](#testing-checklist)
13. [Future Scope (Excluded)](#future-scope-excluded)

---

## Feature 1 — Customer Accounts & Checkout Auth

**Goal:** Customers get real accounts. At checkout, entering an email either logs them in (if existing) or creates a verified account via OTP. Returning customers see order history, wishlist, and profile.

### Current state
- `OrdersService.create` already auto-creates a `CUSTOMER` user with a random password (customer cannot log in).
- No register/login endpoint for customers; no account UI; wishlist is localStorage-only; orders have no `userId` link.

### Design

#### Auth flow (OTP-based)
```
Register:  POST /auth/register {email, name, phone, password?}
           → creates user (isVerified=false) + 6-digit OTP emailed via Brevo
Verify:    POST /auth/verify-otp {email, code}
           → isVerified=true → returns JWT (customer logged in)
Resend:    POST /auth/resend-otp {email}
Login:     POST /auth/login {email, password} (existing endpoint, now also for customers)
Forgot:    POST /auth/forgot-password {email} → OTP email
Reset:     POST /auth/reset-password {email, code, newPassword}
```

#### Checkout integration
- If email matches an existing **verified** customer → prompt "login or continue as guest".
- If email is new → auto-create customer, send OTP, verify inline (the empty `src/checkout/dto/verify-otp.dto.ts` slot gets used here).
- Guest checkout remains fully supported.

#### Data model changes
| Entity | Change |
|---|---|
| `User` | + `name` (nullable), `phone` (nullable), `isVerified` (bool, default false) |
| `Order` | + `userId` FK (nullable — guest orders keep email only) |
| `Otp` (new) | `id`, `email`, `codeHash`, `purpose` (REGISTER / RESET_PASSWORD / CHECKOUT_VERIFY), `expiresAt` (10 min), `consumedAt`, `attempts` |
| `Wishlist` (new) | `id`, `userId` (unique with productId), `productId`, `createdAt` |

#### New endpoints
| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/auth/register` | public | Create customer + send OTP |
| POST | `/auth/verify-otp` | public | Verify OTP → JWT |
| POST | `/auth/resend-otp` | public | Resend OTP (rate-limited) |
| POST | `/auth/forgot-password` | public | Send reset OTP |
| POST | `/auth/reset-password` | public | Reset with OTP |
| GET | `/auth/profile` | customer | Profile details |
| PATCH | `/auth/profile` | customer | Update name/phone |
| GET | `/orders/mine` | customer | Order history |
| GET | `/wishlist` | customer | My wishlist |
| POST | `/wishlist/:productId` | customer | Add |
| DELETE | `/wishlist/:productId` | customer | Remove |

#### Frontend
- New pages: `/login`, `/register` (with OTP step), `/account` (profile), `/account/orders`, `/account/wishlist`.
- Checkout: email detection → login prompt / inline OTP; logged-in users get prefilled details.
- On login, migrate localStorage wishlist (`swaggedup_wishlist`) to the server.

---

## Feature 2 — Admin RBAC

**Goal:** One admin login with role-based access; admins can manage other users' roles.

### Roles
| Role | Access |
|---|---|
| `ADMIN` | Everything, incl. user management, role assignment |
| `MANAGER` (new) | Products, categories, orders, inventory — no user management |
| `CUSTOMER` | Storefront account features only |

### Design
- Backend: keep flat string roles; add hierarchy in `RolesGuard` (ADMIN passes any admin-level check). Protect admin routes with `@Roles('ADMIN', 'MANAGER')` where appropriate; user management stays `@Roles('ADMIN')`.
- New admin endpoints (ADMIN only): `GET /admin/users`, `PATCH /admin/users/:id/role`.
- Frontend: split `authGuard` into `adminGuard` (ADMIN/MANAGER) and `customerGuard`; admin layout hides user-management for MANAGER.

---

## Feature 3 — Customizable Print Products

**Goal:** Admin marks a product as "customizable print" when creating it; the storefront shows a badge + "Contact SwaggedUp" CTA on the product detail page.

### Design
- `Product` entity: + `isCustomizable` (bool, default false), `customizationNote` (text, nullable — e.g. "Custom prints available on request").
- Admin product form: checkbox + note field.
- Product detail page: "Customizable Print" badge + WhatsApp click-to-chat CTA (`wa.me/<number>?text=Hi, I want a custom print on <product>`) + note display.
- Product list cards: small badge icon for customizable items.

---

## Feature 4 — Swagger API Documentation

**Goal:** Interactive API docs at `/api/docs` for frontend development and third-party integration.

### Design
- Install `@nestjs/swagger`.
- `main.ts`: `DocumentBuilder` with title "SwaggedUp API", bearer-auth scheme, `SwaggerModule.setup('api/docs')`.
- Annotate every controller (`@ApiTags`, `@ApiOperation`, `@ApiBearerAuth` on guarded routes) and every DTO (`@ApiProperty`).
- Swagger UI available in all non-production environments.

---

## Feature 5 — Razorpay Payment Gateway

**Goal:** Online payments (UPI/cards/netbanking) alongside COD, with verified signatures.

### Flow
```
1. Customer places order (POST /orders, paymentMethod=ONLINE, paymentStatus=PENDING)
2. Backend: POST /payments/create/:orderId → Razorpay Order via SDK → returns {razorpayOrderId, keyId, amount}
3. Frontend: opens Razorpay Checkout.js → customer pays → handler gets {razorpay_payment_id, razorpay_order_id, razorpay_signature}
4. Frontend: POST /payments/verify {orderId, paymentId, signature}
   Backend verifies HMAC SHA256 signature with RAZORPAY_KEY_SECRET → paymentStatus=PAID
5. Webhook (backup): POST /payments/webhook (payment.captured) → verify webhook secret → mark PAID (idempotent)
```

### Design
- New `PaymentsModule` + `Payment` entity (`orderId`, `razorpayOrderId`, `razorpayPaymentId`, `amount`, `status`, raw payload).
- `Order.paymentMethod` extended: `COD` | `ONLINE`.
- Frontend checkout step 4: payment method selector; loads `https://checkout.razorpay.com/v1/checkout.js`.
- Test mode keys during development.

---

## Feature 6 — WhatsApp Integration

**Goal:** Full notifications to customers via WhatsApp Cloud API + click-to-chat CTAs.

### Design
- `WhatsAppModule` + `whatsapp.service.ts` → Meta Graph API `POST https://graph.facebook.com/v21.0/{WHATSAPP_PHONE_ID}/messages`.
- **Template messages** (pre-approved by Meta):
  - `order_placed` — sent on successful order creation
  - `order_shipped` — sent when status → SHIPPED
  - `order_delivered` — sent when status → DELIVERED
- Hooks in `OrdersService.create` and `OrdersService.updateStatus`.
- Click-to-chat: "Order on WhatsApp" button on product detail + customization CTA (Feature 3).
- Requires: Meta Business app, phone number ID, permanent access token, template approval (⚠️ start this early — approval takes days).

---

## Feature 7 — Transactional Mail (Brevo)

**Goal:** Fill the empty `src/mail/` module with a production mail service.

### Design
- `MailService` using nodemailer SMTP → `smtp-relay.brevo.com:587`, auth with `BREVO_SMTP_KEY`.
- HTML templates (simple, inline-styled): `order-confirmation`, `otp-verification`, `password-reset`, `order-status-update`.
- Wired into: order creation, OTP send, password reset, status changes.
- Fail-safe: mail errors are logged, never block the main flow.

---

## Environment Variables

| Variable | Feature | Notes |
|---|---|---|
| `JWT_SECRET` | Auth | existing |
| `CORS_ORIGIN` | — | existing |
| `MAIL_HOST` / `MAIL_PORT` / `MAIL_USER` / `MAIL_PASS` | Mail | Brevo: `smtp-relay.brevo.com` / `587` / `your-email` / `BREVO_SMTP_KEY` |
| `MAIL_FROM` | Mail | e.g. `SwaggedUp <no-reply@swaggedup.com>` |
| `OTP_EXPIRY_MINUTES` | Auth | default 10 |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Payments | from Razorpay dashboard |
| `RAZORPAY_WEBHOOK_SECRET` | Payments | webhook signature verification |
| `WHATSAPP_TOKEN` | WhatsApp | Meta permanent access token |
| `WHATSAPP_PHONE_ID` | WhatsApp | Meta phone number ID |
| `WHATSAPP_BUSINESS_NUMBER` | WhatsApp | display number for wa.me links |
| `FRONTEND_URL` | Mail/WhatsApp | for links in messages |

---

## Implementation Phases

| Phase | Contents | Depends on |
|---|---|---|
| **0** | This roadmap + `.env.example` + known-gaps update | — |
| **1** | Swagger (1a) · Mail module (1b) · RBAC (1c) — parallelizable | 0 |
| **2** | Customer auth (OTP), profile, order history, server wishlist | 1b |
| **3** | Customizable print flag (backend + admin + storefront) | 1 |
| **4** | Razorpay payments | 2 |
| **5** | WhatsApp Cloud API notifications | 1b (pattern), Meta approval |

---

## API Endpoint Inventory

### Auth (`/auth`)
`POST /login` · `GET /me` · `POST /register` · `POST /verify-otp` · `POST /resend-otp` · `POST /forgot-password` · `POST /reset-password` · `GET /profile` · `PATCH /profile`

### Products (`/products`)
`GET /` (public list, filters) · `GET /:slug` (public) · `POST /` (ADMIN) · `PATCH /:id` (ADMIN) · `DELETE /:id` (ADMIN)

### Categories (`/categories`)
`GET /` · `GET /:slug` · `POST /` (ADMIN) · `PATCH /:id` (ADMIN) · `DELETE /:id` (ADMIN)

### Orders (`/orders`)
`POST /` (public checkout) · `GET /:orderNumber` (public tracking) · `GET /mine` (customer)

### Admin Orders (`/admin/orders`)
`GET /dashboard/stats` · `GET /` · `GET /:id` · `PATCH /:id/status` · `PATCH /:id/payment-status` (ADMIN/MANAGER)

### Admin Users (`/admin/users`) — new
`GET /` · `PATCH /:id/role` (ADMIN only)

### Wishlist (`/wishlist`) — new
`GET /` · `POST /:productId` · `DELETE /:productId` (customer)

### Payments (`/payments`) — new
`POST /create/:orderId` · `POST /verify` · `POST /webhook`

---

## Security Notes

- OTPs: hashed (bcrypt), 10-min expiry, max 5 attempts, rate-limited resend (1/min).
- JWT payload stays minimal (`id, email, role`); role re-checked server-side on every guarded route.
- Razorpay: signature + webhook secret verification, idempotent status updates.
- Mail/WhatsApp failures never break order flow (logged only).
- `ValidationPipe` whitelist+transform already global; keep DTO validation strict on all new endpoints.

---

## Testing Checklist

- [ ] Swagger UI renders all endpoints with bearer auth at `/api/docs`
- [ ] Register → OTP email received → verify → login → JWT works on `/auth/me`
- [ ] Checkout with logged-in customer → order appears in `/account/orders`
- [ ] Guest checkout still works; order not linked to any user
- [ ] Wishlist persists across devices after login
- [ ] MANAGER role can edit products but gets 403 on `/admin/users`
- [ ] Admin toggles `isCustomizable` → badge + WhatsApp CTA on product detail
- [ ] Razorpay test payment → `paymentStatus=PAID`; tampered signature rejected
- [ ] Order status change → WhatsApp template + status email received
- [ ] `npm test` (backend) and `ng build` (frontend) pass

---

## Future Scope (Excluded)

Refunds UI · coupons/discounts · product reviews · invoice PDFs · multi-language · inventory low-stock alerts · analytics dashboard beyond current stats.
