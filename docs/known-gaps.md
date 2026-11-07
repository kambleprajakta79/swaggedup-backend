# Known Gaps & Roadmap

This project is functional but has documented limitations. Items are grouped by area; none are blockers for local development.

## Backend

### Empty scaffolding (no code)
- `src/addresses/` — empty `dto/` and `entities/` folders; no module/controller/service.
- `src/checkout/` — empty `checkout.service.ts` and `dto/verify-otp.dto.ts`; suggests a planned OTP/email verification flow that was never implemented.
- `src/mail/` — empty folder despite `nodemailer` being installed.

### Unused dependencies
- `@nestjs/throttler` — installed but no `ThrottlerModule` (no rate limiting).
- `nodemailer` — installed, no code uses it.
- `pg`, `sqlite3` — installed but unused (only `better-sqlite3` and `mysql2` are used).

### Security & behavior
- **No registration endpoint** — customers are auto-created at checkout with random passwords they can't use.
- **Order tracking is unauthenticated** — anyone with an order number can view it.
- **Default admin credentials** (`admin@swaggedup.com` / `admin123`) seeded in dev — must be changed before production.
- **JWT secret dev fallback** — app throws in production if missing (good), but the dev fallback secret is committed knowledge.
- **No rate limiting** on login or order creation.

### Hardcoded business rules
- Shipping: flat ₹150, free ≥ ₹5000 (in `OrdersService`).
- Low-stock threshold: 5 (in `ProductsService`/dashboard stats).
- Discount: always 0.

### Testing
- Only default Nest scaffold specs (`app.controller.spec.ts`, `app.e2e-spec.ts`) — no tests for auth, products, orders, or any business module.

### Housekeeping
- `swaggedup` file in backend root is a leftover 86KB SQLite database — not referenced by any config; safe to delete.

## Frontend

- **No role check in `authGuard`** — only token presence is checked; `AuthService.isAdmin()` exists but isn't enforced at route level.
- **No global HTTP error interceptor** — errors are handled per-call-site via `ToastService`.
- **Wishlist filtering is client-side** (`?filter=wishlist` filters the fetched page, not server-side).
- **Minimal test coverage** — only the default `app.spec.ts` (Vitest configured but unused).
- **No e2e framework** installed.

## Roadmap: Add Swagger / OpenAPI

The repo name is "swaggedup" but there's no Swagger. Suggested steps (not yet implemented):

1. `npm install @nestjs/swagger` in `backend/`.
2. In `src/main.ts`:
   ```ts
   const config = new DocumentBuilder()
     .setTitle('SwaggedUp API')
     .setDescription('E-commerce API for SwaggedUp')
     .setVersion('1.0')
     .addBearerAuth()
     .build();
   const document = SwaggerModule.createDocument(app, config);
   SwaggerModule.setup('api/docs', app, document);
   ```
3. Decorate DTOs with `@ApiProperty()` and controllers with `@ApiTags()` / `@ApiBearerAuth()` / `@ApiOperation()`.
4. Interactive docs will then be available at `/api/docs`.

## Roadmap: Other Candidates

- Implement the checkout OTP / mail verification flow (scaffolding exists).
- Add rate limiting via the already-installed `@nestjs/throttler`.
- Add customer registration + password reset.
- Secure order tracking (e.g., email + order number).
- Extract business constants (shipping, thresholds) into config.
- Add unit/e2e tests for core flows (checkout, stock management, auth).
- Add a role check to the frontend `authGuard`.
- Add a global HTTP error interceptor in the frontend.
