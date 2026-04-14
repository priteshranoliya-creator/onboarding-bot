# Notion-Based Onboarding System — Full Research & Plan
# claude --resume 590e1c9d-b220-41ec-b05f-3944077c9c16
---

## The Core Question: Can Notion Replace Everything?

**Short answer: Notion replaces Google Sheets as the HR interface — beautifully. But it cannot replace a real database for automated backend operations.**

Here's why, with numbers:

---

## Notion API — What It Can and Cannot Do

### What works well

| Capability | Details |
|---|---|
| Database CRUD | Full create, read, update, query via API |
| Rich property types | Text, email, phone, date, select, multi-select, relation, files, checkbox, formula, rollup |
| Webhooks (NEW 2025) | Integration webhooks push notifications when pages change — no more polling |
| Webhook actions | Database automations can POST to external URLs when rows change |
| Filtering/sorting | Full programmatic query with filters via API |
| Relations | Link records across databases (joiner → buddy, joiner → POD) |
| Files | Upload resumes, documents directly to rows |
| Human UI | Beautiful, collaborative, permission-controlled — HR lives here naturally |
| Templates | ATS pipeline templates exist in marketplace |

### What doesn't work

| Limitation | Impact |
|---|---|
| **3 requests/second** rate limit (all plans, no upgrade path) | Can't handle burst operations — sending 4 emails + 5 Slack messages + DB updates for one joiner = 12+ API calls = 4 seconds minimum |
| **No transactions** | Two concurrent writes can collide — no rollback if email sends but DB update fails |
| **No batch operations** | Must iterate row-by-row; 50 joiners = 50+ API calls just to read |
| **No SQL queries** | Can't do `SELECT * WHERE joining_date = tomorrow AND welcome_email_sent = false` in one call — must fetch all, filter in code |
| **500KB payload limit** | Fine for onboarding, breaks with large data |
| **No encryption at rest** | PII (temp passwords, personal emails) stored in plaintext |
| **No audit log** | "Who changed Rahul's joining date?" — no answer without building it yourself |
| **Notion outages affect your entire system** | Their status page shows periodic degradation — your emails stop if Notion is down |

---

## Two Viable Architectures

### Architecture A: Notion as UI + Neon Postgres as Backend (Recommended)

```
HR uses Notion ──► Notion webhook ──► Vercel /api/notion-sync ──► Neon Postgres
                                                                       │
                                                          Vercel crons + email
                                                          Slack bot (unchanged)
```

- Notion = where HR sees and edits data (replaces Google Sheets AND Slack List)
- Neon Postgres = where your code reads/writes (fast, reliable, audited)
- Vercel = sends emails via Resend, runs Slack bot, runs crons
- Notion webhooks push changes to Vercel → Vercel syncs to Postgres

**Pros:** Best of both worlds. HR gets Notion UI. Code gets real DB.
**Cons:** Two-way sync adds complexity. But it's one-directional in practice (Notion → Postgres for joiner data, Postgres → Notion for status updates).

### Architecture B: Notion as BOTH UI and Database (Simpler, Riskier)

```
HR uses Notion ──► Notion webhook ──► Vercel /api/notion-trigger
                                            │
                                     Read joiner from Notion API
                                     Send emails via Resend
                                     Post to Slack
                                     Update Notion row (email_sent = true)
```

- Notion = the only data store. No Postgres, no Sheets.
- Vercel crons query Notion API directly for D-1 joiners.
- All state (email sent, checklist progress, Slack thread IDs) stored as Notion properties.

**Pros:** No database to manage. Single source of truth. Simpler mental model.
**Cons:** 3 req/sec limit means slow operations. No transactions. No encryption. If Notion is down, everything stops. Harder to add ATS/resume features later.

### Honest verdict for your scale (~50-200 joiners/year)

**Architecture B works today.** 50-200 joiners/year = 1-4 per week. At that volume, the 3 req/sec limit doesn't hurt. You'll make maybe 20-30 API calls per joiner (read data, send emails, update status, post to Slack) — that's 10 seconds of sequential calls. Acceptable.

