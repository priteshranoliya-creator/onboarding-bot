/**
 * Send all 4 email templates to DRY_RUN_EMAIL for visual testing.
 * Usage: node scripts/test-emails.js
 */
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const { sendEmail } = require('../src/email/client');
const welcomeEmail = require('../src/email/templates/welcome');
const handbookEmail = require('../src/email/templates/handbook');
const buddyEmail = require('../src/email/templates/buddy');
const podLeaderEmail = require('../src/email/templates/pod-leader');
const config = require('../src/config');

const joiner = {
  name: 'Rahul Sharma',
  firstName: 'Rahul',
  workEmail: 'rahul.sharma@devxlabs.ai',
  personalEmail: 'rahul.personal@gmail.com',
  role: 'Software Engineer',
  podName: 'Alpha',
  podLeaderName: 'Smit Patel',
  podLeaderEmail: 'smit.patel@devxlabs.ai',
  buddyName: 'Priya Mehta',
  buddyEmail: 'priya.mehta@devxlabs.ai',
  tempPassword: 'Devx@2026!',
  joiningDateLong: 'Wednesday, 7 May 2026',
  joiningDay: 'Wednesday',
  mode: 'Onsite',
};

const cfg = config.company;

async function main() {
  console.log(`DRY_RUN=${config.DRY_RUN} → sending all emails to ${config.DRY_RUN_EMAIL || config.HR_EMAIL}\n`);

  const templates = [
    { name: 'welcome',    fn: () => welcomeEmail(joiner, cfg) },
    { name: 'handbook',   fn: () => handbookEmail(joiner, cfg) },
    { name: 'buddy',      fn: () => buddyEmail(joiner, cfg) },
    { name: 'pod-leader', fn: () => podLeaderEmail(joiner, cfg) },
  ];

  for (const t of templates) {
    const { subject, html, to } = t.fn();
    console.log(`Sending [${t.name}]  subject: "${subject}"  to: ${to}`);
    const result = await sendEmail({ to, subject, html, template: t.name });
    console.log(`  → ${JSON.stringify(result)}\n`);
  }

  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
