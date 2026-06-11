# Joiner duplicate-row root cause + proper fix

> **Status:** root cause confirmed in prod (2026-05-19). One-off cleanup done for Megha Desai (deleted id 8, kept id 27). Permanent code fix still pending — implement when ready.

---

## TL;DR

`upsertJoiner` in `src/db/client.js` uses `work_email` as the dedupe key. `work_email` is a **late-arriving, mutable attribute** — not a stable identity. The moment HR provisions an email and re-syncs, the bot can't recognise the row it created earlier (when work_email was NULL) and inserts a fresh duplicate. Megha hit this on 2026-05-19; the bot left two rows for her (ids 8 and 27).

**Proper fix:** stop using `work_email` for identity. Use a stable identifier that exists from the very first sync. Two real options, in order of preference:
1. **Slack List item `record_id`** — Slack assigns this to the row in the Slack List; survives all edits.
2. **`personal_email`** — known from day 1 (offer process), unchanged throughout onboarding.

---

## Incident timeline (Megha Desai)

| Date | JOINER_SYNC payload state | Path in `upsertJoiner` | Result |
|---|---|---|---|
| 2026-05-07 | name + joining_date present; `work_email` empty | A (`work_email IS NULL` branch — match on `(LOWER(name), joining_date)`) | INSERT **id 8** with `work_email = NULL`, status `Offer Accepted` |
| 2026-05-15 | same payload; still no work_email | A (twin found) | UPDATE id 8 |
| 2026-05-19 | HR provisioned work_email `megha.desai@devxlabs.ai`; re-sync from Slack List | **B** (`work_email` present → `INSERT … ON CONFLICT (work_email)`) | No row matches the new `work_email` (id 8 still has NULL). INSERT **id 27**, status `Confirmed`, work_email filled, temp_password set. **Orphan: id 8 left behind.** |

The earlier `fc49433` commit ("Fix dup joiners on null workEmail") only fixed dups **within Path A** (HR re-posting the same null-email row). It did not fix the **A → B handover** that bit Megha. There's also a second small bug — the JOINER_SYNC parser leaks the column-separator `|` into `personal_email` (`meghadesai511@gmail.com|`), which Resend would reject. Fixed in the cleanup; should also be fixed in the parser.

## The bad code path

`src/db/client.js:164-237`:

```js
async function upsertJoiner(data) {
  const workEmail = data.workEmail || null;
  let joinerId;

  if (!workEmail) {
    // Path A: match on (LOWER(name), joining_date, work_email IS NULL)
    // … finds twin or inserts new …
  } else {
    // Path B: INSERT … ON CONFLICT (work_email) DO UPDATE
    // ⚠️  Never looks for a Path-A twin. If the joiner was first synced
    //     without work_email, this creates a duplicate row.
  }
}
```

The conceptual mistake is **treating `work_email` as identity**. It's an attribute that is `NULL` for a meaningful slice of the joiner's lifecycle. Postgres' `NULL ≠ NULL` semantics for unique constraints encode that exactly: a NULL work_email cannot dedupe against anything. The two-path workaround is a kludge layered on top of a wrong primary key.

## Why a stable ID matters

A proper dedupe key must satisfy:
- **Exists from first sync** (so we can match later syncs against earlier ones).
- **Immutable over the joiner's pre-joining lifecycle** (name change, schedule change, work_email assignment, status change should NOT change identity).
- **Globally unique per human.**

`work_email` fails (1) and (2). `(name, joining_date)` fails (2) and (3) — joining_date can be rescheduled and we already have two `Priyanshu`s on 2026-06-01.

## Option 1 — Slack List `record_id` (recommended)

The JOINER_SYNC message is emitted by a Slack Workflow Builder workflow whose trigger is "When an item in this Slack List is added or edited." Slack assigns every list row a permanent `record_id` (looks like `Rec0123ABCD`) that survives renames, edits, status changes — everything.

**Steps:**

1. **Slack side** — open the Workflow Builder workflow that posts JOINER_SYNC to `#bot-sync`. In the "Send a message" step, append the row's `record_id` to the message body, e.g.:
   ```
   JOINER_SYNC
   LIST_ITEM_ID: {{Item ID}}
   NAME: {{Name}}
   …
   ```
   The exact variable name in the trigger ("Item ID" / "record_id" / "ID") depends on the Slack UI for the Lists trigger. Verify by opening the workflow editor and checking the trigger's available variables.

2. **DB migration** — add a stable column with a unique constraint:
   ```sql
   ALTER TABLE joiners ADD COLUMN slack_list_item_id TEXT UNIQUE;
   ```

3. **Parser** (`src/slack/list-sync.js`) — extract `LIST_ITEM_ID` from the message body and pass it through to `upsertJoiner({ slackListItemId, … })`.

