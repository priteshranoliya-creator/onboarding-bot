/**
 * Daily Onboarding Cron — runs at 9 AM IST.
 *
 * For each joiner with status "Confirmed":
 *
 *   D-10 to D-2: Validation only — alert HR if fields missing, NO emails
 *   D-3:         Reminder to HR (checklist progress + urgency)
 *   D-1:         Send 4 emails + Slack announcements (if all fields ready)
 *                 If fields STILL missing → urgent alert to HR
 *   D-0:         Welcome messages (#general, DM joinee, DM buddy, DM POD leader)
 *                 Ask HR to mark status as "Joined"
 *   D+2:         If status still not "Joined" → remind HR again
 *
 * Emails are idempotent — safe to run multiple times.
 * If joining date changes, new idempotency keys are generated → new emails sent.
 */
const db = require('../db/client');
const notify = require('../slack/notify');
const { sendOnboardingEmails } = require('../email/send');
const { daysFromTodayIST, formatLong, parseDDMMYYYY } = require('../utils/date');
const { getCheckedCount, getTotalItemCount } = require('../slack/checklist-items');
const config = require('../config');
const { lookupByEmail, openDM } = require('../utils/lookup');
const { WebClient } = require('@slack/web-api');

let slackClient = null;
function getSlack() {
  if (!slackClient) slackClient = new WebClient(config.SLACK_BOT_TOKEN);
  return slackClient;
}

// ─── Required fields for emails ─────────────────────────────

const REQUIRED_FIELDS = [
  { key: 'name', label: 'Name' },
  { key: 'workEmail', label: 'Work Email' },
  { key: 'personalEmail', label: 'Personal Email' },
  { key: 'role', label: 'Role' },
  { key: 'podName', label: 'POD Name' },
  { key: 'podLeaderName', label: 'POD Leader Name' },
  { key: 'podLeaderEmail', label: 'POD Leader Email' },
  { key: 'buddyName', label: 'Buddy Name' },
  { key: 'buddyEmail', label: 'Buddy Email' },
  { key: 'tempPassword', label: 'Temp Password' },
];

function getMissingFields(joiner) {
  return REQUIRED_FIELDS.filter(f => !joiner[f.key] || joiner[f.key].trim() === '');
}

// ─── Main handler ───────────────────────────────────────────

async function handler(req, res) {
  try {
    const joiners = await db.getJoiners();
    const configData = await db.getConfig();
    const stats = { emailsSent: 0, reminders: 0, welcomes: 0, alerts: 0 };
    const d1OnsiteSent = []; // joiners whose D-1 emails fired AND mode === onsite

    for (const joiner of joiners) {
      if (!joiner.joiningDate) continue;

      const daysUntil = daysFromTodayIST(joiner.joiningDate);
      const joiningDateLong = formatJoiningDate(joiner.joiningDate);

      // ── D-10 to D-2: Validation alerts only ────────────────
      if (daysUntil >= 2 && daysUntil <= 10) {
        await handlePreJoiningValidation(joiner, daysUntil, joiningDateLong, stats);
      }

      // ── D-1: Send 4 emails ───────────────────────────────
      if (daysUntil === 1) {
        const sent = await handleD1Emails(joiner, joiningDateLong, stats);
        // Only consolidate Himanshu DM for onsite joiners whose emails fired now.
        // Blank mode is excluded — don't bill expenses for unknown mode.
        if (sent && (joiner.mode || '').toLowerCase().trim() === 'onsite') {
          d1OnsiteSent.push(joiner);
        }
      }

      // ── D-0: Joining day ─────────────────────────────────
      if (daysUntil === 0) {
        await handleJoiningDay(joiner, configData, stats);
      }

      // ── D+2: Post-join follow-up ─────────────────────────
      if (daysUntil === -2) {
        await handlePostJoinFollowup(joiner, stats);
      }
    }

    if (d1OnsiteSent.length > 0) {
      await sendHimanshuExpenseDM(d1OnsiteSent);
    }

    console.log(`Daily cron complete:`, stats);
    res.status(200).json({ ok: true, ...stats });
  } catch (err) {
    console.error('Daily onboarding cron error:', err);
    res.status(500).json({ error: err.message });
  }
}

// ─── D-10 to D-2: Validation only (no emails) ──────────────