**Architecture B breaks when:**
- You add ATS with 500+ candidates/year (not just joiners)
- You add resume auto-fetch scanning 50+ emails/day
- You add 3+ more integrations all hitting Notion API
- You need audit compliance ("prove no one edited this after the fact")

**Recommendation: Start with Architecture B. Migrate to A when you need ATS/resume features.** The migration is clean because your Vercel code already abstracts the data layer — swap `notion.getJoiners()` for `db.getJoiners()` later, same as we planned for Sheets → Postgres.

---

## Architecture B: Full Implementation Plan (Notion-Only)

### What changes from the original migration plan

| Component | Original Plan | Notion Plan |
|---|---|---|
| Data store | Neon Postgres | Notion databases |
| Data layer | `src/db/client.js` | `src/notion/client.js` |
| Ingest webhook | `api/list-sync.js` | `api/notion-sync.js` (Notion webhook) |
| HR interface | Slack List | Notion database |
| Email sending | Resend (same) | Resend (same) |
| Slack bot | Unchanged | Unchanged |
| New npm deps | `@neondatabase/serverless`, `resend` | `@notionhq/client`, `resend` |
| DB setup effort | Provision Neon, write schema, run migration | Create 2 Notion databases, add properties |

**Key simplification: No SQL schema, no migration scripts, no backfill script.** HR creates the Notion database with the right columns, and that's the schema.

---

### Notion Database Design

**Database 1: "Joiners" (main database)**

| Property | Type | Notes |
|---|---|---|
| Name | Title | Required |
| Role | Select | Custom dev, Designer, etc. |
| Department | Select | |
| Job Type | Select | fulltime, intern |
| Joining Date | Date | |
| Status | Status | Offer / Accepted / Joined / Rejected |
| POD Name | Select | |
| POD Leader | Text | |
| POD Leader Email | Email | |
| Work Email | Email | Unique identifier |
| Buddy Name | Text | |
| Buddy Email | Email | |
| Personal Email | Email | PII — restrict database sharing |
| Phone | Phone | PII |
| Temp Password | Text | PII — consider removing after D-0 |
| Resume | Files | Upload PDF directly |
| Mode | Select | WFO / WFH / Hybrid |
| Notes | Rich Text | |
| Welcome Email Sent | Checkbox | Auto-set by bot |
| Handbook Email Sent | Checkbox | Auto-set by bot |
| Buddy Notified | Checkbox | Auto-set by bot |
| POD Leader Notified | Checkbox | Auto-set by bot |
| Slack Thread ID | Text | Auto-set by bot (hidden from HR views) |
| Slack Checklist ID | Text | Auto-set by bot (hidden from HR views) |

**Database 2: "Onboarding Log" (audit trail)**

| Property | Type |
|---|---|
| Joiner | Relation → Joiners |
| Action | Title |
| Actor | Text |
| Timestamp | Date |
| Details | Rich Text |

HR creates these two databases. Bot reads/writes via API. HR never sees the log database unless they want to.

---

### New Config Constants

Move from `Config` sheet tab to `src/config.js`:

```
NOTION_TOKEN          — Notion integration token
NOTION_JOINERS_DB_ID  — Joiners database/data source ID
NOTION_LOG_DB_ID      — Log database/data source ID
RESEND_API_KEY        — Resend API key
RESEND_FROM_EMAIL     — e.g. onboarding@devxlabs.ai
OFFICE_ADDRESS        — from old Config sheet
REPORTING_TIME        — from old Config sheet
HR_CONTACT_NAME       — from old Config sheet
HR_CONTACT_PHONE      — from old Config sheet
HR_CONTACT_EMAIL      — from old Config sheet
PAYROLL_LINK          — from old Config sheet
SLACK_LINK            — from old Config sheet
DOC_UPLOAD_FORM_LINK  — from old Config sheet
ACKNOWLEDGMENT_FORM_LINK
ASSET_POLICY_LINK
REFERRAL_POLICY_LINK
SEPARATION_POLICY_LINK
LEAVE_POLICY_LINK
POSH_POLICY_LINK
REIMBURSEMENT_LINK
WFH_POLICY_LINK
```

