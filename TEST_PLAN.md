# Final Test Plan — Onboarding Bot

## Important: Manual vs Automatic — they are the SAME

The manual `curl` commands below hit the **exact same code** that runs automatically:

| Manual command | Automatic trigger | Same code? |
|---|---|---|
| `curl /api/cron/daily-onboarding` | Vercel cron at 9 AM IST daily | YES — both call `src/triggers/send-emails.js` |
| `curl /api/list-sync` | Slack Workflow → #bot-sync → bot listener | YES — both call `db.upsertJoiner()` |
| `curl /api/onboard-trigger` | (manual only — ad-hoc override) | Bypasses date checks, sends immediately |

The daily cron URL (`/api/cron/daily-onboarding`) is identical whether Vercel fires it at 9 AM or you fire it manually. No difference in code path.

---

## Prerequisites

```bash
# Your secrets (replace if different)
WEBHOOK_SECRET="a-webhook-secret"
CRON_SECRET="a9f20ff00376ccbf6769bffe4f12d231dce616d9c3a1ed15c1a6be4b130f18f9"
BASE_URL="https://onboarding-bot-taupe.vercel.app"
```

### Before starting: Clean DB

```bash
node -e "
require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);
Promise.all([
  sql\`DELETE FROM email_sends\`,
  sql\`DELETE FROM events\`,
  sql\`DELETE FROM joiner_pii\`,
  sql\`DELETE FROM joiners\`
]).then(() => console.log('DB cleared'));
"
```

### Before starting: Set DRY_RUN

In Vercel env vars:
- `DRY_RUN` = `true`
- `DRY_RUN_EMAIL` = `your-email@devxlabs.ai`

This ensures emails go ONLY to you during testing.

---

## Test 1: Slack List → DB sync

**What it tests:** Workflow fires → message to #bot-sync → bot parses → DB upsert

**Steps:**
1. Go to Slack List → add/edit a test row:
   - Name: `Test Person`
   - Work Email: `test.person@devxlabs.ai`
   - Personal Email: `your-email@gmail.com`
   - Role: `SDE`
   - Joining Date: (set to 7 days from today)
   - Status: `Confirmed`
   - POD Name: `Apex`
   - POD Lead: (pick a real person)
   - Buddy: (pick a real person)

2. Check #bot-sync channel — JOINER_SYNC message should appear

3. Verify DB:
```bash
node -e "
require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);
sql\`SELECT j.id, j.name, j.work_email, j.status, j.joining_date, j.pod_leader_name, j.buddy_name, p.pod_leader_email, p.buddy_email
FROM joiners j LEFT JOIN joiner_pii p ON p.joiner_id = j.id\`.then(r => console.log(JSON.stringify(r, null, 2)));
"
```

4. Verify Slack command:
```
/checklist Test Person
```

**Expected:** Row in DB with status "Confirmed", all fields populated. Slack command returns checklist.

---

## Test 2: D-7 Validation Alert (missing fields)

**What it tests:** Cron finds joiner 7 days out, fields missing → HR gets alert DM

**Setup:** Insert a joiner with missing buddy/tempPassword:
```bash
node -e "
require('dotenv').config({ path: '.env.local' });
const db = require('./src/db/client');
async function run() {
  // Calculate tomorrow's date for D-1 test later, but first test D-7
  const d = new Date(); d.setDate(d.getDate() + 7);
  const dd = String(d.getDate()).padStart(2,'0');
  const mm = String(d.getMonth()+1).padStart(2,'0');
  const yyyy = d.getFullYear();
  const joinerId = await db.upsertJoiner({
    name: 'D7 Test Person',
    workEmail: 'd7test@devxlabs.ai',
    personalEmail: 'your-email@gmail.com',
    role: 'Designer',
    joiningDate: dd+'/'+mm+'/'+yyyy,
    podName: 'Apex',
    podLeaderName: 'Smit Patel',
    podLeaderEmail: 'smit.patel@devxlabs.ai',
    buddyName: '',
    buddyEmail: '',
    tempPassword: '',
    status: 'Confirmed',
  });
  console.log('Created joiner #' + joinerId + ' joining ' + dd+'/'+mm+'/'+yyyy + ' (D-7)');
}
run();
"
```