async function handlePreJoiningValidation(joiner, daysUntil, joiningDateLong, stats) {
  const missing = getMissingFields(joiner);

  if (missing.length > 0) {
    const missingList = missing.map(f => `• ${f.label}`).join('\n');
    console.log(`D-${daysUntil}: Missing fields for ${joiner.name}:`, missing.map(f => f.key));

    await dmHrAlert(
      `:warning: *Action needed — ${joiner.name} joins in ${daysUntil} days*`,
      `*${joiner.name}* joins on *${joiningDateLong}* but the following info is missing:\n\n${missingList}\n\nEmails will be sent on D-1 (day before joining). Please update the Slack List before then.`
    );
    await db.addLog(joiner.name, `D-${daysUntil}: Missing fields alert — ${missing.map(f => f.key).join(', ')}`);
    stats.alerts++;
  } else if (daysUntil === 10) {
    // D-10: All fields ready — confirm to HR
    await dmHrAlert(
      `:white_check_mark: *All set — ${joiner.name} joins in 10 days*`,
      `All information is complete for *${joiner.name}*.\n*Joining:* ${joiningDateLong}\n*Role:* ${joiner.role} | *POD:* ${joiner.podName}\n*Buddy:* ${joiner.buddyName}\n\nEmails will be sent automatically on D-1.`
    );
    stats.reminders++;
  }

  // D-3: Progress reminder
  if (daysUntil === 3) {
    const emailsAlreadySent = await db.hasEmailBeenSent(`${joiner.workEmail}:welcome:${joiner.joiningDate}`);
    await dmHrAlert(
      `:bell: *Reminder — ${joiner.name} joins in 3 days*`,
      `*Joining:* ${joiningDateLong}\n*Role:* ${joiner.role} | *POD:* ${joiner.podName}\n*Emails:* ${emailsAlreadySent ? 'Already sent :white_check_mark:' : 'Will be sent on D-1'}\n${missing.length > 0 ? `\n:warning: *Still missing:*\n${missing.map(f => '• ' + f.label).join('\n')}` : ':white_check_mark: All fields ready'}`
    );
    stats.reminders++;
  }
}

// ─── D-1: Send emails ──────────────────────────────────────

async function handleD1Emails(joiner, joiningDateLong, stats) {
  const emailsAlreadySent = await db.hasEmailBeenSent(
    `${joiner.workEmail}:welcome:${joiner.joiningDate}`
  );

  if (emailsAlreadySent) {
    // Already sent (e.g. via manual trigger) — just remind
    await dmHrAlert(
      `:rotating_light: *Tomorrow — ${joiner.name} joins!*`,
      `Make sure everything is ready.\n*Role:* ${joiner.role} | *POD:* ${joiner.podName}\n*Buddy:* ${joiner.buddyName || 'Not assigned'}\n*Emails:* Already sent :white_check_mark:`
    );
    stats.reminders++;
    return false;
  }

  const missing = getMissingFields(joiner);

  if (missing.length > 0) {
    // D-1 and fields STILL missing — urgent alert, no emails
    const missingList = missing.map(f => `• ${f.label}`).join('\n');
    await dmHrAlert(
      `:x: *URGENT — ${joiner.name} joins TOMORROW but emails cannot be sent!*`,
      `The following fields are still missing:\n\n${missingList}\n\nPlease update the Slack List *immediately*. The system will retry on the next cron run.`
    );
    await db.addLog(joiner.name, `D-1: URGENT — emails blocked, missing: ${missing.map(f => f.key).join(', ')}`);
    stats.alerts++;
    return false;
  }

  // All fields ready → send 4 emails
  console.log(`D-1: Sending emails for ${joiner.name}`);
  const emailResults = await sendOnboardingEmails(joiner);

  // Post Slack announcement + checklist in #hr-onboarding
  const { threadTs, checklistTs } = await notify.postAnnouncement(joiner);

  const initialState = {};
  if (emailResults.welcome?.sent) initialState.welcome_email = true;
  if (emailResults.handbook?.sent) initialState.handbook_email = true;
  if (emailResults.buddy?.sent) initialState.buddy_notified = true;
  if (emailResults.podLeader?.sent) initialState.pod_leader_notified = true;

  await db.saveSlackThreadInfo(joiner.workEmail, threadTs, checklistTs);
  await db.updateChecklistState(joiner.workEmail, initialState);

  // DM buddy, POD leader, HR
  await notify.dmBuddy(joiner);
  await notify.dmPodLeader(joiner);
  await notify.dmHr(joiner, threadTs);

  await db.addLog(joiner.name, 'D-1: Emails sent + Slack notifications');
  stats.emailsSent++;

  await dmHrAlert(
    `:white_check_mark: *Onboarding emails sent — ${joiner.name}*`,
    `All 4 emails sent successfully. ${joiner.name} joins *tomorrow* (${joiningDateLong}).\n*Role:* ${joiner.role} | *POD:* ${joiner.podName}\n*Buddy:* ${joiner.buddyName}`
  );

  return true;
}

