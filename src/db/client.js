/**
 * Database client — PostgreSQL (AWS RDS) via node-postgres.
 * Same exported function signatures as before so callers don't change.
 */
const { Pool } = require('pg');
const config = require('../config');

let pool = null;
function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: config.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
  }
  return pool;
}

async function query(text, params = []) {
  const res = await getPool().query(text, params);
  return res.rows;
}

// ─── Read Joiners ───────────────────────────────────────────

const JOINER_SELECT = `
  SELECT j.*, p.personal_email, p.phone, p.temp_password,
         p.buddy_email, p.pod_leader_email
  FROM joiners j
  LEFT JOIN joiner_pii p ON p.joiner_id = j.id
`;

async function getJoiners() {
  const rows = await query(`${JOINER_SELECT} ORDER BY j.joining_date DESC`);
  return rows.map(mapRow);
}

async function getJoinerByEmail(workEmail) {
  const rows = await query(
    `${JOINER_SELECT} WHERE LOWER(j.work_email) = LOWER($1) LIMIT 1`,
    [workEmail]
  );
  return rows.length ? mapRow(rows[0]) : null;
}

async function getJoinerByName(name) {
  const rows = await query(
    `${JOINER_SELECT} WHERE LOWER(j.name) LIKE LOWER($1) LIMIT 1`,
    [`%${name}%`]
  );
  return rows.length ? mapRow(rows[0]) : null;
}

async function getJoinersJoiningOn(dateStr) {
  const rows = await query(
    `${JOINER_SELECT} WHERE j.joining_date = $1::date`,
    [dateStr]
  );
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
    _id: row.id,
    _status: row.status || '',
  };
}

function formatDateDDMMYYYY(date) {
  // Format the stored DATE value as-is, independent of the runtime TZ.
  // node-pg returns DATE as a JS Date at local midnight; converting via
  // UTC (or local) getters introduces a day shift on Vercel (UTC) vs
  // local IST. Use Intl with Asia/Kolkata so we always get the date the
  // HR team entered, regardless of where this code runs.
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit', month: '2-digit', year: 'numeric',
  }).formatToParts(date);
  const get = (t) => parts.find(p => p.type === t).value;
  return `${get('day')}/${get('month')}/${get('year')}`;
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
  await query(
    `UPDATE joiners
     SET checklist_state = $1::jsonb, updated_at = NOW()
     WHERE LOWER(work_email) = LOWER($2)`,
    [JSON.stringify(state), workEmail]
  );
}

// ─── Slack Thread Tracking ──────────────────────────────────

async function saveSlackThreadInfo(workEmail, threadTs, checklistTs) {
  await query(
    `UPDATE joiners
     SET slack_thread_ts = $1, slack_checklist_ts = $2, updated_at = NOW()
     WHERE LOWER(work_email) = LOWER($3)`,
    [threadTs, checklistTs, workEmail]
  );
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
  const joiningDate = data.joiningDate ? parseJoiningDate(data.joiningDate) : null;

  const result = await query(
    `INSERT INTO joiners (name, role, department, joining_date, mode, pod_name,
       pod_leader_name, work_email, buddy_name, resume_url, status, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
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
     RETURNING id`,
    [
      data.name || '', data.role || '', data.department || '',
      joiningDate, data.mode || '', data.podName || '',
      data.podLeaderName || '', data.workEmail,
      data.buddyName || '', data.resumeUrl || '',
      data.status || 'pending', data.notes || '',
    ]
  );

  const joinerId = result[0].id;

  await query(
    `INSERT INTO joiner_pii (joiner_id, personal_email, phone, temp_password,
       buddy_email, pod_leader_email)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (joiner_id) DO UPDATE SET
       personal_email = EXCLUDED.personal_email,
       phone = EXCLUDED.phone,
       temp_password = EXCLUDED.temp_password,
       buddy_email = EXCLUDED.buddy_email,
       pod_leader_email = EXCLUDED.pod_leader_email`,
    [
      joinerId, data.personalEmail || '', data.phone || '',
      data.tempPassword || '', data.buddyEmail || '',
      data.podLeaderEmail || '',
    ]
  );

  return joinerId;
}

function parseJoiningDate(str) {
  if (!str) return null;
  if (str.includes('/')) {
    const [d, m, y] = str.split('/');
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  const d = new Date(str);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().split('T')[0];
}

// ─── Email Send Tracking ────────────────────────────────────

async function hasEmailBeenSent(idempotencyKey) {
  const rows = await query(
    `SELECT id FROM email_sends
     WHERE idempotency_key = $1 AND status IN ('sent', 'delivered')
     LIMIT 1`,
    [idempotencyKey]
  );
  return rows.length > 0;
}

async function recordEmailSend({ joinerId, template, idempotencyKey, resendId, status }) {
  await query(
    `INSERT INTO email_sends (joiner_id, template, idempotency_key, resend_id, status, sent_at, attempt)
     VALUES ($1, $2, $3, $4, $5, NOW(), 1)
     ON CONFLICT (idempotency_key) DO UPDATE SET
       resend_id = EXCLUDED.resend_id,
       status = EXCLUDED.status,
       sent_at = NOW(),
       attempt = email_sends.attempt + 1`,
    [joinerId, template, idempotencyKey, resendId || '', status]
  );
}

// ─── Audit Log ──────────────────────────────────────────────

async function addLog(employee, action) {
  await query(
    `INSERT INTO events (joiner_id, event_type, payload, actor, occurred_at)
     VALUES (
       (SELECT id FROM joiners WHERE LOWER(name) LIKE LOWER($1) LIMIT 1),
       'log',
       $2::jsonb,
       $3,
       NOW()
     )`,
    [`%${employee}%`, JSON.stringify({ action }), employee]
  );
}

async function addEvent({ joinerId, eventType, payload, actor }) {
  await query(
    `INSERT INTO events (joiner_id, event_type, payload, actor, occurred_at)
     VALUES ($1, $2, $3::jsonb, $4, NOW())`,
    [joinerId, eventType, JSON.stringify(payload || {}), actor || 'system']
  );
}

module.exports = {
  getJoiners,
  getJoinerByEmail,
  getJoinerByName,
  getJoinerRowIndex: async () => -1,
  getConfig,
  getChecklistState,
  updateChecklistState,
  saveSlackThreadInfo,
  getSlackThreadInfo,
  addLog,
  upsertJoiner,
  getJoinersJoiningOn,
  hasEmailBeenSent,
  recordEmailSend,
  addEvent,
};