4. **Upsert** (`src/db/client.js`) — collapse the two paths into one:
   ```js
   const result = await query(
     `INSERT INTO joiners (slack_list_item_id, name, role, department, joining_date,
        mode, pod_name, pod_leader_name, work_email, buddy_name, resume_url, status, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (slack_list_item_id) DO UPDATE SET
        name = EXCLUDED.name, role = EXCLUDED.role, /* …all fields… */,
        work_email = COALESCE(EXCLUDED.work_email, joiners.work_email),
        updated_at = NOW()
      RETURNING id`,
     [slackListItemId, /* …rest… */]
   );
   ```

5. **Backfill (one-time)** — for existing rows, set `slack_list_item_id` by matching by `personal_email` (or manually for the handful of rows we already have).

**Result:** single dedupe key, one code path, NULL-semantics gone, work_email becomes data not identity. `fc49433`'s null-email-twin handling can be deleted.

## Option 2 — `personal_email` as identity (fallback if Option 1 blocked)

If the Slack trigger doesn't expose `record_id` (it should, but in case the workflow can't be edited or Lists API exposes a different surface), `personal_email` is the next-best stable key. HR knows it from the offer letter — well before work_email is provisioned — and it doesn't change.

**Steps:**

1. **DB migration**:
   ```sql
   CREATE UNIQUE INDEX joiner_pii_personal_email_lower
     ON joiner_pii (LOWER(personal_email))
     WHERE personal_email IS NOT NULL AND personal_email <> '';
   ```

2. **`upsertJoiner`** — first try to find an existing joiner by `personal_email`:
   ```js
   if (data.personalEmail) {
     const existing = await query(
       `SELECT joiner_id FROM joiner_pii WHERE LOWER(personal_email) = LOWER($1) LIMIT 1`,
       [data.personalEmail]
     );
     if (existing.length) {
       joinerId = existing[0].joiner_id;
       await query(`UPDATE joiners SET name=$2, role=$3, …, work_email=COALESCE($N, work_email),
                    updated_at=NOW() WHERE id=$1`, [...]);
     } else {
       // INSERT new joiner + INSERT pii
     }
   } else {
     // fallback: (lower(name), joining_date) for the rare case neither work_email
     // nor personal_email is known yet
   }
   ```

3. **Parser hardening** — strip the trailing `|` bug from `personal_email` at parse time, not at upsert time. Currently the JOINER_SYNC parser is letting the column separator leak into the value.

**Result:** still single-key dedupe, but tied to PII (which is fine — `joiner_pii` already exists). Slightly more complex backfill than Option 1 (need to ensure every legacy row has a clean `personal_email`).

## Option 3 — `(LOWER(name), joining_date)` (the current Path A — do NOT keep)

What the code does today for null-work_email rows. Fails on name collisions (we already have two Priyanshus on the same joining_date) and on date changes. Should be removed once Option 1 or 2 is in place. Documented here only to mark it as the wrong answer.

---

## Belt-and-suspenders DB constraint (regardless of which option)

Even after picking a proper identity, add this so a future bug can't insert two null-work_email rows for the same person:

```sql
CREATE UNIQUE INDEX joiners_null_workemail_dedupe
  ON joiners (LOWER(name), joining_date)
  WHERE work_email IS NULL;
```

Cheap insurance. Costs nothing at write time; rejects the exact duplicate-row shape Megha hit.

## Related cleanup (already done in prod 2026-05-19)

```sql
-- Removed duplicate Megha row
DELETE FROM joiner_pii  WHERE joiner_id = 8;
DELETE FROM events      WHERE joiner_id = 8;
DELETE FROM joiners     WHERE id = 8;

-- Stripped trailing | from personal_email parser bug
UPDATE joiner_pii SET personal_email = rtrim(personal_email, '|') WHERE joiner_id = 27;
```

`email_sends` had no rows for id 8 (no D-1 had fired yet — the cleanup happened in time for tomorrow's 03:30 UTC run).

## Long-term answer: portal ownership

The HRMS portal at `/Users/priteshranoliya/Desktop/hrms` is being built precisely to retire the JOINER_SYNC ingest path. The portal owns joiner writes through `POST /api/joiners` and `PATCH /api/joiners/[id]`, which return the row's stable DB id immediately. No re-parsing of Slack messages, no NULL-vs-present `work_email` two-step. The entire class of bug disappears at Phase 3-4 of `docs/hrms-portal-plan.md`.

Options 1 and 2 above are the right defensive measures **until the portal cutover**. Once the portal owns ingest, the Slack workflow becomes read-only (or is retired), and these dedupe paths become dead code.

---

## Implementation checklist (when you pick this up)

- [ ] Decide Option 1 vs Option 2 (open the Slack Workflow Builder workflow first — confirm `record_id` is exposable).
- [ ] DB migration (add column or index).
- [ ] Parser change (`src/slack/list-sync.js` — extract new field + strip the `|` from personal_email).
- [ ] `upsertJoiner` rewrite — single path, conflict-on-stable-key.
- [ ] Backfill existing rows with the new identifier.
- [ ] Drop the now-dead Path-A code from `fc49433`.
- [ ] Add the `joiners_null_workemail_dedupe` belt-and-suspenders index.
- [ ] Test by re-sending a JOINER_SYNC for an existing joiner with a freshly-assigned work_email — expect UPDATE, not INSERT.
- [ ] Skip-set: add `'offer rolled'` to `src/triggers/send-emails.js` (unrelated to dedupe, but noted in the same review — Priyanshu Arya's row would otherwise get D-1 emails despite the offer being pulled).