// ─── Himanshu expense DM (consolidated for onsite joiners) ─

async function sendHimanshuExpenseDM(joiners) {
  const n = joiners.length;
  let title, body;

  if (n === 1) {
    const j = joiners[0];
    title = `:money_with_wings: *Expense heads-up — ${j.name} joining tomorrow*`;
    body = `Hi Himanshu,\nThis is to inform you in advance about the expenses scheduled for tomorrow for the new joinee:\n\n*New Joinee Lunch:* ₹300\n*Buddy Lunch:* ₹300\n\nAdditionally, please arrange to add the new joinee to the *Plum account* and load the applicable amount.\n\nThank you.`;
  } else {
    const list = joiners.map(j => `• ${j.name}`).join('\n');
    const lunchTotal = 300 * n;
    title = `:money_with_wings: *Expense heads-up — ${n} new joiners tomorrow*`;
    body = `Hi Himanshu,\nThe following onsite joiners are starting tomorrow:\n\n${list}\n\n*New Joinee Lunch:* ₹${lunchTotal} (₹300 × ${n})\n*Buddy Lunch:* ₹${lunchTotal} (₹300 × ${n})\n\nPlease also add them to the *Plum account* and load the applicable amount for each.\n\nThank you.`;
  }

  await dmUserByEmail('himanshu.velvan@devxlabs.ai', title, body);
  await db.addLog('Himanshu DM', `D-1 expense DM sent for ${n} onsite joiner(s): ${joiners.map(j => j.name).join(', ')}`);
}

// ─── D-0: Joining day ──────────────────────────────────────

async function handleJoiningDay(joiner, configData, stats) {
  console.log(`D-0: Joining day for ${joiner.name}`);

  // Post in #general
  await notify.postGeneralWelcome(joiner);

  // DM the joinee
  await notify.dmJoinee(joiner, configData);

  // Update HR thread
  const threadInfo = await db.getSlackThreadInfo(joiner.workEmail);
  if (threadInfo?.threadTs) {
    await notify.postJoiningDayUpdate(joiner, threadInfo.threadTs);
  }

  // DM HR: mark as joined
  await dmHrAlert(
    `:tada: *${joiner.name} has joined today!*`,
    `Please update status to *"Joined"* in the Slack List.\n*Role:* ${joiner.role} | *POD:* ${joiner.podName}\n*Buddy:* ${joiner.buddyName}`
  );

  await db.addLog(joiner.name, 'D-0: Welcome messages sent');
  stats.welcomes++;
}

// ─── D+2: Post-join follow-up ──────────────────────────────

async function handlePostJoinFollowup(joiner, stats) {
  // Only remind if status is not "Joined"
  if (joiner._status && joiner._status.toLowerCase() === 'joined') return;

  await dmHrAlert(
    `:memo: *Follow-up — ${joiner.name} joined 2 days ago*`,
    `Status is still *"${joiner._status || 'unknown'}"* in the Slack List.\nPlease update it to *"Joined"* if they have started.`
  );

  await db.addLog(joiner.name, 'D+2: Post-join follow-up sent to HR');
  stats.reminders++;
}

// ─── HR DM helper ──────────────────────────────────────────

async function dmHrAlert(title, body) {
  try {
    const hrUserId = await lookupByEmail(config.HR_EMAIL);
    if (!hrUserId) return;
    const hrDm = await openDM(hrUserId);

    await getSlack().chat.postMessage({
      channel: hrDm,
      text: title,
      blocks: [
        {
          type: 'section',
          text: { type: 'mrkdwn', text: title },
        },
        {
          type: 'section',
          text: { type: 'mrkdwn', text: body },
        },
      ],
    });
  } catch (err) {
    console.error('HR alert failed:', err.message);
  }
}

// ─── DM any user by email ──────────────────────────────────

async function dmUserByEmail(email, title, body) {
  try {
    const userId = await lookupByEmail(email);
    if (!userId) return;
    const dm = await openDM(userId);

    await getSlack().chat.postMessage({
      channel: dm,
      text: title,
      blocks: [
        { type: 'section', text: { type: 'mrkdwn', text: title } },
        { type: 'section', text: { type: 'mrkdwn', text: body } },
      ],
    });
  } catch (err) {
    console.error(`DM to ${email} failed:`, err.message);
  }
}

// ─── Utility ───────────────────────────────────────────────

function formatJoiningDate(dateStr) {
  try {
    const d = parseDDMMYYYY(dateStr);
    return formatLong(d);
  } catch {
    return dateStr;
  }
}

module.exports = { handler, handleD1Emails, handleJoiningDay, formatJoiningDate };
