# Migrate from Neon to Self-Hosted PostgreSQL (AWS RDS)

## What Changes

Only **2 files** use the Neon client + **1 script**. Everything else (emails, Slack, crons) is untouched.

| File | Change |
|------|--------|
| `src/db/client.js` | Replace `@neondatabase/serverless` with `pg` (standard Postgres client) |
| `scripts/migrate.js` | Same swap |
| `package.json` | Remove `@neondatabase/serverless`, add `pg` |
| Vercel env | Update `DATABASE_URL` to your AWS RDS connection string |

**Schema, tables, queries — zero changes.** The SQL is standard PostgreSQL, nothing Neon-specific.

---

## Step 1: Set Up AWS RDS PostgreSQL

1. Go to AWS Console → RDS → Create Database
2. Pick **PostgreSQL** (version 15+)
3. Choose **db.t3.micro** (free tier eligible)
4. Set master username + password
5. Enable **Public access** (or use VPC peering with Vercel — advanced)
6. Security Group: allow inbound on port **5432** from `0.0.0.0/0` (or Vercel's IP ranges for production)
7. Note down the **endpoint**: `your-instance.abc123.us-east-1.rds.amazonaws.com`

Your connection string will be:
```
postgresql://username:password@your-instance.abc123.us-east-1.rds.amazonaws.com:5432/onboarding?sslmode=require
```

---

## Step 2: Install `pg`, Remove Neon

```bash
npm uninstall @neondatabase/serverless
npm install pg
```

---

## Step 3: Update `src/db/client.js`

Replace the top section only (lines 1–11):

**Before:**
```js
const { neon } = require('@neondatabase/serverless');
const config = require('../config');

let sql = null;
function getSQL() {
  if (!sql) sql = neon(config.DATABASE_URL);
  return sql;
}
```

**After:**
```js
const { Pool } = require('pg');
const config = require('../config');

let pool = null;
function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: config.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 5,
    });
  }
  return pool;
}
```

Then replace all tagged template queries. The `neon` client uses tagged templates (`sql\`...\``), but `pg` uses `pool.query()`.

**Neon syntax:**
```js
const rows = await db`SELECT * FROM joiners WHERE id = ${id}`;
```

**pg syntax:**
```js
const { rows } = await getPool().query('SELECT * FROM joiners WHERE id = $1', [id]);
```

Every query in `client.js` needs this conversion. There are ~15 queries to convert.

---

## Step 4: Update `scripts/migrate.js`

**Before:**
```js
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);
// ...
for (const stmt of statements) {
  await sql.query(stmt);
}
```

**After:**
```js
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
// ...
for (const stmt of statements) {
  await pool.query(stmt);
}
await pool.end();
```

---

## Step 5: Update Vercel `DATABASE_URL`

Go to Vercel Dashboard → Settings → Environment Variables:

1. Update `DATABASE_URL` to your AWS RDS connection string
2. Remove any Neon-specific vars (`PGHOST`, `PGUSER`, `NEON_PROJECT_ID`, etc.) if present

---

## Step 6: Run Migration + Test

```bash
# Pull new env
vercel env pull .env.local

# Run schema on AWS RDS
node scripts/migrate.js

# Test a Slack command
/checklist Test Person

# Test the cron
curl -s https://onboarding-bot-taupe.vercel.app/api/cron/daily-onboarding \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

---

## Step 7: Remove Neon from Vercel Marketplace (optional)

Vercel Dashboard → Storage → Neon → Disconnect

---

## What Does NOT Change

- `src/db/schema.sql` — same SQL, works on any PostgreSQL
- `src/email/*` — no DB client dependency
- `src/slack/*` — calls `db.getJoiners()` etc., doesn't care what's underneath
- `src/triggers/*` — same
- `vercel.json` — same
- All Slack commands, crons, workflows — same

---

## Checklist

- [ ] AWS RDS instance created
- [ ] `npm uninstall @neondatabase/serverless && npm install pg`
- [ ] `src/db/client.js` updated (Pool + query syntax)
- [ ] `scripts/migrate.js` updated
- [ ] `DATABASE_URL` updated in Vercel env
- [ ] `node scripts/migrate.js` runs successfully
- [ ] `/checklist` command works
- [ ] Cron fires without errors
- [ ] Disconnect Neon from Vercel Marketplace
