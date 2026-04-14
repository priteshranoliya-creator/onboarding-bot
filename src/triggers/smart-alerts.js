const db = require('../db/client');
const notify = require('../slack/notify');
const { daysFromTodayIST, isWithinDaysIST } = require('../utils/date');
const { getCheckedCount, getTotalItemCount } = require('../slack/checklist');

/**
 * Smart Alerts cron handler.
 * Runs weekly on Monday at 10:30 AM IST (5:00 AM UTC).
 *
 * 1. If checklist items are pending after Day 2 → remind HR in thread
 * 2. Weekly summary: joiners this week, fully onboarded, pending
 */
async function handler(req, res) {
  try {
    const joiners = await db.getJoiners();
    const totalItems = getTotalItemCount();

    // ── Per-joiner pending reminders (joined 2+ days ago, items pending) ──
    let remindersSent = 0;
    for (const joiner of joiners) {
      if (!joiner.joiningDate) continue;
      const daysAgo = daysFromTodayIST(joiner.joiningDate);
      // Only for joiners who joined 2+ days ago (daysAgo <= -2)
      if (daysAgo > -2) continue;

      const state = await db.getChecklistState(joiner.workEmail);
      const checked = getCheckedCount(state);
      const pending = totalItems - checked;

      if (pending > 0) {
        const threadInfo = await db.getSlackThreadInfo(joiner.workEmail);
        if (threadInfo?.threadTs) {
          await notify.postPendingReminder(joiner, threadInfo.threadTs, pending);
          remindersSent++;
        }
      }
    }

    // ── Weekly digest ────────────────────────────────────────────
    let thisWeekCount = 0;
    let fullyOnboarded = 0;
    const pendingList = [];

    for (const joiner of joiners) {
      if (!joiner.joiningDate) continue;
      if (!isWithinDaysIST(joiner.joiningDate, 7)) continue;

      thisWeekCount++;
      const state = await db.getChecklistState(joiner.workEmail);
      const checked = getCheckedCount(state);
      const pending = totalItems - checked;

      if (pending === 0) {
        fullyOnboarded++;
      } else {
        pendingList.push({ name: joiner.name, pending });
      }
    }

    await notify.postWeeklyDigest(thisWeekCount, fullyOnboarded, pendingList);

    // Log
    await db.addLog(
      'System',
      `Smart alerts: ${remindersSent} reminders, weekly digest posted`
    );

    console.log(`Smart alerts: ${remindersSent} reminders, ${thisWeekCount} this week`);
    res.status(200).json({ ok: true, remindersSent, thisWeekCount });
  } catch (err) {
    console.error('Smart alerts cron error:', err);
    res.status(500).json({ error: err.message });
  }
}

module.exports = { handler };
