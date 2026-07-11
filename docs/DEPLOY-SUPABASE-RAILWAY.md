# Deploying with Supabase (database) + Railway (hosting)

This is the zero-server-maintenance option: Supabase hosts a managed Postgres
database, Railway builds and runs the Next.js app from your code. No IIS, no
VM, no SQL Server to patch.

```
Browser → Railway (Next.js app, auto HTTPS) → Supabase (Postgres)
```

---

## Part 1 — Create the database on Supabase

1. Go to https://supabase.com → **New project**.
   - Pick a name, a strong database password (save it — you'll need it below), and a region close to your users (e.g. closest to Cairo: `eu-central-1` Frankfurt).
2. Wait ~2 minutes for provisioning.
3. You don't need to run the schema by hand — **the app creates all tables and seeds the full menu automatically on first request.** (If you'd rather review/run it yourself first: Supabase dashboard → **SQL Editor** → paste in `database/postgres_schema.sql` → Run.)
4. Get your connection string: **Project Settings → Database → Connection string → URI**.
   - Use the **Transaction pooler** string (port `6543`) — Railway's containers open many short-lived connections, and Supabase's direct connection (port `5432`) has a low connection limit that runs out quickly under that pattern. The pooler handles it correctly.
   - It looks like:
     ```
     postgresql://postgres.abcdefghijk:YOUR-PASSWORD@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
     ```
   - Replace `YOUR-PASSWORD` with the database password from step 1.

That's the whole database setup — keep that connection string handy for Part 2.

---

## Part 2 — Deploy the app to Railway

1. Push this project to a GitHub repo (Railway deploys from Git).
   ```
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/toast-roast.git
   git push -u origin main
   ```
2. Go to https://railway.app → **New Project → Deploy from GitHub repo** → pick the repo.
3. Railway auto-detects Next.js and sets the build/start commands for you (`npm run build` / `npm start`). No changes needed.
4. Add environment variables: your new service → **Variables** tab → add:
   | Variable | Value |
   |---|---|
   | `DATABASE_URL` | the Supabase pooler connection string from Part 1 |
   | `PGSSL` | `true` |
   | `JWT_SECRET` | a long random string (generate one: `openssl rand -base64 32`) |
5. Railway redeploys automatically whenever you push to `main`.
6. Once deployed, open the generated `*.up.railway.app` URL — the app boots, connects to Supabase, creates all tables, and seeds the full 244-item menu on that very first request (takes a few seconds; refresh once if the first load times out while seeding).
7. Log in at `/admin` with `admin` / `Admin@123` — **change this password immediately** (Users page).

### Custom domain (optional)

Railway service → **Settings → Networking → Custom Domain** → add your domain → follow the CNAME instructions at your DNS provider. Railway issues HTTPS automatically.

---

## Notes specific to this setup

- **Cold-start seeding:** the very first request after deploy (or after a fresh Supabase DB) triggers table creation + menu seeding, which takes a few seconds. Every request after that is fast — it's a one-time cost per empty database.
- **File uploads:** `/api/admin/upload` writes images to the container's local disk (`public/uploads`). Railway containers are **ephemeral** — uploaded images are lost on every redeploy. For production, swap this for Supabase Storage (a few lines in `app/api/admin/upload/route.js`) — ask if you'd like this wired up.
- **Connection limits:** stick to the pooler connection string (port 6543). If you ever see `too many connections` errors, lower the pool size in `lib/db.js` (`max: 10` → e.g. `max: 5`).
- **Local dev against Supabase:** you can point `.env.local` at the same `DATABASE_URL` and run `npm run dev` locally against your real Supabase data — no separate local database needed.
