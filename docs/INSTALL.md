# Installation & Deployment Guide

## Requirements
- Node.js 18+ and npm
- A PostgreSQL database — this project is set up for **Supabase**, but any Postgres 13+ works

## Local installation
1. `npm install`
2. `cp .env.example .env.local` and fill in:
   - `DATABASE_URL` — your Postgres connection string (see `docs/DEPLOY-SUPABASE-RAILWAY.md` for getting one from Supabase)
   - `JWT_SECRET` — a long random string (`openssl rand -base64 32`)
3. `npm run build && npm start` → http://localhost:3000
   - First request creates all tables and seeds the full 244-item menu automatically — takes a few seconds, refresh once if the very first load times out.
4. Sign in at `/admin` with `admin` / `Admin@123`, then change the password (Users → Reset Password).

Development mode with hot reload: `npm run dev`.

## Hosted deployment (Supabase + Railway)
See **`docs/DEPLOY-SUPABASE-RAILWAY.md`** for the full walkthrough — Supabase for the database, Railway for hosting, both free-tier friendly, no server to maintain.

## Deploying anywhere else
Any Node.js host works the same way as long as it can run `npm run build` then `npm start` and gives you a place to set environment variables (`DATABASE_URL`, `JWT_SECRET`, `PGSSL`). That covers Render, Fly.io, a plain VPS with pm2 + Nginx, etc. — the app itself doesn't care where it runs, only Postgres needs to be reachable from wherever it does.

## Changing tax / service rates
Back Office → Tax & Service. New orders use the new rates instantly; past invoices keep the rates they were placed with.
