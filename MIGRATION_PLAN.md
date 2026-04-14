# Option B: Full Migration Plan
## Google Sheets + Apps Script → Neon Postgres + Resend + Vercel

---

## Why This Migration

Current system relies on Google Sheets as the data store and Google Apps Script as the email orchestrator. Problems:
- No retries, no audit trail, PII (passwords) in plaintext cells
- Not version-controlled — email template changes happen in a browser
- Single point of failure in Apps Script
- Breaks at scale (execution limits, rate limits, no transactions)

**Goal:** Replace Google Sheets with Neon Postgres and Apps Script with Resend + Vercel cron. Keep all existing Slack behaviour (commands, checklist, relay, blocks) exactly as-is. Slack List becomes HR's data-entry surface via a new `/api/list-sync` ingest endpoint.

**New npm dependencies only: `@neondatabase/serverless`, `resend` — nothing else.**

---

## What Changes vs What Stays

| Layer | Current | After Migration |
|---|---|---|
| Data store | Google Sheets (`src/sheets/client.js`) | Neon Postgres (`src/db/client.js`) |
| Email sending | Apps Script `Code.gs` via MailApp | Resend via `src/email/` |
| D-1 trigger | Apps Script calls `/api/onboard-trigger` | New Vercel D-1 cron |
| HR data entry | Google Sheets row | Slack List → `/api/list-sync` |
| Config (office addr, links) | `Config` sheet tab | `src/config.js` constants |

**Unchanged:** `src/slack/` (commands, checklist, relay, notify, blocks), `src/utils/`, `src/bolt.js`, `api/slack.js`, all cron thin wrappers.

---

## New Environment Variables

| Variable | Source | Value |
|---|---|---|
| `DATABASE_URL` | Neon Marketplace (auto-wired) | Neon connection string |
| `RESEND_API_KEY` | Resend Marketplace (auto-wired) | API key |
| `RESEND_FROM_EMAIL` | Set manually | `onboarding@devxlabs.ai` |

---

## Phase 0 — Infrastructure (Day 1, ~2 hrs)

- [ ] Provision **Neon Postgres** via Vercel Marketplace → `DATABASE_URL` auto-added
- [ ] Provision **Resend** via Vercel Marketplace → `RESEND_API_KEY` auto-added
- [ ] Verify `devxlabs.ai` in Resend → add SPF, DKIM, DMARC DNS records
- [ ] Add `RESEND_FROM_EMAIL` to Vercel env
- [ ] `npm install @neondatabase/serverless resend`

---

## Phase 1 — Database Schema + Data Layer (Day 1–2, ~4 hrs)

### New files

#### `src/db/schema.sql`
Four tables:

```
joiners
  id, name, role, department, joining_date (DATE), mode,
  pod_name, pod_leader_name, work_email (UNIQUE), buddy_name,
  resume_url, status, slack_thread_ts, slack_checklist_ts,
  checklist_state (JSONB default '{}'), notes, created_at, updated_at

joiner_pii   ← PII isolated, separate table
  joiner_id FK, personal_email, phone,
  temp_password, buddy_email, pod_leader_email

email_sends  ← idempotency + delivery tracking
  id, joiner_id, template, idempotency_key (UNIQUE),
  sent_at, resend_id, status (queued/sent/delivered/bounced/failed), attempt

events       ← append-only audit log
  id, joiner_id, event_type, payload JSONB, actor, occurred_at
```

#### `scripts/migrate.js`
Runs `schema.sql` against Neon — one-time setup.

#### `scripts/backfill.js`
Reads current Google Sheet → writes all rows into Postgres — one-time migration.

#### `src/db/client.js`
Drop-in replacement for `src/sheets/client.js`. Exports the **exact same function signatures** so callers only change their `require` path:

- `getJoiners()` — joins `joiners` + `joiner_pii`
- `getJoinerByEmail(workEmail)`
- `getJoinerByName(name)` — ILIKE match
- `getConfig()` — returns hardcoded config object (no DB round-trip)
- `getChecklistState(workEmail)`
- `updateChecklistState(workEmail, state)`
- `saveSlackThreadInfo(workEmail, threadTs, checklistTs)`
- `getSlackThreadInfo(workEmail)`
- `addLog(employee, action)` — inserts into `events`
- **NEW:** `upsertJoiner(data)` — for `/api/list-sync`
- **NEW:** `getJoinersJoiningOn(date)` — for D-1 cron

