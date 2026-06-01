/**
 * One-off: send D-1 onboarding emails for Malay Sheta (id 41).
 * Skips pod leader (no pod leader data) — sends welcome, handbook, buddy + Slack.
 */
require('dotenv').config({ path: '.env.local' });

const db = require('../src/db/client');
const notify = require('../src/slack/notify');
const { sendOnboardingEmails } = require('../src/email/send');

async function run() {
  const joiner = await db.getJoinerByEmail('malay.sheta@devxlabs.ai');
  if (!joiner) { console.error('Joiner not found'); process.exit(1); }

  console.log('Joiner:', joiner.name, '| joining:', joiner.joiningDate, '| mode:', joiner.mode);
  console.log('personalEmail:', joiner.personalEmail);
  console.log('buddyEmail:', joiner.buddyEmail);
  console.log('podLeaderEmail:', joiner.podLeaderEmail || '(empty — skipping pod leader email)');

  const emailResults = await sendOnboardingEmails(joiner);
  console.log('Email results:', JSON.stringify(emailResults, null, 2));

  const { threadTs, checklistTs } = await notify.postAnnouncement(joiner);
  console.log('Slack thread:', threadTs, '| checklist:', checklistTs);

  const initialState = {};
  if (emailResults.welcome?.sent) initialState.welcome_email = true;
  if (emailResults.handbook?.sent) initialState.handbook_email = true;
  if (emailResults.buddy?.sent) initialState.buddy_notified = true;

  await db.saveSlackThreadInfo(joiner.workEmail, threadTs, checklistTs);
  await db.updateChecklistState(joiner.workEmail, initialState);

  await notify.dmBuddy(joiner);
  await notify.dmHr(joiner, threadTs);

  await db.addLog(joiner.name, 'D-1: Emails sent manually (no pod leader) + Slack notifications');

  console.log('Done.');
  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
