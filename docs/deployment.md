# SwaggedUp — Deployment Guide (Render + Vercel + Custom DNS)

This project deploys as: **backend → Render** (NestJS + MySQL), **frontend → Vercel** (Angular static), **database → managed MySQL** (e.g. PlanetScale/Aiven/Railway MySQL), **domain → your DNS provider**.

---

## Part 1 — Prerequisites checklist

| Item | Where to get it |
|---|---|
| GitHub repos pushed (backend + frontend) | already done |
| Render account | render.com (free tier works, spins down when idle) |
| Vercel account | vercel.com (free hobby tier) |
| Managed MySQL database | Railway / Aiven / PlanetScale / Render MySQL |
| SMTP credentials for OTP emails | Gmail App Password, Resend, Brevo, Mailgun… |
| Razorpay LIVE account + keys | dashboard.razorpay.com (activate account, get `rzp_live_...` keys) |
| Your domain | any registrar (GoDaddy, Namecheap, Cloudflare…) |

---

## Part 2 — Database (Oracle MySQL HeatWave)

You're using **Oracle MySQL HeatWave** (OCI) — the app connects to it as plain MySQL (`DB_TYPE=mysql`, `mysql2` driver), so no code changes are needed.

1. In the OCI console, note the **DB System endpoint**:
   - **Private IP** (e.g. `10.0.1.x`) if the backend runs inside the same VCN — fastest and free of data-egress concerns.
   - **Public endpoint** (`....mysql.oraclecloud.com`) if the backend is outside OCI — you must enable a public endpoint + allow-list the backend's egress IP in the DB System's network settings (port 3306).
