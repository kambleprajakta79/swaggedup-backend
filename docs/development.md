# Development Guide

## Running Locally

```bash
# Terminal 1 — backend (port 3000)
cd backend
npm install
cp .env.example .env
npm run start:dev

# Terminal 2 — frontend (port 4200)
cd frontend
npm install
npm start
```

## Database Work

```bash
# Generate a migration after entity changes
npm run migration:generate -- src/database/migrations/<Name>

# Apply / revert
npm run migration:run
npm run migration:revert
```

- **Never rely on `synchronize`** — it's disabled; schema changes must go through migrations.
- The SQLite dev file (`database.sqlite`) can be deleted to force a fresh seed on next boot.
- To seed in production: set `RUN_SEEDER=true` (use with care — it only seeds empty tables).

## Adding a New Backend Module

Follow the existing module conventions (see `categories/` or `products/` for reference):

1. **Entity** in `<module>/entities/` — define columns, relations, soft delete (`DeleteDateColumn`) where appropriate.
2. **DTOs** in `<module>/dto/` — `Create*Dto` / `Update*Dto` with `class-validator` decorators (`@IsString`, `@IsNumber`, `@Min`, `@IsEnum`, …). The global `ValidationPipe` enforces them (`whitelist: true` strips unknown props).
3. **Service** — business logic. List methods should return the envelope `{ <resource>, total, page, limit }`.
4. **Controller** — decorate with:
   - `@Roles('ADMIN')` + `@UseGuards(JwtAuthGuard, RolesGuard)` for admin routes (or class-level guards like `AdminOrdersController`).
   - Public routes need no guards.
5. **Module** — register controller, service, and `TypeOrmModule.forFeature([...])`; import in `app.module.ts`.
6. **Migration** — after adding/changing entities, generate and run a migration.
7. **Frontend service** — add typed methods in `frontend/src/app/core/services/` that unwrap the envelope.

## Adding a New Frontend Feature

1. Create a feature folder under `src/app/<feature>/` with a standalone component (`.ts` + `.html`).
2. Add a route file (`<feature>-routes.ts`) exporting `Routes` as default, then wire it via `loadChildren` in the appropriate layout route (`app.routes.ts`, `admin-routes.ts`, etc.).
3. Use `inject()` for dependencies; services are `providedIn: 'root'`.
4. API calls go through the domain services (`ProductService`, etc.) which use `ApiService` — never call `HttpClient` directly from components.
5. Surface errors/success via `ToastService` (rendered globally by `<app-toast>`).
6. Styling: Tailwind utility classes inline in templates; design tokens (gold/charcoal palettes, Cinzel/Outfit fonts) are defined in `src/styles.css` via `@theme`.

## Testing

```bash
# Backend
cd backend && npm test && npm run test:e2e

# Frontend
cd frontend && npm test
```

> Current coverage is minimal (scaffold specs only) — see [known-gaps.md](./known-gaps.md).

## Deployment

### Backend (Render)

- Build: `npm install && npm run build`; start: `npm run start:prod`.
- Env vars: `NODE_ENV=production`, strong `JWT_SECRET`, `DB_TYPE=mysql` + MySQL credentials, `CORS_ORIGIN` = deployed frontend URL.
- Live at `https://swaggedup-backend.onrender.com`.

### Frontend (Vercel)

- `vercel.json`: build `npm run build` → output `dist/frontend/browser`, catch-all rewrite to `/index.html`.
- Production API URL comes from `environment.prod.ts`.

## Conventions Cheat Sheet

| Concern     | Convention                                                        |
| ----------- | ----------------------------------------------------------------- |
| Responses   | Lists: `{ resource, total, page, limit }`; singles: raw entity     |
| Errors      | `{ success: false, message, statusCode }` via global filter        |
| Validation  | class-validator DTOs + global ValidationPipe                       |
| Auth        | `@Roles()` + `JwtAuthGuard` + `RolesGuard`                         |
| Deletes     | Soft delete for products/categories                                |
| Slugs       | Auto-generated; products get random 4-digit suffix                 |
| Frontend DI | `inject()`, `providedIn: 'root'` services                          |
| State       | BehaviorSubject (cart/auth/toasts), signal (wishlist) + localStorage |
