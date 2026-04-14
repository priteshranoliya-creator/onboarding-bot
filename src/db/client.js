/**
 * Database client — drop-in replacement for src/sheets/client.js.
 * Same exported function signatures so callers only change their require path.
 */
const { neon } = require('@neondatabase/serverless');
const config = require('../config');

let sql = null;
function getSQL() {
  if (!sql) sql = neon(config.DATABASE_URL);
  return sql;
}

// ─── Read Joiners ───────────────────────────────────────────

async function getJoiners() {
  const db = getSQL();
  const rows = await db`
    SELECT j.*, p.personal_email, p.phone, p.temp_password,
           p.buddy_email, p.pod_leader_email
    FROM joiners j
    LEFT JOIN joiner_pii p ON p.joiner_id = j.id
    ORDER BY j.joining_date DESC
  `;
  return rows.map(mapRow);
}

async function getJoinerByEmail(workEmail) {
  const db = getSQL();
  const rows = await db`
    SELECT j.*, p.personal_email, p.phone, p.temp_password,
           p.buddy_email, p.pod_leader_email
    FROM joiners j
    LEFT JOIN joiner_pii p ON p.joiner_id = j.id
    WHERE LOWER(j.work_email) = LOWER(${workEmail})
    LIMIT 1
  `;
  return rows.length ? mapRow(rows[0]) : null;
}

async function getJoinerByName(name) {
  const db = getSQL();
  const rows = await db`
    SELECT j.*, p.personal_email, p.phone, p.temp_password,
           p.buddy_email, p.pod_leader_email
    FROM joiners j
    LEFT JOIN joiner_pii p ON p.joiner_id = j.id
    WHERE LOWER(j.name) LIKE LOWER(${`%${name}%`})
    LIMIT 1
  `;
  return rows.length ? mapRow(rows[0]) : null;
}

async function getJoinersJoiningOn(dateStr) {
  const db = getSQL();
  const rows = await db`
    SELECT j.*, p.personal_email, p.phone, p.temp_password,
           p.buddy_email, p.pod_leader_email
    FROM joiners j
    LEFT JOIN joiner_pii p ON p.joiner_id = j.id
    WHERE j.joining_date = ${dateStr}::date
  `;
  return rows.map(mapRow);
}

// ─── Map DB row → same shape as old sheets client ───────────

function mapRow(row) {
  const joiningDate = row.joining_date
    ? formatDateDDMMYYYY(new Date(row.joining_date))
    : '';
  return {
    name: row.name || '',
    personalEmail: row.personal_email || '',
    phone: row.phone || '',
    role: row.role || '',
    department: row.department || '',
    joiningDate,
    mode: row.mode || '',
    podName: row.pod_name || '',
    podLeaderName: row.pod_leader_name || '',
    podLeaderEmail: row.pod_leader_email || '',
    workEmail: row.work_email || '',
    tempPassword: row.temp_password || '',
    buddyName: row.buddy_name || '',
    buddyEmail: row.buddy_email || '',
    welcomeEmailSent: '',
    handbookEmailSent: '',
    buddyNotified: '',
    podLeaderNotified: '',
    notes: row.notes || '',
    slackThreadTs: row.slack_thread_ts || '',
    slackChecklistTs: row.slack_checklist_ts || '',
    checklistState: typeof row.checklist_state === 'string'
      ? row.checklist_state
      : JSON.stringify(row.checklist_state || {}),
    // Extra fields for internal use
    _id: row.id,
    _status: row.status || '',
  };
}

function formatDateDDMMYYYY(date) {
  const d = String(date.getUTCDate()).padStart(2, '0');
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const y = date.getUTCFullYear();
  return `${d}/${m}/${y}`;
}

// ─── Config (hardcoded — no DB round-trip) ──────────────────

async function getConfig() {
  return config.company;
}

// ─── Checklist State ────────────────────────────────────────

async function getChecklistState(workEmail) {
  const joiner = await getJoinerByEmail(workEmail);
  if (!joiner) return {};
  try {
    return JSON.parse(joiner.checklistState);
  } catch {
    return {};
  }
}

async function updateChecklistState(workEmail, state) {
  const db = getSQL();
  await db`
    UPDATE joiners
    SET checklist_state = ${JSON.stringify(state)}::jsonb,
        updated_at = NOW()
    WHERE LOWER(work_email) = LOWER(${workEmail})
  `;
}

// ─── Slack Thread Tracking ──────────────────────────────────

async function saveSlackThreadInfo(workEmail, threadTs, checklistTs) {
  const db = getSQL();
  await db`
    UPDATE joiners
    SET slack_thread_ts = ${threadTs},
        slack_checklist_ts = ${checklistTs},
        updated_at = NOW()
    WHERE LOWER(work_email) = LOWER(${workEmail})
  `;
}

async function getSlackThreadInfo(workEmail) {
  const joiner = await getJoinerByEmail(workEmail);
  if (!joiner) return null;
  return {
    threadTs: joiner.slackThreadTs,
    checklistTs: joiner.slackChecklistTs,
  };
}