These are static company values. Env vars or hardcoded constants — not a DB query.

---

### Phase 0 — Setup (Day 1, ~2 hrs)

- [ ] Create Notion integration at developers.notion.com → get `NOTION_TOKEN`
- [ ] Create "Joiners" database in Notion workspace with all properties above
- [ ] Create "Onboarding Log" database with relation to Joiners
- [ ] Share both databases with the integration (Connections → Add → your integration)
- [ ] Get database IDs (and data source IDs per new API)
- [ ] Provision **Resend** via Vercel Marketplace → `RESEND_API_KEY`
- [ ] Verify `devxlabs.ai` domain in Resend (SPF, DKIM, DMARC DNS records)
- [ ] `npm install @notionhq/client resend`
- [ ] Add all new env vars to Vercel

---

### Phase 1 — Notion Data Layer (Day 1–2, ~4 hrs)

#### New file: `src/notion/client.js`

Drop-in replacement for `src/sheets/client.js`. Same function signatures:

- `getJoiners()` — query Notion Joiners DB, map properties to same joiner object shape
- `getJoinerByEmail(workEmail)` — filter query on Work Email property
- `getJoinerByName(name)` — filter query with contains on Name property
- `getConfig()` — returns hardcoded config from `src/config.js` (no API call)
- `getChecklistState(workEmail)` — parse checkbox properties from joiner page
- `updateChecklistState(workEmail, state)` — update checkbox properties on page
- `saveSlackThreadInfo(workEmail, threadTs, checklistTs)` — update Slack Thread ID + Checklist ID properties
- `getSlackThreadInfo(workEmail)` — read those properties
- `addLog(employee, action)` — create page in Onboarding Log DB
- **NEW:** `updateJoinerProperty(workEmail, property, value)` — generic updater for marking email sent etc.
- **NEW:** `getJoinersJoiningOn(date)` — filter by Joining Date = specific date

**Key difference from Sheets client:** Notion API returns rich property objects. The client normalizes them to the same flat `{ name, personalEmail, phone, role, ... }` shape that all existing code expects. No other file needs to know it's Notion underneath.

---

### Phase 2 — Email Module (Day 2–3, ~4 hrs)

**Identical to original migration plan.** Notion vs Postgres doesn't change email sending.

#### New files (same as before):
- `src/email/client.js` — Resend wrapper
- `src/email/send.js` — orchestrator, sends all 4 emails with idempotency
- `src/email/templates/welcome.js` — port from Code.gs
- `src/email/templates/handbook.js` — port from Code.gs
- `src/email/templates/buddy.js` — port from Code.gs
- `src/email/templates/pod-leader.js` — port from Code.gs

**Idempotency:** Check `Welcome Email Sent` checkbox in Notion before sending. After successful send, set it to `true`. Same for all 4 templates.

---

### Phase 3 — Notion Webhook Ingest (Day 3, ~2 hrs)

#### New file: `api/notion-sync.js`

Notion Integration Webhooks push a payload when a joiner page is created or updated. This endpoint:
- Verifies the webhook signature (Notion signs payloads)
- Extracts the page ID from the payload
- Reads the full page properties via API
- If `Status` changed to "Accepted" or "Joined" → trigger onboarding flow
- Logs the event

#### Notion Integration Webhook setup (manual):
1. Go to developers.notion.com → your integration → Webhooks
2. Add webhook URL: `https://onboarding-bot-taupe.vercel.app/api/notion-sync`
3. Subscribe to events: `page.created`, `page.updated` in the Joiners database

**Alternative (simpler):** Use Notion database automations → webhook action. When Status changes to "Joined", POST to your endpoint. This is no-code and available on paid plans.

---

### Phase 4 — Update Trigger Files (Day 3–4, ~3 hrs)

