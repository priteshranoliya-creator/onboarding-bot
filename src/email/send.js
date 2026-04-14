/**
 * Email orchestrator — sends all 4 D-1 onboarding emails for a joiner.
 * Each email has a deterministic idempotency key so retries never duplicate.
 */
const { sendEmail } = require('./client');
const config = require('../config');
const { formatLong } = require('../utils/date');
const welcomeTemplate = require('./templates/welcome');
const handbookTemplate = require('./templates/handbook');
const buddyTemplate = require('./templates/buddy');
const podLeaderTemplate = require('./templates/pod-leader');

/**
 * Build enriched joiner object with computed fields needed by templates.
 */
function enrichJoiner(joiner) {
  let joiningDateLong = joiner.joiningDate;
  let joiningDay = '';
  try {
    const parts = joiner.joiningDate.split('/');
    if (parts.length === 3) {
      const d = new Date(Date.UTC(parts[2], parts[1] - 1, parts[0]));
      joiningDateLong = formatLong(d);
      joiningDay = d.toLocaleDateString('en-IN', { weekday: 'long', timeZone: 'UTC' });
    }
  } catch { /* keep original */ }

  return {
    ...joiner,
    firstName: (joiner.name || '').split(' ')[0],
    joiningDateLong,
    joiningDay,
  };
}

/**
 * Send all 4 onboarding emails for a joiner.
 * Returns { welcome, handbook, buddy, podLeader } status map.
 */
async function sendOnboardingEmails(joiner) {
  const enriched = enrichJoiner(joiner);
  const cfg = config.company;
  const joinerId = joiner._id;
  const dateKey = joiner.joiningDate || 'unknown';

  const results = {};

  // 1. Welcome email → personal email
  if (enriched.personalEmail) {
    const email = welcomeTemplate(enriched, cfg);
    results.welcome = await sendEmail({
      to: email.to,
      cc: email.cc,
      subject: email.subject,
      html: email.html,
      idempotencyKey: `${enriched.workEmail}:welcome:${dateKey}`,
      joinerId,
      template: 'welcome',
    });
  }

  // 2. Handbook email → personal email
  if (enriched.personalEmail) {
    const email = handbookTemplate(enriched, cfg);
    results.handbook = await sendEmail({
      to: email.to,
      cc: email.cc,
      subject: email.subject,
      html: email.html,
      idempotencyKey: `${enriched.workEmail}:handbook:${dateKey}`,
      joinerId,
      template: 'handbook',
    });
  }

  // 3. Buddy notification → buddy email
  if (enriched.buddyEmail) {
    const email = buddyTemplate(enriched, cfg);
    results.buddy = await sendEmail({
      to: email.to,
      subject: email.subject,
      html: email.html,
      idempotencyKey: `${enriched.workEmail}:buddy:${dateKey}`,
      joinerId,
      template: 'buddy',
    });
  }

  // 4. POD leader notification → pod leader email
  if (enriched.podLeaderEmail) {
    const email = podLeaderTemplate(enriched, cfg);
    results.podLeader = await sendEmail({
      to: email.to,
      subject: email.subject,
      html: email.html,
      idempotencyKey: `${enriched.workEmail}:pod_leader:${dateKey}`,
      joinerId,
      template: 'pod_leader',
    });
  }

  return results;
}

module.exports = { sendOnboardingEmails, enrichJoiner };