**Fire cron:**
```bash
curl -s https://onboarding-bot-taupe.vercel.app/api/cron/daily-onboarding \
  -H "Authorization: Bearer a9f20ff00376ccbf6769bffe4f12d231dce616d9c3a1ed15c1a6be4b130f18f9"
```

**Expected:**
- HR (Pooja) gets DM: "⚠️ Action needed — D7 Test Person joins in 7 days. Missing: Buddy Name, Buddy Email, Temp Password"
- NO emails sent
- Response: `{"ok":true,"emailsSent":0,"reminders":0,"welcomes":0,"alerts":1}`

---

## Test 3: D-7 All Fields Ready

**What it tests:** Cron finds joiner 7 days out, all fields present → HR gets confirmation

**Setup:** Fill in the missing fields:
```bash
node -e "
require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);
sql\`UPDATE joiner_pii SET buddy_email = 'pritesh.ranoliya@devxlabs.ai', temp_password = 'Welcome@123' WHERE joiner_id = (SELECT id FROM joiners WHERE work_email = 'd7test@devxlabs.ai')\`.then(() =>
sql\`UPDATE joiners SET buddy_name = 'Pritesh Ranoliya' WHERE work_email = 'd7test@devxlabs.ai'\`).then(() => console.log('Fields filled'));
"
```

**Fire cron again:**
```bash
curl -s https://onboarding-bot-taupe.vercel.app/api/cron/daily-onboarding \
  -H "Authorization: Bearer a9f20ff00376ccbf6769bffe4f12d231dce616d9c3a1ed15c1a6be4b130f18f9"
```

**Expected:**
- HR gets DM: "✅ All set — D7 Test Person joins in 7 days. Emails will be sent on D-1."
- Still NO emails (emails only on D-1)

---

## Test 4: D-1 Emails + Slack DMs

**What it tests:** Full D-1 flow — 4 emails sent + Slack announcement + DM buddy + DM POD leader + DM HR

**Setup:** Change joining date to tomorrow:
```bash
node -e "
require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);
const d = new Date(); d.setDate(d.getDate() + 1);
const iso = d.toISOString().split('T')[0];
sql\`UPDATE joiners SET joining_date = \${iso}::date WHERE work_email = 'd7test@devxlabs.ai'\`.then(() =>
sql\`DELETE FROM email_sends WHERE joiner_id = (SELECT id FROM joiners WHERE work_email = 'd7test@devxlabs.ai')\`).then(() => console.log('Set to tomorrow: ' + iso));
"
```

**Fire cron:**
```bash
curl -s https://onboarding-bot-taupe.vercel.app/api/cron/daily-onboarding \
  -H "Authorization: Bearer a9f20ff00376ccbf6769bffe4f12d231dce616d9c3a1ed15c1a6be4b130f18f9"
```

**Expected:**
- Response: `{"ok":true,"emailsSent":1,...}`
- 4 emails in your inbox (DRY RUN): Welcome, Handbook, Buddy, POD Leader
- #hr-onboarding: New announcement thread + checklist
- Your Slack DM (as buddy): "You've been assigned as joining buddy..."
- Smit Patel's DM (as POD lead): "New POD member — D7 Test Person... suitable time for handshake"
- HR DM: "✅ Onboarding emails sent — D7 Test Person"

---

## Test 5: Idempotency — Run cron again

**What it tests:** Running cron twice does NOT send duplicate emails

**Fire same cron again (no setup change):**
```bash
curl -s https://onboarding-bot-taupe.vercel.app/api/cron/daily-onboarding \
  -H "Authorization: Bearer a9f20ff00376ccbf6769bffe4f12d231dce616d9c3a1ed15c1a6be4b130f18f9"
```

**Expected:**
- Response: `{"ok":true,"emailsSent":0,...}` — zero emails
- HR gets D-1 reminder DM: "🚨 Tomorrow — D7 Test Person joins!"
- NO duplicate emails in inbox
- Verify:
```bash
node -e "
require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);
sql\`SELECT template, status, sent_at FROM email_sends ORDER BY sent_at\`.then(r => console.log(JSON.stringify(r, null, 2)));
"
```
Should show exactly 4 rows (welcome, handbook, buddy, pod_leader) — not 8.

