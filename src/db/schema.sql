-- Onboarding Bot — Neon Postgres Schema
-- Run via: node scripts/migrate.js

-- Joiners: main record per person
CREATE TABLE IF NOT EXISTS joiners (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  role          TEXT DEFAULT '',
  department    TEXT DEFAULT '',
  joining_date  DATE,
  mode          TEXT DEFAULT '',
  pod_name      TEXT DEFAULT '',
  pod_leader_name TEXT DEFAULT '',
  work_email    TEXT UNIQUE,
  buddy_name    TEXT DEFAULT '',
  resume_url    TEXT DEFAULT '',
  status        TEXT DEFAULT 'pending',
  notes         TEXT DEFAULT '',
  slack_thread_ts   TEXT DEFAULT '',
  slack_checklist_ts TEXT DEFAULT '',
  checklist_state   JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- PII: sensitive fields isolated in separate table
CREATE TABLE IF NOT EXISTS joiner_pii (
  joiner_id       INTEGER PRIMARY KEY REFERENCES joiners(id) ON DELETE CASCADE,
  personal_email  TEXT DEFAULT '',
  phone           TEXT DEFAULT '',
  temp_password   TEXT DEFAULT '',
  buddy_email     TEXT DEFAULT '',
  pod_leader_email TEXT DEFAULT ''
);

-- Email sends: idempotency + delivery tracking
CREATE TABLE IF NOT EXISTS email_sends (
  id              SERIAL PRIMARY KEY,
  joiner_id       INTEGER REFERENCES joiners(id) ON DELETE CASCADE,
  template        TEXT NOT NULL,
  idempotency_key TEXT UNIQUE NOT NULL,
  sent_at         TIMESTAMPTZ,
  resend_id       TEXT DEFAULT '',
  status          TEXT DEFAULT 'queued',
  attempt         INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Events: append-only audit log
CREATE TABLE IF NOT EXISTS events (
  id          SERIAL PRIMARY KEY,
  joiner_id   INTEGER REFERENCES joiners(id) ON DELETE SET NULL,
  event_type  TEXT NOT NULL,
  payload     JSONB DEFAULT '{}',
  actor       TEXT DEFAULT 'system',
  occurred_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_joiners_joining_date ON joiners(joining_date);
CREATE INDEX IF NOT EXISTS idx_joiners_status ON joiners(status);
CREATE INDEX IF NOT EXISTS idx_email_sends_joiner ON email_sends(joiner_id);
CREATE INDEX IF NOT EXISTS idx_email_sends_key ON email_sends(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_events_joiner ON events(joiner_id);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);
