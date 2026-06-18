# Boda Boda SACCO Management System

Full-stack SACCO record-keeping and analytics app for Boda Boda groups in Uganda, starting with Mbarara.

## Stack

- React, React Router, Context API, Axios
- Node.js, Express.js
- Neon PostgreSQL
- JWT authentication and role-based authorization

## Setup

1. Install dependencies:

```bash
npm run install:all
```

2. Create `server/.env` from `server/.env.example` and set `DATABASE_URL` to your Neon PostgreSQL connection string.

3. Run the schema in `server/src/db/schema.sql` against Neon.

4. Start the API:

```bash
npm run dev
```

5. Start the frontend in another terminal:

```bash
npm run dev:client
```

The frontend defaults to `http://localhost:5173` and proxies API requests to `http://localhost:4000`.

## Default Seed Users

The schema creates sample users with password `password123`.

- Treasurer: `treasurer@bodax.test`
- Chairman: `chairman@bodax.test`
- Member: `member@bodax.test`
# Bodax-Sacco
