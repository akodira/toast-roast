# Toast & Roast — Full-Stack Restaurant Website

Production-ready restaurant platform: public website, dine-in online ordering, and a secure Back Office — pre-seeded with the complete Toast & Roast menu (22 categories, 244 items) and Egypt's 14% VAT + 12% service charge.

## Stack
- **Frontend + Backend:** Next.js 14 (React, App Router, REST API routes)
- **Database:** PostgreSQL (via the `pg` driver) — designed for Supabase; schema auto-created on first run, or run `database/postgres_schema.sql` by hand
- **Auth:** bcrypt-hashed passwords + httpOnly JWT session cookies + route middleware

## Quick start
```bash
npm install
cp .env.example .env.local   # set a strong JWT_SECRET
npm run build
npm start                    # http://localhost:3000
```
The database is created and seeded automatically on first run.

**Back Office:** http://localhost:3000/admin — default login `admin` / `Admin@123` (change it immediately in Users → Reset Password).

## What's included
- **Public site:** Home, Menu (search + category filter), About, Contact — all content editable from the Back Office.
- **Ordering (5 steps):** table/customer details → categories → items with +/- quantity and running subtotal → editable cart → auto-calculated invoice (Subtotal + Tax + Service = Grand Total) → unique order number + confirmation page.
- **Back Office:** Dashboard (today's orders, pending/completed, sales, customers, 7-day revenue), live Orders page (auto-refreshes every 10s) with full status workflow, Menu & Category management with image upload, Website Content CMS, Tax & Service settings (no code changes needed), User management, activity/audit log.

## Security
- Passwords hashed with bcrypt; JWT in httpOnly SameSite cookie (CSRF-resistant); middleware guards all /admin pages and /api/admin routes.
- SQL injection blocked via parameterized statements everywhere.
- Order prices and totals are always recomputed server-side — the client can never set a price.
- Upload endpoint restricts type (jpg/png/webp) and size (3MB).
- Admin changes are written to ActivityLog.

## Project structure
```
app/            pages + API routes (app/api/**)
components/     shared header/footer
lib/db.js       schema, migrations, menu seed
lib/auth.js     JWT session helpers
middleware.js   admin route protection
database/       Postgres schema script (database/postgres_schema.sql)
docs/           API.md, ERD.md, INSTALL.md, DEPLOY-SUPABASE-RAILWAY.md, VISUAL-STUDIO.md
public/uploads/ menu item images
```

## Docs
- `docs/API.md` — full REST reference
- `docs/ERD.md` — entity relationship diagram (Mermaid)
- `docs/INSTALL.md` — installation + production deployment guide
