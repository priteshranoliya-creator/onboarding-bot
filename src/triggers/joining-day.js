const db = require('../db/client');
const notify = require('../slack/notify');
const { isTodayIST } = require('../utils/date');

/**
 * D-0 Joining Day cron handler.
 * Runs daily at 9:30 AM IST (4:00 AM UTC).
 * For each joiner whose joining date is today:
 *   1. Post welcome in #general
 *   2. DM the new employee
 *   3. Update the #hr-onboarding thread
 */
async function handler(req, res) {
  try {
    const joiners = await db.getJoiners();
    const configData = await db.getConfig();
    let processed = 0;

    for (const joiner of joiners) {
      if (!joiner.joiningDate || !isTodayIST(joiner.joiningDate)) continue;

      console.log(`D-0 automation for ${joiner.name}`);

      // 1. Post in #general
      await notify.postGeneralWelcome(joiner);

      // 2. DM the new employee (on their work Slack)
      await notify.dmJoinee(joiner, configData);

      // 3. Update #hr-onboarding thread if we have the thread TS
      const threadInfo = await db.getSlackThreadInfo(joiner.workEmail);
      if (threadInfo?.threadTs) {
        await notify.postJoiningDayUpdate(joiner, threadInfo.threadTs);
      }

      // 4. Log
      await db.addLog(joiner.name, 'D-0 Slack automation executed');
      processed++;
    }

    console.log(`D-0 cron: processed ${processed} joiner(s)`);
    res.status(200).json({ ok: true, processed });
  } catch (err) {
    console.error('Joining day cron error:', err);
    res.status(500).json({ error: err.message });
  }
}

module.exports = { handler };