---

## Phase 2 — Email Module (Day 2–3, ~4 hrs)

### New files

#### `src/email/client.js`
Resend client wrapper.
- `sendEmail({ to, subject, html, idempotencyKey, replyTo })`
- Checks `email_sends` table before sending — skips if already sent
- Writes `email_sends` row after sending
- Writes `events` row on success/failure

#### `src/email/templates/welcome.js`
Port of `sendWelcomeEmail` from `Code.gs`.
Variables used: `firstName, joiningDate, joiningDay, workEmail, tempPassword, buddyName, podName, podLeader, officeAddress, reportingTime, hrContactName, hrContactPhone, hrContactEmail, payrollLink, slackLink, docUploadFormLink`

#### `src/email/templates/handbook.js`
Port of `sendHandbookEmail` from `Code.gs`.
Variables used: `firstName, assetPolicyLink, referralPolicyLink, separationPolicyLink, leavePolicyLink, poshPolicyLink, reimbursementLink, wfhPolicyLink, acknowledgmentFormLink`

#### `src/email/templates/buddy.js`
Port of `sendBuddyNotification` from `Code.gs`.
Variables used: `buddyFirstName, fullName, role, podName, joiningDay, joiningDate`

#### `src/email/templates/pod-leader.js`
Port of `sendPodLeaderNotification` from `Code.gs`.
Variables used: `fullName, role`

#### `src/email/send.js`
Main orchestrator.
- `sendOnboardingEmails(joiner)` — sends all 4 emails
- Each email has deterministic idempotency key: `{workEmail}:{template}:{joiningDate}`
- All 4 sends are independent — one failure does not block others
- Returns `{ welcome, handbook, buddy, podLeader }` status map

Config values (office address, policy links, etc.) move from the `Config` sheet tab into `src/config.js` as env-backed constants.

---

## Phase 3 — Ingest Path: Slack List → Vercel (Day 3, ~2 hrs)

### New file: `api/list-sync.js`
- Verifies `x-webhook-secret` header against existing `WEBHOOK_SECRET` env var
- Maps Slack List fields → joiner shape
- Calls `db.upsertJoiner(data)`
- Writes `joiner.created` or `joiner.updated` to `events`
- Returns `200 { ok: true }`

### Slack List columns HR needs to have
```
Name | Job Type | Role | Joining Date | Personal Email | Phone |
Work Email | Temp Password | Buddy Name | Buddy Email |
POD Name | POD Leader | POD Leader Email | Resume | Status
```

### Slack Workflow Builder setup (manual, ~30 min)
1. Open Workflow Builder → New Workflow
2. Trigger: "When a list item is added or changed" on "New Joinees" list
3. Step: Send a webhook → `https://onboarding-bot-taupe.vercel.app/api/list-sync`
4. Header: `x-webhook-secret: {WEBHOOK_SECRET}`
5. Body: map all list fields to JSON

---

## Phase 4 — Update Trigger Files (Day 3–4, ~3 hrs)

Only the `require` path and one added call change. All Slack logic untouched.

### `src/triggers/onboard.js` (modified)
- `require('../sheets/client')` → `require('../db/client')`
- **ADD:** `require('../email/send')` — call `sendOnboardingEmails(joiner)` at start of handler
- All `sheets.*` → `db.*` (same function names, same signatures)
- Remove dependency on `emailsSent` input param (emails now sent here, not by Apps Script)

### `src/triggers/joining-day.js` (modified)
- `require('../sheets/client')` → `require('../db/client')`
- All `sheets.*` → `db.*` — no other changes

### `src/triggers/smart-alerts.js` (modified)
- `require('../sheets/client')` → `require('../db/client')`
- All `sheets.*` → `db.*` — no other changes

---

## Phase 5 — New D-1 Email Cron (Day 4, ~1 hr)

Apps Script's daily 9 AM IST cron becomes a Vercel cron.

### New files

#### `src/triggers/send-emails.js`
- Calls `db.getJoinersJoiningOn(tomorrow)`
- For each joiner: calls `email.sendOnboardingEmails(joiner)`
- After emails sent: calls existing `notify.postAnnouncement()` + `notify.dmBuddy()` + `notify.dmPodLeader()` + `notify.dmHr()` — exactly what `/api/onboard-trigger` does today
- Logs to `events`