Same change as original plan, but `sheets` → `notion` instead of `sheets` → `db`:

| File | Change |
|---|---|
| `src/triggers/onboard.js` | `require('../sheets/client')` → `require('../notion/client')`, add email call |
| `src/triggers/joining-day.js` | `require('../sheets/client')` → `require('../notion/client')` |
| `src/triggers/smart-alerts.js` | `require('../sheets/client')` → `require('../notion/client')` |

---

### Phase 5 — D-1 Email Cron (Day 4, ~1 hr)

Same as original plan:
- New `src/triggers/send-emails.js` — calls `notion.getJoinersJoiningOn(tomorrow)`, sends emails
- New `api/cron/send-emails.js` — thin wrapper
- Add to `vercel.json` crons: `{ "path": "/api/cron/send-emails", "schedule": "30 3 * * *" }`

---

### Phase 6 — Slack Commands Update (Day 4, ~1 hr)

| File | Change |
|---|---|
| `src/slack/commands.js` | `sheets/client` → `notion/client` |
| `src/slack/checklist.js` | `sheets/client` → `notion/client` |
| `src/slack/relay.js` | `sheets/client` → `notion/client` |

---

### Phase 7 — Cutover (Day 5)

- [ ] HR populates Notion "Joiners" database with current joiner data (manual or CSV import)
- [ ] Shadow-run: DRY_RUN mode sends emails to HR test address only
- [ ] HR confirms template parity
- [ ] Go live
- [ ] Disable Apps Script cron
- [ ] Remove `googleapis` from package.json after 30 days

---

## What We Skip vs Original Plan

| Original Plan (Neon) | Notion Plan | Effort Saved |
|---|---|---|
| Write SQL schema (4 tables) | Create Notion DBs in UI | ~2 hrs |
| `scripts/migrate.js` | Not needed | ~1 hr |
| `scripts/backfill.js` | CSV import or manual entry | ~2 hrs |
| Neon provisioning + schema | Notion DB creation | ~1 hr |
| PII encryption (pgcrypto) | Not available in Notion | 0 (trade-off, not savings) |
| Audit log table | Notion "Onboarding Log" DB | Same effort |

**Net savings: ~6 hrs.** But you trade away transactions, encryption, and query performance.

---

## File Summary (Notion Plan)

### New files (11)
```
src/notion/client.js
src/email/client.js
src/email/send.js
src/email/templates/welcome.js
src/email/templates/handbook.js
src/email/templates/buddy.js
src/email/templates/pod-leader.js
api/notion-sync.js
api/cron/send-emails.js
src/triggers/send-emails.js
```

### Modified files (9)
```
src/config.js                — add NOTION_TOKEN, NOTION_JOINERS_DB_ID, RESEND vars, inline config constants
src/triggers/onboard.js      — sheets→notion, add email send
src/triggers/joining-day.js  — sheets→notion
src/triggers/smart-alerts.js — sheets→notion
src/slack/commands.js        — sheets→notion
src/slack/checklist.js       — sheets→notion
src/slack/relay.js           — sheets→notion
vercel.json                  — add send-emails cron
package.json                 — add @notionhq/client + resend, remove googleapis
```

### Deleted after 30 days
```
src/sheets/client.js
scripts/Code.gs (archive)
```

---

## Future Features: Resume Fetching + ATS Scoring

### Feature: Automatic Resume Fetching from Gmail

**How it works:**
1. Gmail API watches for emails with resume attachments (PDF/DOC) matching keywords like "resume", "CV", "application"
2. Vercel cron runs every 15 min, calls Gmail API, downloads new attachments
3. Uploads to Notion joiner page Files property (or Vercel Blob for faster access)
4. Links the file in the joiner record

**Implementation:**
- New `src/gmail/client.js` — Gmail API client (service account with domain-wide delegation)
- New `api/cron/fetch-resumes.js` — polls Gmail every 15 min
- New `src/gmail/matcher.js` — matches emails to joiners by sender email or subject line
- Stores in Notion Files property or Vercel Blob + URL in Notion