---

## Test 6: D-0 Joining Day

**What it tests:** Welcome in #general + DM joinee + HR notification

**Setup:** Change joining date to today:
```bash
node -e "
require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);
const iso = new Date().toISOString().split('T')[0];
sql\`UPDATE joiners SET joining_date = \${iso}::date WHERE work_email = 'd7test@devxlabs.ai'\`.then(() => console.log('Set to today: ' + iso));
"
```

**Fire cron:**
```bash
curl -s https://onboarding-bot-taupe.vercel.app/api/cron/daily-onboarding \
  -H "Authorization: Bearer a9f20ff00376ccbf6769bffe4f12d231dce616d9c3a1ed15c1a6be4b130f18f9"
```

**Expected:**
- Response: `{"ok":true,...,"welcomes":1}`
- #general: Welcome post for D7 Test Person
- Joinee DM (work email): "Welcome to devx Ai Labs!"
- HR DM: "🎉 D7 Test Person has joined today! Please update status to Joined"
- NO emails sent (emails were on D-1 only)

---

## Test 7: D+2 Follow-up

**What it tests:** If status not "Joined" after 2 days → HR gets nudge

**Setup:** Change joining date to 2 days ago:
```bash
node -e "
require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);
const d = new Date(); d.setDate(d.getDate() - 2);
const iso = d.toISOString().split('T')[0];
sql\`UPDATE joiners SET joining_date = \${iso}::date WHERE work_email = 'd7test@devxlabs.ai'\`.then(() => console.log('Set to 2 days ago: ' + iso));
"
```

**Fire cron:**
```bash
curl -s https://onboarding-bot-taupe.vercel.app/api/cron/daily-onboarding \
  -H "Authorization: Bearer a9f20ff00376ccbf6769bffe4f12d231dce616d9c3a1ed15c1a6be4b130f18f9"
```

**Expected:**
- HR DM: "📝 Follow-up — D7 Test Person joined 2 days ago. Status still Confirmed."
- NO emails, NO Slack welcome messages

---

## Test 8: Joining date change (re-triggers emails)

**What it tests:** If HR changes joining date, new emails are sent for the new date

**Setup:** Change date to a new tomorrow + clear old email_sends:
```bash
node -e "
require('dotenv').config({ path: '.env.local' });
const { neon } = require('@neondatabase/serverless');
const sql = neon(process.env.DATABASE_URL);
const d = new Date(); d.setDate(d.getDate() + 1);
const iso = d.toISOString().split('T')[0];
sql\`UPDATE joiners SET joining_date = \${iso}::date WHERE work_email = 'd7test@devxlabs.ai'\`.then(() => console.log('New date: ' + iso));
"
```

Note: Do NOT clear email_sends. The old idempotency keys had the OLD date. New date = new keys = new emails automatically.

**Fire cron:**
```bash
curl -s https://onboarding-bot-taupe.vercel.app/api/cron/daily-onboarding \
  -H "Authorization: Bearer a9f20ff00376ccbf6769bffe4f12d231dce616d9c3a1ed15c1a6be4b130f18f9"
```

**Expected:**
- Response: `{"ok":true,"emailsSent":1,...}` — NEW emails sent
- 4 more emails in inbox with the NEW joining date in the content

---

## After all tests pass: Go Live

1. Clean DB: delete all test entries
2. In Vercel env: set `DRY_RUN=false` (or delete it)
3. Redeploy
4. HR starts confirming real joiners in Slack List
5. Cron runs automatically at 9 AM IST every day — no manual intervention needed

---

## Quick Reference: Cron Schedule

| Cron | Time | What |
|---|---|---|
| `/api/cron/daily-onboarding` | 3:30 AM UTC / 9:00 AM IST daily | D-7 validation, D-1 emails, D-0 welcome, D+2 follow-up |
| `/api/cron/smart-alerts` | 5:00 AM UTC / 10:30 AM IST Monday | Weekly digest + pending checklist reminders |
