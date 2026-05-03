/**
 * Manually trigger the D-1 onboarding flow for a specific joiner.
 *
 * Usage:
 *   node scripts/trigger-d1.js <work_email>
 *   node scripts/trigger-d1.js denish.kheni@devxlabs.ai
 *
 * Runs the exact same flow as the daily cron's D-1 step:
 *   - Sends 4 onboarding emails (welcome, handbook, buddy, POD leader)
 *   - Posts Slack announcement + checklist in #hr-onboarding
 *   - DMs buddy, POD leader, HR
 *   - DMs admin/finance about expenses
 *   - Saves slack_thread_ts so D-0 cron can update the thread
 *
 * Idempotent — safe to re-run; already-sent emails are skipped.
 */
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const db = require('../src/db/client');
const { handleD1Emails, formatJoiningDate } = require('../src/triggers/send-emails');

async function main() {
  const workEmail = process.argv[2];
  if (!workEmail) {
    console.error('Usage: node scripts/trigger-d1.js <work_email>');
    process.exit(1);
  }

  const joiner = await db.getJoinerByEmail(workEmail);
  if (!joiner) {
    console.error(`No joiner found with work_email = ${workEmail}`);
    process.exit(1);
  }

  console.log(`Triggering D-1 flow for ${joiner.name} (${joiner.workEmail})`);
  console.log(`Joining date: ${joiner.joiningDate}`);

  const stats = { emailsSent: 0, reminders: 0, alerts: 0 };
  const joiningDateLong = formatJoiningDate(joiner.joiningDate);

  await handleD1Emails(joiner, joiningDateLong, stats);

  console.log('Done:', stats);
  process.exit(0);
}

main().catch((err) => {
  console.error('Manual D-1 trigger failed:', err);
  process.exit(1);
});
