/**
 * Daily Onboarding Cron — runs at 9 AM IST.
 *
 * For each joiner with status "Confirmed":
 *
 *   D-7 to D-1:  Try sending 4 emails (if all fields ready)
 *                 If fields missing → alert HR, retry next day automatically
 *   D-3:         Reminder to HR (checklist progress)
 *   D-1:         Final reminder to HR
 *   D-0:         Welcome messages (#general, DM joinee, update HR thread)
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

    for (const joiner of joiners) {
      if (!joiner.joiningDate) continue;

      const daysUntil = daysFromTodayIST(joiner.joiningDate);
      const joiningDateLong = formatJoiningDate(joiner.joiningDate);

      // ── D-7 to D-1: Send emails or alert HR ──────────────
      if (daysUntil >= 1 && daysUntil <= 7) {
        await handlePreJoining(joiner, daysUntil, joiningDateLong, configData, stats);
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

    console.log(`Daily cron complete:`, stats);
    res.status(200).json({ ok: true, ...stats });
  } catch (err) {
    console.error('Daily onboarding cron error:', err);
    res.status(500).json({ error: err.message });
  }
}

// ─── D-7 to D-1: Emails + Validation ───────────────────────

async function handlePreJoining(joiner, daysUntil, joiningDateLong, configData, stats) {
  const emailsAlreadySent = await db.hasEmailBeenSent(
    `${joiner.workEmail}:welcome:${joiner.joiningDate}`
  );

  // Try sending emails if not sent yet
  if (!emailsAlreadySent) {
    const missing = getMissingFields(joiner);

    if (missing.length === 0) {
      // All fields ready → send emails
      console.log(`D-${daysUntil}: Sending emails for ${joiner.name}`);
      const emailResults = await sendOnboardingEmails(joiner);

      // Post Slack announcement + checklist
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

      await db.addLog(joiner.name, `D-${daysUntil}: Emails sent + Slack notifications`);
      stats.emailsSent++;

      // Notify HR: emails sent successfully
      await dmHrAlert(
        `:white_check_mark: *Onboarding emails sent — ${joiner.name}*`,
        `All 4 onboarding emails sent successfully.\n*Joining:* ${joiningDateLong} (${daysUntil} days away)\n*Role:* ${joiner.role} | *POD:* ${joiner.podName}`
      );
    } else {
      // Missing fields → alert HR
      const missingList = missing.map(f => `• ${f.label}`).join('\n');
      console.log(`D-${daysUntil}: Missing fields for ${joiner.name}:`, missing.map(f => f.key));

      await dmHrAlert(
        `:warning: *Onboarding blocked — ${joiner.name}*`,
        `*${joiner.name}* joins in *${daysUntil} days* (${joiningDateLong}) but emails are NOT sent.\n\n*Missing information:*\n${missingList}\n\nPlease update the Slack List. I'll retry automatically tomorrow.`
      );
      await db.addLog(joiner.name, `D-${daysUntil}: Emails blocked — missing: ${missing.map(f => f.key).join(', ')}`);
      stats.alerts++;
    }
  }

  // D-3 reminder (only if emails already sent)
  if (daysUntil === 3 && emailsAlreadySent) {
    const state = await db.getChecklistState(joiner.workEmail);
    const checked = getCheckedCount(state);
    const total = getTotalItemCount();

    await dmHrAlert(
      `:bell: *Reminder — ${joiner.name} joins in 3 days*`,
      `*Joining:* ${joiningDateLong}\n*Checklist:* ${checked}/${total} items completed\n*Emails:* Sent :white_check_mark:`
    );
    stats.reminders++;
  }

  // D-1 final reminder
  if (daysUntil === 1) {
    if (emailsAlreadySent) {
      await dmHrAlert(
        `:rotating_light: *Tomorrow — ${joiner.name} joins!*`,
        `Make sure everything is ready for *${joiner.name}*.\n*Role:* ${joiner.role} | *POD:* ${joiner.podName}\n*Buddy:* ${joiner.buddyName || 'Not assigned'}`
      );
    } else {
      // Last chance — emails still not sent
      await dmHrAlert(
        `:x: *URGENT — ${joiner.name} joins TOMORROW but emails not sent!*`,
        `Onboarding emails were never sent for *${joiner.name}*.\nPlease check the Slack List immediately and ensure all fields are filled.\n\nThe system will make one final attempt tonight.`
      );
    }
    stats.reminders++;
  }
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
    `Please update status to *"Joined"* in the Slack List.\n*Role:* ${joiner.role} | *POD:* ${joiner.podName}`
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

// ─── Utility ───────────────────────────────────────────────

function formatJoiningDate(dateStr) {
  try {
    const d = parseDDMMYYYY(dateStr);
    return formatLong(d);
  } catch {
    return dateStr;
  }
}

module.exports = { handler };
