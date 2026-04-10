const { google } = require('googleapis');
const config = require('../config');

let sheetsClient = null;

function getSheets() {
  if (sheetsClient) return sheetsClient;

  const credentials = config.getGoogleCredentials();
  const auth = credentials
    ? new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      })
    : new google.auth.GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });

  sheetsClient = google.sheets({ version: 'v4', auth });
  return sheetsClient;
}

const SHEET_ID = () => config.GOOGLE_SHEET_ID;

// ─── Read Joiners Sheet ──────────────────────────────────────────

async function getJoiners() {
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID(),
    range: 'Joiners!A2:V',
  });
  const rows = res.data.values || [];
  return rows.map(mapJoinerRow);
}

function mapJoinerRow(row) {
  return {
    name: row[0] || '',
    personalEmail: row[1] || '',
    phone: row[2] || '',
    role: row[3] || '',
    department: row[4] || '',
    joiningDate: row[5] || '',
    mode: row[6] || '',
    podName: row[7] || '',
    podLeaderName: row[8] || '',
    podLeaderEmail: row[9] || '',
    workEmail: row[10] || '',
    tempPassword: row[11] || '',
    buddyName: row[12] || '',
    buddyEmail: row[13] || '',
    welcomeEmailSent: row[14] || '',
    handbookEmailSent: row[15] || '',
    buddyNotified: row[16] || '',
    podLeaderNotified: row[17] || '',
    notes: row[18] || '',
    // Extended columns for Slack tracking
    slackThreadTs: row[19] || '',
    slackChecklistTs: row[20] || '',
    checklistState: row[21] || '{}',
  };
}

/** Find a joiner by work email */
async function getJoinerByEmail(workEmail) {
  const joiners = await getJoiners();
  return joiners.find(
    (j) => j.workEmail.toLowerCase() === workEmail.toLowerCase()
  );
}

/** Find a joiner by name (case-insensitive partial match) */
async function getJoinerByName(name) {
  const joiners = await getJoiners();
  const lower = name.toLowerCase();
  return joiners.find((j) => j.name.toLowerCase().includes(lower));
}

/** Get the 1-based row index for a joiner by work email (for updates) */
async function getJoinerRowIndex(workEmail) {
  const joiners = await getJoiners();
  const idx = joiners.findIndex(
    (j) => j.workEmail.toLowerCase() === workEmail.toLowerCase()
  );
  return idx === -1 ? -1 : idx + 2; // +2 for header row and 0-indexing
}

// ─── Read Config Sheet ───────────────────────────────────────────

async function getConfig() {
  const sheets = getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID(),
    range: 'Config!A:B',
  });
  const rows = res.data.values || [];
  const cfg = {};
  for (const [key, val] of rows) {
    if (key) cfg[key.trim()] = (val || '').trim();
  }
  return cfg;
}

// ─── Checklist State ─────────────────────────────────────────────

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
  const rowIndex = await getJoinerRowIndex(workEmail);
  if (rowIndex === -1) return;

  const sheets = getSheets();
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID(),
    range: `Joiners!V${rowIndex}`,
    valueInputOption: 'RAW',
    requestBody: { values: [[JSON.stringify(state)]] },
  });
}

// ─── Slack Thread Tracking ───────────────────────────────────────

async function saveSlackThreadInfo(workEmail, threadTs, checklistTs) {
  const rowIndex = await getJoinerRowIndex(workEmail);
  if (rowIndex === -1) return;

  const sheets = getSheets();
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID(),
    range: `Joiners!T${rowIndex}:U${rowIndex}`,
    valueInputOption: 'RAW',
    requestBody: { values: [[threadTs, checklistTs]] },
  });
}

async function getSlackThreadInfo(workEmail) {
  const joiner = await getJoinerByEmail(workEmail);
  if (!joiner) return null;
  return {
    threadTs: joiner.slackThreadTs,
    checklistTs: joiner.slackChecklistTs,
  };
}

// ─── Logs ────────────────────────────────────────────────────────

async function addLog(employee, action) {
  const sheets = getSheets();
  const timestamp = new Date().toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
  });
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID(),
    range: 'Logs!A:C',
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [[timestamp, employee, action]] },
  });
}

module.exports = {
  getJoiners,
  getJoinerByEmail,
  getJoinerByName,
  getJoinerRowIndex,
  getConfig,
  getChecklistState,
  updateChecklistState,
  saveSlackThreadInfo,
  getSlackThreadInfo,
  addLog,
};