2. Create a dedicated user for the app (don't use admin):
   ```sql
   CREATE USER 'swaggedup_user'@'%' IDENTIFIED BY '<strong-password>';
   GRANT ALL PRIVILEGES ON swaggedup.* TO 'swaggedup_user'@'%';
   CREATE DATABASE swaggedup;
   ```
3. **TLS**: HeatWave DB Systems commonly enforce secure connections. If "Require Secure Client Connections" is enabled, set `DB_SSL=true` in the backend env (supported in `database.module.ts` / `data-source.ts`).
4. **HeatWave accelerator note**: the HeatWave analytics node is separate from the MySQL endpoint — the app only needs the standard MySQL endpoint on 3306. No HeatWave-specific driver.
5. Seed once from your machine (see Part 2 of the general flow): point local `.env` at the HeatWave endpoint with `RUN_SEEDER=true`, run the app once, then revert. Migrations auto-apply on backend boot (`migrationsRun: true`).
6. **Networking gotcha**: if the backend is on Render (outside OCI), you need the DB System's public endpoint + allow-listed IPs, and traffic crosses the internet (TLS strongly recommended). If you later host the backend in the same OCI VCN (e.g. OCI Compute free tier), use the private IP — lower latency and no public exposure.

---

## Part 3 — Backend on Render

1. Render dashboard → **New → Web Service** → connect the `swaggedup-backend` repo.
2. Settings:
   - **Build command**: `npm install && npm run build`
   - **Start command**: `npm run start:prod`
   - **Health check path**: `/health`
3. Environment variables (Render → Environment):

```env
NODE_ENV=production
PORT=3000
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com
FRONTEND_URL=https://yourdomain.com

JWT_SECRET=<64+ random chars — generate: openssl rand -hex 32>

DB_TYPE=mysql
DB_HOST=<mysql host>
DB_PORT=3306
DB_USERNAME=<user>
DB_PASSWORD=<password>
DB_DATABASE=<dbname>

MAIL_HOST=smtp.gmail.com        # or your provider
MAIL_PORT=587
MAIL_USER=your@email.com
MAIL_PASS=<app password>
MAIL_FROM="SwaggedUp <no-reply@yourdomain.com>"
OTP_EXPIRY_MINUTES=10

RAZORPAY_KEY_ID=rzp_live_xxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxx
RAZORPAY_WEBHOOK_SECRET=xxxxxxxx

WHATSAPP_TOKEN=                 # optional
WHATSAPP_PHONE_ID=              # optional
WHATSAPP_BUSINESS_NUMBER=       # optional
```

> ⚠️ **Critical**: `NODE_ENV=production` gates everything — JWT secret hard-fail, Swagger off,
> the dev OTP `111111` off, seeder off. If you forget it, the app runs with a known dev secret
> and a universal OTP backdoor.

4. Deploy → note your backend URL, e.g. `https://swaggedup-backend.onrender.com`.
5. Verify: `curl https://swaggedup-backend.onrender.com/health` → `{"status":"ok"}`.

### Razorpay webhook
Razorpay Dashboard → Settings → Webhooks → add:
`https://swaggedup-backend.onrender.com/payments/webhook` — event: `payment.captured` — secret = same as `RAZORPAY_WEBHOOK_SECRET`.

---

## Part 4 — Frontend on Vercel

1. Vercel → **Add New → Project** → import `swaggedup-frontend`.
2. Framework preset: **Other** (vercel.json already handles build/output/rewrites).
   - Build command: `npm run build` · Output: `dist/frontend/browser`.
3. **Before deploying**, set the real backend URL in `src/environments/environment.prod.ts`:
   ```ts
   export const environment = {
     production: true,
     apiUrl: 'https://swaggedup-backend.onrender.com', // ← your actual Render URL
   };
   ```
   Commit + push, then deploy. (This is currently a placeholder — **blocker**.)
4. Deploy → you get `https://swaggedup-frontend.vercel.app`.
5. Test: open the site, register an account (real OTP email should arrive), place a COD order.

---

## Part 5 — Custom DNS (pointing your domain)

### 5.1 Frontend (Vercel)
1. Vercel → your project → **Settings → Domains → Add** → enter `yourdomain.com` and `www.yourdomain.com`.
2. Vercel shows DNS records. At your registrar, add:

| Type | Name | Value |
|---|---|---|
| A | `@` | `76.76.21.21` |
| CNAME | `www` | `cname.vercel-dns.com` |

   (Or change your domain's **nameservers** to Vercel's and let Vercel manage records — simpler.)
3. Wait for DNS propagation (5 min – 48 h; usually <1 h). Vercel auto-issues SSL.

### 5.2 Backend (Render)
1. Render → your service → **Settings → Custom Domain** → add `api.yourdomain.com`.
2. At your registrar add the shown CNAME:

| Type | Name | Value |
|---|---|---|
| CNAME | `api` | `swaggedup-backend.onrender.com` |

3. Render auto-issues SSL for `api.yourdomain.com`.

### 5.3 Final wiring (after DNS is live)
- Backend `CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com` (redeploy to apply).
- Backend `FRONTEND_URL=https://yourdomain.com` (email links).
- Frontend `environment.prod.ts` `apiUrl=https://api.yourdomain.com` (redeploy).
- Razorpay webhook URL → `https://api.yourdomain.com/payments/webhook`.

### 5.4 DNS record summary

| Record | Name | Points to | Purpose |
|---|---|---|---|
| A | `@` | `76.76.21.21` | storefront apex |
| CNAME | `www` | `cname.vercel-dns.com` | storefront www |
| CNAME | `api` | `swaggedup-backend.onrender.com` | API |

---

## Part 6 — Post-deploy verification

1. `curl https://api.yourdomain.com/health` → `{"status":"ok"}`
2. `curl -I https://api.yourdomain.com/health` → check Helmet headers present.
3. Register a real account → OTP email arrives → verify → logged in.
4. Admin login → change the seeded admin password immediately.
5. Place a COD order end-to-end.
6. Place a ₹1 Razorpay live-mode test payment; confirm webhook flips payment to PAID.
7. Check `GET /banners` returns your banners; homepage carousel shows them.
8. Mobile pass: iPhone/Android — carousel swipe, admin hamburger, checkout.

---

## Part 7 — What was fixed to make this deployable (2026-11-07)

- Helmet security headers + multi-origin CORS support (comma-separated `CORS_ORIGIN`).
- Global rate limiting (Throttler): 100 req/min/IP; login 10/min; register 5/min.
- Duplicate `seedBanners()` call removed.
- `vercel.json`: security headers + 1-year immutable cache for hashed assets.
- `frontend/.gitignore`: `.env` added.
- Wishlist route-order bug fixed (`POST /wishlist/merge` was shadowed by `:productId`).
- Dead Unsplash image URLs replaced (seeder + live DB).

## Part 8 — Remaining manual steps (cannot be done from code)

1. Set `environment.prod.ts` apiUrl to the real backend URL (placeholder today).
2. Provision managed MySQL and point `DB_*` env vars at it (SQLite would be wiped on redeploys).
3. Configure SMTP (`MAIL_*`) — without it OTP registration is silently broken in prod.
4. Swap Razorpay test keys → live keys + webhook secret.
5. Change the seeded admin password after first prod login.
6. Never set `RUN_SEEDER=true` in the production environment.