**Dependencies:** `googleapis` (you already have it — keep it for Gmail only instead of removing)

**When to build:** After core onboarding is stable. This is additive — no changes to existing flow.

### Feature: ATS Score / Resume Quality Filtering

**How it works:**
1. When a resume is uploaded (manually or auto-fetched), trigger scoring
2. Call an AI model (Claude API via Vercel AI Gateway) with the resume text + job description
3. AI returns: match score (0-100), key skills found, missing skills, recommendation
4. Store score + summary in Notion properties
5. Notion view filtered to "Score > 70" shows only good candidates

**Implementation:**
- New `src/ats/score.js` — extracts text from PDF, calls AI, returns structured score
- New Notion properties on Joiners DB: `ATS Score (Number)`, `ATS Summary (Text)`, `Key Skills (Multi-select)`
- Trigger: Notion webhook when Files property changes, or manual `/score [name]` Slack command
- AI provider: Claude via Vercel AI Gateway (free tier or pay-per-use)

**Dependencies:** `@ai-sdk/anthropic` or Vercel AI Gateway, `pdf-parse` for PDF text extraction

**When to build:** After resume fetching works. This depends on having resumes in the system first.

### Feature: Smart Candidate Pipeline View

**How it works:**
- Notion board view: columns = Status (Applied → Screening → Interview → Offer → Accepted → Joined)
- Each card shows: name, role, ATS score, resume link, days since last status change
- HR drags cards between columns
- Webhook fires on status change → triggers appropriate automation

**Implementation:** Pure Notion UI — no code. Just create a Board view on the Joiners database grouped by Status.

**When to build:** Day 1 — it's just a Notion view.

---

## Notion Plan vs Neon Plan — Decision Matrix

| Factor | Notion-Only (Arch B) | Notion + Neon (Arch A) |
|---|---|---|
| **Complexity** | Lower — no SQL, no migration scripts | Higher — 2 data stores to sync |
| **HR experience** | Notion only — beautiful | Notion only — same |
| **Reliability** | Notion uptime dependent | Postgres independent of Notion |
| **PII security** | Plaintext in Notion | Encrypted in Postgres |
| **Rate limits** | 3 req/sec hard cap | Unlimited (Postgres) |
| **Audit trail** | Notion Log DB (good enough) | Postgres events table (production-grade) |
| **ATS/resume features** | Slower API calls, same Notion rate limit | Fast DB queries, Notion just for UI |
| **Cost** | Notion plan only (~$10/user/mo) | Notion + Neon free tier |
| **Migration effort** | ~4 days | ~5 days |
| **When it breaks** | 200+ candidates/year with ATS | Doesn't at this org size |

---

## Recommendation

**Start with Notion-Only (Architecture B).** For 50-200 joiners/year, the rate limit and missing transactions genuinely don't matter. You save ~1 day of setup and skip all database management.

**Upgrade to Notion + Neon (Architecture A) when ANY of these become true:**
- You add ATS with 500+ candidates flowing through per year
- You add resume auto-fetch processing 50+ emails/day
- You get a compliance/audit requirement
- You need PII encryption at rest
- Notion API latency becomes noticeable in Slack command responses

**The upgrade path is clean:** `src/notion/client.js` → `src/db/client.js`. Same function signatures. Same callers. One day of work when the time comes.

---

## Timeline

```
Phase 0    Phase 1      Phase 2    Phase 3      Phase 4      Phase 5    Phase 6    Phase 7
Setup   →  Notion DB →  Email   →  Webhook   →  Triggers  →  D-1 Cron→  Slack   →  Cutover
2 hrs      4 hrs        4 hrs      2 hrs        3 hrs        1 hr       1 hr       1 day
```

**Total: ~4 working days + 1 day cutover** (same as Neon plan)

**Future features (post-launch):**
- Resume auto-fetch: +2-3 days
- ATS scoring: +2-3 days
- Pipeline view: 30 minutes (Notion UI only)
