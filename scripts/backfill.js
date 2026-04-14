/**
 * One-time backfill: reads all joiner rows from Google Sheet → writes to Neon Postgres.
 * Usage: node scripts/backfill.js
 *
 * Requires both DATABASE_URL and GOOGLE_SERVICE_ACCOUNT_KEY + GOOGLE_SHEET_ID in .env.
 */
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();
const sheets = require('../src/sheets/client');
const db = require('../src/db/client');

async function backfill() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL not set');
    process.exit(1);
  }
  if (!process.env.GOOGLE_SHEET_ID) {
    console.error('GOOGLE_SHEET_ID not set — needed to read source data');
    process.exit(1);
  }

  console.log('Reading joiners from Google Sheets...');
  const joiners = await sheets.getJoiners();
  console.log(`Found ${joiners.length} joiner(s)`);

  let success = 0;
  let failed = 0;

  for (const j of joiners) {
    if (!j.workEmail) {
      console.warn(`  Skipping row without work email: ${j.name}`);
      failed++;
      continue;
    }

    try {
      const joinerId = await db.upsertJoiner({
        name: j.name,
        role: j.role,
        department: j.department,
        joiningDate: j.joiningDate,
        mode: j.mode,
        podName: j.podName,
        podLeaderName: j.podLeaderName,
        podLeaderEmail: j.podLeaderEmail,
        workEmail: j.workEmail,
        buddyName: j.buddyName,
        buddyEmail: j.buddyEmail,
        personalEmail: j.personalEmail,
        phone: j.phone,
        tempPassword: j.tempPassword,
        resumeUrl: '',
        status: 'backfilled',
        notes: j.notes,
      });

      // Preserve existing Slack thread info and checklist state
      if (j.slackThreadTs || j.slackChecklistTs) {
        await db.saveSlackThreadInfo(j.workEmail, j.slackThreadTs, j.slackChecklistTs);
      }
      if (j.checklistState && j.checklistState !== '{}') {
        try {
          const state = JSON.parse(j.checklistState);
          await db.updateChecklistState(j.workEmail, state);
        } catch { /* skip invalid JSON */ }
      }

      console.log(`  ✓ ${j.name} (${j.workEmail}) → joiner #${joinerId}`);
      success++;
    } catch (err) {
      console.error(`  ✗ ${j.name} (${j.workEmail}): ${err.message}`);
      failed++;
    }
  }

  console.log(`\nBackfill complete: ${success} succeeded, ${failed} failed`);
}

backfill().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
