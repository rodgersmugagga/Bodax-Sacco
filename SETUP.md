# Bodax SACCO — Setup Guide

Environment variable reference and deployment instructions for Render and Vercel.

---

## Required Environment Variables

### Server (`server/.env` or Render dashboard → Environment)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes (prod) | — | PostgreSQL connection string (Neon, AWS RDS, etc.) |
| `JWT_SECRET` | Yes (prod) | `development-only-secret-change-me` | Random 64-char secret. Generate with `openssl rand -hex 32`. The app will refuse to start in production without it. |
| `NODE_ENV` | No | `development` | Set to `production` on Render/Vercel |
| `JWT_EXPIRES_IN` | No | `8h` | Token expiry duration (e.g. `1h`, `7d`) |
| `CLIENT_URL` | Yes (prod) | `http://localhost:5173` | Frontend origin for CORS. On Render: the client static site URL, e.g. `https://bodax-client.onrender.com`. No trailing slash. |
| `PORT` | No | `4000` | Internal port. Render/Vercel override this automatically. |

### Client (Render dashboard → Environment during Static Site setup)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_API_BASE_URL` | Yes (prod) | — | Full API origin URL, e.g. `https://bodax-api.onrender.com`. No trailing slash. |

---

## Deployment Steps

### Render (recommended)

The `render.yaml` file at the project root can deploy both services via **Render Blueprint** (Infrastructure as Code).

**Option A — Blueprint (one-click):**
1. Push this repo to GitHub/GitLab.
2. In the Render dashboard, click **New → Blueprint** and connect the repo.
3. Render reads `render.yaml` and creates both services.
4. After creation, set the `sync: false` env vars manually:
   - **bodax-api**: paste `DATABASE_URL` and `CLIENT_URL` (the client URL from step 5).
   - **bodax-client**: paste `VITE_API_BASE_URL` (the API URL from step 4).
5. Deploy each service once the env vars are set.

**Option B — Manual:**
1. **Web Service** (API):
   - Name: `bodax-api`
   - Root directory: `server`
   - Runtime: Node
   - Build command: `npm install`
   - Start command: `npm start`
   - Plan: Free
   - Environment variables: see Server table above.

2. **Static Site** (Client):
   - Name: `bodax-client`
   - Root directory: `client`
   - Build command: `npm install && npm run build`
   - Publish directory: `dist`
   - Plan: Free
   - Environment variables: `VITE_API_BASE_URL` = `https://bodax-api.onrender.com` (after the API deploys).

3. After both are deployed, update the API's `CLIENT_URL` to `https://bodax-client.onrender.com` and re-deploy the API.

### Vercel

The `vercel.json` routes API requests to the serverless function and SPA routes to the client.

1. Connect the repo to Vercel.
2. Set `VITE_API_BASE_URL` in the Vercel dashboard to the API's production URL.
3. Server env vars are configured in the Vercel dashboard under the server function settings.

---

## Seed Accounts (development only)

The schema script creates these default accounts:

| Role | Email | Password |
|------|-------|----------|
| Treasurer | `treasurer@bodax.test` | `password123` |
| Chairman | `chairman@bodax.test` | `password123` |
| Member | `member@bodax.test` | `password123` |

**Change these passwords immediately after deploying to production.**

---

## Local Development

```bash
# Install all dependencies
npm run install:all

# Both commands below run from the project root.

# Terminal 1: start the API (defaults to http://localhost:4000)
npm run dev

# Terminal 2: start the client (defaults to http://localhost:5173)
npm run dev:client
```

The client's Vite dev server proxies `/api/*` requests to `http://localhost:4000` automatically. No `VITE_API_BASE_URL` is needed in development.

---

## Applying the Database Schema

```bash
npm run db:schema --prefix server
```

Or run the SQL file manually against your PostgreSQL instance:

```bash
psql "$DATABASE_URL" -f server/src/db/schema.sql
```

This creates all tables, indexes, and seed data. Safe to run repeatedly (all `CREATE TABLE` and `CREATE INDEX` use `IF NOT EXISTS`).

---

## Verifying the Setup

1. Health check: `curl https://your-api-url.com/health`
   - Expected: `{ "status": "ok", "service": "bodax-api", "database": "connected" }`
2. Login: `curl -X POST https://your-api-url.com/api/auth/login -H "Content-Type: application/json" -d '{"identifier":"treasurer@bodax.test","password":"password123"}'`
   - Expected: A JSON response with `token` and `user` fields.
