# Bodax-SACCO System Audit Report

**Date:** 2025-07-17  
**Scope:** Reporting Verification, Deployment Readiness, and Training  
**Auditor:** Bwat (Casa Neural Engine)

---

## Contents

1. [Critical — Fix Immediately](#1-critical--fix-immediately)
2. [High — Address Before Deployment](#2-high--address-before-deployment)
3. [Medium — Improve for Production Hardening](#3-medium--improve-for-production-hardening)
4. [Low — Nice to Have](#4-low--nice-to-have)
5. [Verified OK](#5-verified-ok)
6. [Training & Documentation Deliverables](#6-training--documentation-deliverables)
7. [Deployment Checklist](#7-deployment-checklist)

---

## 1. Critical — Fix Immediately

### 1.1 Treasurer Dashboard: Two Numbers Are Unvalidated

**What's on the dashboard** (`client/src/pages/treasurer/Dashboard.jsx`):
- `active_members` — displayed as "Active members"
- `daily_collections` — displayed as "Today"
- `weekly_collections` — displayed as "This week"
- `monthly_collections` — displayed as "This month"
- `active_loans` — displayed as "Active loans"
- `pending_loan_requests` — displayed as "Pending loan requests"

**What the API returns** (`server/src/services/reportService.js` `treasurerDashboard()`):
- Same 6 fields plus **`pending_withdrawals`** (not displayed on the client)

**Action needed:** Manually run each of these SQL subqueries against the production database and verify every number matches exactly. For cross-checking:

```sql
-- active_members
SELECT COUNT(*)::int FROM members WHERE status = 'active';

-- daily_collections
SELECT COALESCE(SUM(amount), 0) FROM savings_transactions
WHERE transaction_date = CURRENT_DATE AND confirmed = true;

-- weekly_collections (adjust for Monday of current week)
SELECT COALESCE(SUM(amount), 0) FROM savings_transactions
WHERE transaction_date >= date_trunc('week', CURRENT_DATE) AND confirmed = true;

-- monthly_collections
SELECT COALESCE(SUM(amount), 0) FROM savings_transactions
WHERE transaction_date >= date_trunc('month', CURRENT_DATE) AND confirmed = true;

-- active_loans
SELECT COUNT(*)::int FROM loans WHERE status = 'active';

-- pending_loan_requests
SELECT COUNT(*)::int FROM loan_requests WHERE status = 'pending';
```

**Fix any mismatch** by updating either the service query or the data. The `pending_withdrawals` field is computed but never shown on the treasurer dashboard — add it as a stat card or remove the unused subquery.

### 1.2 Chairman Dashboard: stale loan statuses cause mismatches

**Problem:** The chairman dashboard NEVER calls `refreshOverdueLoans()` before running its queries. The `memberDashboard()` and `listLoans()` functions do call it, but `chairmanDashboard()` and `treasurerDashboard()` do not. This means:

- A loan whose `due_date < CURRENT_DATE` still has `status = 'active'` because the scheduled refresh hasn't happened.
- The `outstanding_loan_balance` subquery uses `status IN ('active','overdue')` — so it **misses** these stale loans if they haven't been refreshed.
- The `loan_arrears` subquery has a manual fallback `(l.status = 'active' AND l.due_date < CURRENT_DATE)` that partially covers this, creating a **discrepancy** between the two numbers.

**Fix:** Add `await refreshOverdueLoans()` at the top of both `treasurerDashboard()` and `chairmanDashboard()`.

**File:** `server/src/services/reportService.js` lines 5 and 21.

```javascript
// Add at the top of treasurerDashboard():
export async function treasurerDashboard() {
  await refreshOverdueLoans();
  // ... rest of function
}

// Add at the top of chairmanDashboard():
export async function chairmanDashboard() {
  await refreshOverdueLoans();
  // ... rest of function
}
```

After adding the refresh, cross-check chairman numbers with:

```sql
-- members
SELECT COUNT(*)::int FROM members;

-- total_savings
SELECT COALESCE(SUM(amount), 0) FROM savings_transactions WHERE confirmed = true;

-- active_loans
SELECT COUNT(*)::int FROM loans WHERE status = 'active';

-- outstanding_loan_balance
SELECT COALESCE(SUM(remaining), 0) FROM (
  SELECT GREATEST(l.total_payable - COALESCE(SUM(r.amount), 0), 0) AS remaining
  FROM loans l
  LEFT JOIN loan_repayments r ON r.loan_id = l.id
  WHERE l.status IN ('active','overdue')
  GROUP BY l.id
) sub;

-- loan_arrears
SELECT COALESCE(SUM(remaining), 0) FROM (
  SELECT GREATEST(l.total_payable - COALESCE(SUM(r.amount), 0), 0) AS remaining
  FROM loans l
  LEFT JOIN loan_repayments r ON r.loan_id = l.id
  WHERE l.status = 'overdue'
  GROUP BY l.id
) sub;

-- weekly_collections
SELECT COALESCE(SUM(amount), 0) FROM savings_transactions
WHERE transaction_date >= date_trunc('week', CURRENT_DATE) AND confirmed = true;

-- monthly_collections
SELECT COALESCE(SUM(amount), 0) FROM savings_transactions
WHERE transaction_date >= date_trunc('month', CURRENT_DATE) AND confirmed = true;
```

### 1.3 Income Summary: Interest Income is Drastically Overstated

**File:** `server/src/services/reportService.js` `incomeSummary()` line 161

```sql
(SELECT COALESCE(SUM(interest_amount), 0) FROM loans) AS interest_income
```

This sums `interest_amount` (total lifetime interest) across **every loan ever issued**, regardless of repayment status. A loan issued yesterday with 100k UGX interest that hasn't been repaid a single shilling yet is counted at full value.

**Correct calculation:** Only count interest on completed/paid portions:

```sql
-- Option A: Only loans that have been fully repaid
(SELECT COALESCE(SUM(l.interest_amount), 0)
 FROM loans l
 WHERE l.status = 'completed') AS interest_income

-- Option B: Pro-rata based on what's actually been repaid
(SELECT COALESCE(SUM(
   r.amount * (l.interest_amount / l.total_payable)
 ), 0)
 FROM loan_repayments r
 JOIN loans l ON l.id = r.loan_id) AS interest_income
```

Option A is simpler and likely sufficient for a SACCO reporting context where interest is simple and fixed at issuance.

### 1.4 Rate Limiting: No Brute-Force Protection on Login

**Problem:** The single global rate-limiter (300 requests / 15 min across all routes) allows 300 login attempts per 15 minutes — essentially unlimited brute-force.

**Fix:** Add a dedicated, strict rate-limiter on the auth routes:

**File:** `server/src/app.js`, after line 28

```javascript
import { rateLimit as rateLimitFn } from 'express-rate-limit';

// After existing app.use(rateLimit(...))

// Strict rate limiter for auth endpoints (prevent brute force)
app.use('/api/auth/login', rateLimitFn({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  limit: 10,                  // 10 attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many login attempts. Please try again in 15 minutes.' },
}));
```

### 1.5 JWT Secret Falls Back to a Hardcoded Dev Value Without Warning

**File:** `server/src/config/env.js` line 23

```javascript
jwtSecret: process.env.JWT_SECRET || 'development-only-secret-change-me',
```

In production, if `JWT_SECRET` is somehow unset, the app silently uses a known hardcoded value. Any attacker can forge JWTs and impersonate any user.

**Fix:**

```javascript
// In env.js, add a production check:
if (env.nodeEnv === 'production' && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is required in production');
}
// Keep the dev fallback for development only
jwtSecret: process.env.JWT_SECRET || 'development-only-secret-change-me',
```

---

## 2. High — Address Before Deployment

### 2.1 Missing Database Indexes Causing Slow Queries

The schema has 10 indexes, but the following high-frequency queries lack optimal index support:

| Query | Used in | Missing Index | Estimated Impact |
|-------|---------|---------------|-----------------|
| `SELECT SUM(amount) FROM savings_transactions WHERE member_id = $1 AND confirmed = true` | `checkLoanEligibility`, `memberSavingsSummary`, `memberDashboard` | `idx_savings_member_confirmed ON savings_transactions(member_id) WHERE confirmed = true` | High — scanned on every loan application and every member dashboard load |
| `LEFT JOIN loan_repayments r ON r.loan_id = l.id ... SUM(r.amount)` | `chairmanDashboard`, `listLoans`, `defaulters`, `refreshOverdueLoans` | `idx_repayments_loan_id ON loan_repayments(loan_id)` | High — every loan list query does a full scan of repayments |
| `WHERE m.status = 'active'` | `checkLoanEligibility`, `treasurerDashboard` | `idx_members_status ON members(status)` | Low-medium |
| `SELECT ... FROM withdrawals WHERE member_id = $1` | `statement()` | `idx_withdrawals_member ON withdrawals(member_id)` | Low |

**Action:** Add these indexes to `server/src/db/schema.sql` and apply to production:

```sql
CREATE INDEX IF NOT EXISTS idx_savings_member_confirmed
  ON savings_transactions(member_id) WHERE confirmed = true;
CREATE INDEX IF NOT EXISTS idx_repayments_loan_id
  ON loan_repayments(loan_id);
CREATE INDEX IF NOT EXISTS idx_members_status
  ON members(status);
CREATE INDEX IF NOT EXISTS idx_withdrawals_member
  ON withdrawals(member_id);
```

### 2.2 Analytics Views Need Manual Verification Against Test Data

**File:** `server/src/services/reportService.js`

Each analytics function must be cross-checked against manually calculated test cases:

**Top savers** (`topSavers()`, line 117):
```sql
-- Manual check: insert a test saving of 50,000 for member A and 30,000 for member B,
-- then verify the topSavers endpoint returns A first with 50,000 and B second with 30,000.
SELECT m.full_name, m.member_number, COALESCE(SUM(s.amount), 0) AS total
FROM members m
LEFT JOIN savings_transactions s ON s.member_id = m.id AND s.confirmed = true
GROUP BY m.id
ORDER BY total DESC LIMIT 10;
```

**Defaulters** (`defaulters()`, line 129):
```sql
-- Manual check: mark a loan as overdue with 0 repayments → should show the full
-- total_payable as balance. Make a repayment of 10,000 → balance should drop.
SELECT m.full_name, GREATEST(l.total_payable - COALESCE(SUM(r.amount), 0), 0) AS balance
FROM loans l
JOIN members m ON m.id = l.member_id
LEFT JOIN loan_repayments r ON r.loan_id = l.id
WHERE l.status = 'overdue'
GROUP BY l.id, m.full_name, m.member_number
ORDER BY balance DESC;
```

**Monthly collection trend** (`collectionTrend()`, line 143):
```sql
-- Manual check with known data: Jan 100k, Feb 50k, Mar 75k
-- → returns ['Jan 2025': 100000, 'Feb 2025': 50000, 'Mar 2025': 75000]
SELECT to_char(date_trunc('month', transaction_date), 'Mon YYYY') AS period,
       COALESCE(SUM(amount), 0) AS savings
FROM savings_transactions
WHERE transaction_date >= date_trunc('month', CURRENT_DATE) - (5 * interval '1 month')
  AND confirmed = true
GROUP BY date_trunc('month', transaction_date)
ORDER BY date_trunc('month', transaction_date);
```

### 2.3 No Health Check Env Validation

The `/health` endpoint (`server/src/app.js` line 30) always returns `{ status: 'ok' }` regardless of database connectivity. A health check that doesn't verify the database connection is nearly useless for Render/Vercel monitoring.

**Fix:**

```javascript
import { pool } from './config/db.js';

app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', service: 'bodax-api', database: 'connected' });
  } catch (error) {
    res.status(503).json({ status: 'error', service: 'bodax-api', database: 'disconnected' });
  }
});
```

### 2.4 Missing Environment Variable Documentation

**Current state:** Required env vars are scattered across `server/.env`, `render.yaml`, and `vercel.json` with no single source of truth.

**Action needed:** Create `SETUP.md` (see Section 6 for the deliverable). Currently documented fragments:

| Variable | In `.env` | In `render.yaml` | In `vercel.json` | Documented? |
|----------|-----------|-------------------|-------------------|-------------|
| `PORT` | `4000` | Implicit (Render auto) | Implicit (Vercel auto) | No |
| `NODE_ENV` | `development` | `production` | Not set | No |
| `DATABASE_URL` | ✅ | `sync: false` | Not set | Partial |
| `JWT_SECRET` | placeholder | `generateValue: true` | Not set | Partial |
| `JWT_EXPIRES_IN` | `8h` | `8h` | Not set | No |
| `CLIENT_URL` | `http://localhost:5173` | `sync: false` | Not set | No |
| `VITE_API_BASE_URL` | Not applicable | `sync: false` | Not set | No |

---

## 3. Medium — Improve for Production Hardening

### 3.1 No HTTP Security Headers Audit

Helmet is applied globally (`app.use(helmet())`) which enables all default Helmet middleware. This is good. Default Helmet sets:
- `Content-Security-Policy` (blocked by default)
- `X-DNS-Prefetch-Control`
- `X-Frame-Options` (SAMEORIGIN)
- `Strict-Transport-Security`
- `X-Content-Type-Options` (nosniff)
- `X-Permitted-Cross-Domain-Policies`
- `Referrer-Policy`
- `X-XSS-Protection`

**Recommended additions:**

```javascript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'", env.nodeEnv === 'development' ? '*' : env.clientUrl],
    },
  },
  // Allow CORS from client origin
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
```

Without explicit CSP, all inline styles won't work. **The `MemberDashboard.jsx` page uses inline `<style>` tags** (line 278) and many popups use inline `style={{}}` props. With default Helmet CSP, inline styles will be blocked. If the app currently works with default Helmet, it's because React's build pipeline hashes the inline styles. Verify this in production builds.

### 3.2 Password Hashing Verification

**Confirmed working:** The app uses `bcryptjs` with 12 salt rounds for password hashing (lines: `authService.js:69`, `memberService.js:110`). The schema seeds use pgcrypto's `crypt()` which generates `$2a$`-format hashes compatible with `bcryptjs.compare()`.

**Direct DB verification:** Run:
```sql
SELECT id, email,
  CASE
    WHEN password_hash LIKE '$2%' THEN 'bcrypt - OK'
    WHEN password_hash LIKE '$argon2%' THEN 'argon2 - OK'
    ELSE 'PLAIN TEXT OR UNKNOWN - FAIL'
  END AS hash_algorithm
FROM users;
```

Every row should return `'bcrypt - OK'`.

### 3.3 Endpoint Validation Gaps

| Endpoint | Issue | Severity |
|----------|-------|----------|
| `POST /auth/login` | Accepts both `identifier` and `email` fields — `identifier` is treated as phone/email but there is no validation of phone format | Low |
| `POST /savings` | `member_id` is required by zod but the treasurer UI may not always send it | Medium |
| `GET /members/:id` | Validates `id` is a UUID — returns 404 if not found, but also returns 400 if invalid UUID format via zod | Low |

### 3.4 Pagination Missing on Most List Endpoints

**Problem:** `listLoanRequests()`, `listWithdrawalRequests()`, `listLoans()`, and `defaulters()` have no pagination. As the database grows, these will become slow and memory-heavy.

**Affected files:** `loanService.js`, `withdrawalService.js`, `reportService.js`

**Fix:** Add `LIMIT` and `OFFSET` parameters to all list queries, matching the pattern already used in `memberService.listMembers()`.

### 3.5 Analytics Endpoint Does a Blocking Sequential Fetch

**File:** `server/src/controllers/reportController.js` lines 24-28

The analytics controller intentionally uses `Promise.all()` to run 5 queries in parallel — this is correct. No issue here, confirmed OK.

---

## 4. Low — Nice to Have

### 4.1 Treasurer Dashboard Shows 6 of 7 Computed Fields

The API returns `pending_withdrawals` but the client doesn't display it. Either add a stat card or remove the unused subquery from `treasurerDashboard()`.

### 4.2 Member Dashboard Auto-Refresh Is Aggressive

**File:** `client/src/pages/member/Dashboard.jsx` line 69 — polls every 5 seconds. This produces 12 API calls per minute per active member session. For a pilot with 20 members, that's 240 requests/minute on the member dashboard alone.

**Suggestion:** Increase to 30 seconds or use WebSocket/SSE for real-time updates.

### 4.3 `incomeSummary()` and `expenditureSummary()` Not Called Separately

The analytics endpoint returns income+expenditure together, but only 3 fields come from `incomeSummary()` and 2 from `expenditureSummary()`. These could be a single query to save a round-trip.

### 4.4 Zod Validation Messages Not User-Friendly

**File:** `server/src/validators/schemas.js`

Zod's default error messages are technical. For a production SACCO app used by non-technical treasurers, add custom error messages:

```javascript
amount: z.coerce.number().positive('Amount must be greater than zero'),
phone_number: z.string().min(7, 'Phone number is too short'),
```

---

## 5. Verified OK

The following were confirmed correct during the audit:

| Item | Status | Evidence |
|------|--------|----------|
| Helmet applied globally | ✅ | `server/src/app.js` line 12 |
| Health endpoint returns 200 | ✅ | `server/src/app.js` line 30 — returns `{ status: 'ok' }` |
| Rate limiting library installed | ✅ | In `package.json`: `express-rate-limit@^7.4.1` |
| Rate limiting middleware applied | ✅ | `server/src/app.js` lines 21-28 — 300 req/15min |
| Passwords hashed with bcrypt | ✅ | `authService.js` line 69, `memberService.js` line 110 — 12 salt rounds |
| JWT authentication middleware | ✅ | `authMiddleware.js` — verifies token, checks `is_active` |
| Role-based authorization middleware | ✅ | `authMiddleware.js` `authorize()` function |
| Server-side RBAC on all report routes | ✅ | `reportRoutes.js` lines 7-10 — each route has `authorize()` |
| Server-side RBAC on all routes | ✅ | Every route definition uses `authorize(...)` |
| Client-side route guarding | ✅ | `ProtectedRoute.jsx` blocks by `role_code` |
| API validation via zod | ✅ | `validate.js` middleware on mutation routes |
| Error middleware hides stack in production | ✅ | `errorMiddleware.js` line 15 — `env.nodeEnv === 'development'` |
| CORS configured for production | ✅ | `app.js` line 13-17 — reads `env.clientUrl` |
| Render deployment config | ✅ | `render.yaml` with correct rootDir, build, start |
| Vercel deployment config | ✅ | `vercel.json` with correct routes |
| Use of environment variables | ✅ | `env.js` reads from env |
| Transactions for critical operations | ✅ | `transaction()` used in `reviewLoanRequest`, `reviewWithdrawalRequest` |

---

## 6. Training & Documentation Deliverables

### 6.1 Three Quick-Reference Guides

Each guide should be a single A4 page (printable), listing the **3-5 most common tasks** with numbered steps and a screenshot reference.

**Template for each guide:**

```
┌─────────────────────────────────────────────────┐
│  Bodax SACCO — [Role] Quick Guide               │
│  How to perform your [N] most common tasks       │
├─────────────────────────────────────────────────┤
│                                                 │
│  Task 1: [Task Name]                            │
│                                                 │
│  1. Log in at [URL] with your email and         │
│     password.                                   │
│  2. Click "[Button/Link]" on the left sidebar.  │
│  3. [Step 3]                                    │
│  4. [Step 4]                                    │
│  5. Confirm you see [expected result].          │
│                                                 │
│  [Screenshot: annotated screenshot of the       │
│   relevant screen with step numbers]            │
│                                                 │
│  ─────────────────────────────────────────────   │
│                                                 │
│  Task 2: [Task Name]                            │
│  ...                                            │
│                                                 │
│  ─────────────────────────────────────────────   │
│                                                 │
│  Need help? Call [Pilot Contact Person]         │
│  on [Phone Number] or email [Email].            │
└─────────────────────────────────────────────────┘
```

#### Treasurer Quick Guide — Top 5 Tasks

1. **Record a savings deposit** — Select member → enter amount → save → SMS confirmation step
2. **Approve a loan request** — Review eligibility → approve → loan issued automatically
3. **Register a new member** — Fill registration form → set temporary password → give member their login
4. **Record a loan repayment** — Find loan → enter amount → system updates remaining balance
5. **View today's collections** — Dashboard shows daily, weekly, monthly totals

#### Member Quick Guide — Top 3 Tasks

1. **View your savings balance** — Login → dashboard shows total, weekly, monthly savings
2. **Apply for a loan** — Check eligibility → fill request form → wait for treasurer approval
3. **View your loan repayment schedule** — Dashboard shows active loans, due dates, and reminders

#### Chairman Quick Guide — Top 4 Tasks

1. **View SACCO overview** — Dashboard shows total members, savings, loans, arrears
2. **Check collection trends** — Analytics page shows monthly growth chart
3. **View defaulters list** — Analytics page lists overdue loans sorted by amount
4. **Review income vs expenditure** — Reports page shows income summary versus withdrawals paid

### 6.2 Pilot Support Checklist

**For the Mile 4 Stage pilot, provide each test user with:**

| Scenario | Who to Contact | Contact Method | Fallback |
|----------|---------------|----------------|----------|
| Cannot log in (forgot password) | [Treasurer Name] | [Phone] / [Email] | Admin can reset via `/members/:id/credentials` |
| Payment dispute (savings not showing) | [Treasurer Name] | [Phone] | Check `savings_transactions` table + SMS log |
| Loan application not appearing | [Treasurer Name] | [Phone] | Check `loan_requests` table |
| System error / crash / blank screen | [Developer Name] | [Phone] / WhatsApp | Restart server: `npm start` or Render dashboard → Deploy |
| Rate-limited (Cannot submit) | Wait 15 minutes | — | Contact developer if persists |

**What to tell pilot users during onboarding:**
- "All users use the same login page at [URL]. Your role determines what you see."
- "Savings deposits show immediately on your dashboard after the treasurer records them."
- "The dashboard auto-refreshes every 5 seconds — you don't need to refresh the page."
- "If something doesn't look right, take a screenshot and send it to [Pilot Contact]."

### 6.3 Setup File — Required Environment Variables

Create `SETUP.md` at the project root:

```markdown
# Bodax SACCO — Setup Guide

## Required Environment Variables

### Server (`server/.env` or Render dashboard → Environment)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | — | PostgreSQL connection string (Neon, AWS RDS, etc.) |
| `JWT_SECRET` | Yes | — | Random 64-char string (`openssl rand -hex 32`) |
| `NODE_ENV` | No | `development` | Set to `production` on Render/Vercel |
| `JWT_EXPIRES_IN` | No | `8h` | Token expiry duration |
| `CLIENT_URL` | Yes (prod) | `http://localhost:5173` | Frontend origin (CORS). On Render: the client static URL |
| `PORT` | No | `4000` | Internal port (Render/Vercel override automatically) |

### Client (Render dashboard → Environment)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_API_BASE_URL` | Yes (prod) | — | Full API URL, e.g. `https://bodax-api.onrender.com` |

## Deployment Steps

### Render

1. Create two services in the Render dashboard:
   - **Web Service** (API): point to repo, root directory = `server`, start command = `npm start`
   - **Static Site** (Client): point to repo, root directory = `client`, build command = `npm install && npm run build`, publish directory = `dist`

2. Set environment variables per the tables above.
   - Generate `JWT_SECRET` using `openssl rand -hex 32`.
   - After the API deploys, copy its URL (e.g. `https://bodax-api.onrender.com`) into the client's `VITE_API_BASE_URL`.
   - After the client deploys, copy its URL into the API's `CLIENT_URL`.

3. The `render.yaml` file in this repo can auto-deploy both services via Render Blueprint.

### Vercel

1. Connect repo to Vercel.
2. Set `VITE_API_BASE_URL` to the API's production URL in the Vercel dashboard.
3. The `vercel.json` routes `/*` → client SPA, and `/api/*`, `/health` → serverless functions.

## Seed Accounts (development only)

| Role | Email | Password |
|------|-------|----------|
| Treasurer | treasurer@bodax.test | password123 |
| Chairman | chairman@bodax.test | password123 |
| Member | member@bodax.test | password123 |

These are created by the schema seeding script. **Change these passwords immediately in production.**
```

---

## 7. Deployment Checklist

Before go-live, verify each item:

- [ ] **All dashboards verified:** Run direct SQL queries against production DB, compare every number on treasurer and chairman dashboards, fix any mismatch
- [ ] **`refreshOverdueLoans()` added** to `treasurerDashboard()` and `chairmanDashboard()`
- [ ] **Rate limiting:** Login endpoint has its own 10-attempt-per-15-minute limiter
- [ ] **JWT_SECRET:** Production check added to `env.js`, a strong secret deployed
- [ ] **Health check:** Returns 503 when database is down
- [ ] **Indexes applied:** 4 new indexes created (`idx_savings_member_confirmed`, `idx_repayments_loan_id`, `idx_members_status`, `idx_withdrawals_member`)
- [ ] **Interest income:** Query updated to only count completed loans (or prorated)
- [ ] **CSP configured:** Helmet CSP directives set explicitly for production
- [ ] **Password hashing verified:** SQL check on `users.password_hash` — every row starts with `$2`
- [ ] **RBAC tested end-to-end:** Login as a Member, try navigating to `/treasurer/members`, `/treasurer/savings`, `/treasurer/loans`, `/treasurer/withdrawals`, `/chairman/analytics`, `/chairman/reports` — every one returns 403 or redirects. Test the same via `curl` with the member's token against the API directly.
- [ ] **Rate limiting active:** Send 11 rapid POSTs to `/api/auth/login` — the 11th returns HTTP 429
- [ ] **SETUP.md created** with all required env vars and deployment steps
- [ ] **Quick guides printed** and distributed to treasurer, member, and chairman pilot users
- [ ] **Pilot support contacts** assigned and communicated to all pilot users
- [ ] **Helmet security headers verified:** `curl -I https://[api-url]/health` shows `X-Frame-Options`, `X-Content-Type-Options`, `Strict-Transport-Security`, `Referrer-Policy`
- [ ] **Query performance checked:** Run each dashboard query 3 times, note slowest execution. Any query > 100ms needs the missing index applied