#### `api/cron/send-emails.js`
Thin wrapper — same pattern as existing `api/cron/joining-day.js`.

### `vercel.json` (modified)
Add cron entry:
```json
{ "path": "/api/cron/send-emails", "schedule": "30 3 * * *" }
```
(3:30 AM UTC = 9:00 AM IST)

---

## Phase 6 — Slack Commands + Checklist Update (Day 4, ~1 hr)

Three files, same change in each: `require` path only.

| File | Change |
|---|---|
| `src/slack/commands.js` | `sheets/client` → `db/client` |
| `src/slack/checklist.js` | `sheets/client` → `db/client` |
| `src/slack/relay.js` | `sheets/client` → `db/client` |

No logic changes in any of these.

---

## Phase 7 — Cutover + Cleanup (Day 5)

- [ ] Run `scripts/migrate.js` against production Neon
- [ ] Run `scripts/backfill.js` — migrate all Sheet rows → Postgres
- [ ] **Shadow-run:** Set `DRY_RUN=true` — D-1 cron sends emails only to HR test address. HR compares against existing Apps Script email templates.
- [ ] HR approves template parity
- [ ] Set `DRY_RUN=false` — go live on next D-1 joiner
- [ ] Disable Apps Script cron trigger (do not delete yet)
- [ ] Monitor 2 real joiners through the new flow
- [ ] After 30 days: remove `googleapis` from `package.json`, delete `src/sheets/client.js`, remove `GOOGLE_SHEET_ID` + `GOOGLE_SERVICE_ACCOUNT_KEY` from Vercel env

---

## Full File Summary

### New files (13)
```
src/db/schema.sql
src/db/client.js
src/email/client.js
src/email/send.js
src/email/templates/welcome.js
src/email/templates/handbook.js
src/email/templates/buddy.js
src/email/templates/pod-leader.js
api/list-sync.js
api/cron/send-emails.js
src/triggers/send-emails.js
scripts/migrate.js
scripts/backfill.js
```

### Modified files (9)
```
src/config.js                — add 3 new env vars + inline config constants
src/triggers/onboard.js      — sheets→db, add email send call
src/triggers/joining-day.js  — sheets→db only
src/triggers/smart-alerts.js — sheets→db only
src/slack/commands.js        — sheets→db only
src/slack/checklist.js       — sheets→db only
src/slack/relay.js           — sheets→db only
vercel.json                  — add send-emails cron
package.json                 — add 2 deps, remove googleapis (Phase 7)
```

### Deleted after 30-day buffer
```
src/sheets/client.js
scripts/Code.gs  (archive only, do not delete)
```

---

## Execution Timeline

```
Phase 0    Phase 1    Phase 2    Phase 3    Phase 4    Phase 5    Phase 6    Phase 7
Infra   →  DB      →  Email   →  Ingest  →  Triggers→  D-1 Cron→  Slack   →  Cutover
2 hrs      4 hrs      4 hrs      2 hrs      3 hrs      1 hr       1 hr       1 day
```

**Total: ~4 working days implementation + 1 day cutover/validation**

---

## Testing Checklist

| Test | Method |
|---|---|
| DB schema | `scripts/migrate.js` runs cleanly, inspect tables in Neon console |
| Backfill | Run `scripts/backfill.js`, then `/checklist Rahul Sharma` returns same data as Sheet |
| `/api/list-sync` | `curl -X POST` with mock payload → row appears in Neon |
| Email templates | DRY_RUN mode sends to HR test address, HR confirms parity with Apps Script emails |
| D-1 cron | Insert test joiner (joining_date = tomorrow), run `curl /api/cron/send-emails` manually |
| D-0 cron | Insert test joiner (joining_date = today), run `curl /api/cron/joining-day` → #general message |
| `/onboard` command | Returns same output as before |
| Checklist tick | Check a box → Postgres updates, Slack message updates |
| Idempotency | Run D-1 cron twice for same joiner → only 1 email sent (`email_sends` table confirms) |

---

## Rollback Plan

- Google Sheets + Apps Script kept **disabled but intact** for 30 days
- To rollback: change `require('../db/client')` → `require('../sheets/client')` in 6 files + re-enable Apps Script cron
- Neon Postgres has automatic daily backups with point-in-time restore