// ─── Upsert Joiner (for /api/list-sync) ────────────────────

async function upsertJoiner(data) {
  const db = getSQL();

  // Parse joining date from various formats
  let joiningDate = null;
  if (data.joiningDate) {
    joiningDate = parseJoiningDate(data.joiningDate);
  }

  // Upsert main joiner record
  const result = await db`
    INSERT INTO joiners (name, role, department, joining_date, mode, pod_name,
      pod_leader_name, work_email, buddy_name, resume_url, status, notes)
    VALUES (
      ${data.name || ''}, ${data.role || ''}, ${data.department || ''},
      ${joiningDate}, ${data.mode || ''}, ${data.podName || ''},
      ${data.podLeaderName || ''}, ${data.workEmail},
      ${data.buddyName || ''}, ${data.resumeUrl || ''},
      ${data.status || 'pending'}, ${data.notes || ''}
    )
    ON CONFLICT (work_email) DO UPDATE SET
      name = EXCLUDED.name,
      role = EXCLUDED.role,
      department = EXCLUDED.department,
      joining_date = EXCLUDED.joining_date,
      mode = EXCLUDED.mode,
      pod_name = EXCLUDED.pod_name,
      pod_leader_name = EXCLUDED.pod_leader_name,
      buddy_name = EXCLUDED.buddy_name,
      resume_url = EXCLUDED.resume_url,
      status = EXCLUDED.status,
      notes = EXCLUDED.notes,
      updated_at = NOW()
    RETURNING id
  `;

  const joinerId = result[0].id;

  // Upsert PII
  await db`
    INSERT INTO joiner_pii (joiner_id, personal_email, phone, temp_password,
      buddy_email, pod_leader_email)
    VALUES (
      ${joinerId}, ${data.personalEmail || ''}, ${data.phone || ''},
      ${data.tempPassword || ''}, ${data.buddyEmail || ''},
      ${data.podLeaderEmail || ''}
    )
    ON CONFLICT (joiner_id) DO UPDATE SET
      personal_email = EXCLUDED.personal_email,
      phone = EXCLUDED.phone,
      temp_password = EXCLUDED.temp_password,
      buddy_email = EXCLUDED.buddy_email,
      pod_leader_email = EXCLUDED.pod_leader_email
  `;

  return joinerId;
}

function parseJoiningDate(str) {
  if (!str) return null;
  // Handle DD/MM/YYYY
  if (str.includes('/')) {
    const [d, m, y] = str.split('/');
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  // Handle ISO or other common formats
  const d = new Date(str);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().split('T')[0];
}

// ─── Email Send Tracking ────────────────────────────────────

async function hasEmailBeenSent(idempotencyKey) {
  const db = getSQL();
  const rows = await db`
    SELECT id FROM email_sends
    WHERE idempotency_key = ${idempotencyKey}
      AND status IN ('sent', 'delivered')
    LIMIT 1
  `;
  return rows.length > 0;
}

async function recordEmailSend({ joinerId, template, idempotencyKey, resendId, status }) {
  const db = getSQL();
  await db`
    INSERT INTO email_sends (joiner_id, template, idempotency_key, resend_id, status, sent_at, attempt)
    VALUES (${joinerId}, ${template}, ${idempotencyKey}, ${resendId || ''}, ${status}, NOW(), 1)
    ON CONFLICT (idempotency_key) DO UPDATE SET
      resend_id = EXCLUDED.resend_id,
      status = EXCLUDED.status,
      sent_at = NOW(),
      attempt = email_sends.attempt + 1
  `;
}

// ─── Audit Log ──────────────────────────────────────────────

async function addLog(employee, action) {
  const db = getSQL();
  await db`
    INSERT INTO events (joiner_id, event_type, payload, actor, occurred_at)
    VALUES (
      (SELECT id FROM joiners WHERE LOWER(name) LIKE LOWER(${`%${employee}%`}) LIMIT 1),
      'log',
      ${JSON.stringify({ action })}::jsonb,
      ${employee},
      NOW()
    )
  `;
}

async function addEvent({ joinerId, eventType, payload, actor }) {
  const db = getSQL();
  await db`
    INSERT INTO events (joiner_id, event_type, payload, actor, occurred_at)
    VALUES (${joinerId}, ${eventType}, ${JSON.stringify(payload || {})}::jsonb, ${actor || 'system'}, NOW())
  `;
}

// ─── Exports (same signatures as sheets/client.js) ──────────

module.exports = {
  getJoiners,
  getJoinerByEmail,
  getJoinerByName,
  getJoinerRowIndex: async () => -1, // not needed with DB, kept for compat
  getConfig,
  getChecklistState,
  updateChecklistState,
  saveSlackThreadInfo,
  getSlackThreadInfo,
  addLog,
  // New
  upsertJoiner,
  getJoinersJoiningOn,
  hasEmailBeenSent,
  recordEmailSend,
  addEvent,
};
