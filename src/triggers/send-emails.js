/**
 * Combined D-1 + D-0 daily cron handler.
 *
 * D-1 (joining tomorrow):
 *   - Send 4 onboarding emails via Resend
 *   - Post announcement in #hr-onboarding
 *   - DM buddy, POD leader, HR
 *
 * D-0 (joining today):
 *   - Post welcome in #general
 *   - DM the new employee
 *   - Update #hr-onboarding thread
 *
 * Combined into one cron to stay within Vercel Hobby's 2-cron limit.
 */
const db = require('../db/client');
const notify = require('../slack/notify');
const { sendOnboardingEmails } = require('../email/send');
const { isTodayIST, isTomorrowIST } = require('../utils/date');

async function handler(req, res) {
  try {
    const joiners = await db.getJoiners();
    const configData = await db.getConfig();
    let d1Processed = 0;
    let d0Processed = 0;

    for (const joiner of joiners) {
      if (!joiner.joiningDate) continue;

      // ── D-1: Send emails + Slack announcements ──
      if (isTomorrowIST(joiner.joiningDate)) {
        console.log(`D-1 automation for ${joiner.name}`);

        // 1. Send all 4 onboarding emails
        const emailResults = await sendOnboardingEmails(joiner);
        console.log(`  Emails:`, emailResults);

        // 2. Post announcement + checklist in #hr-onboarding
        const { threadTs, checklistTs } = await notify.postAnnouncement(joiner);

        // 3. Save thread info and initial checklist state
        const initialState = {};
        if (emailResults.welcome?.sent) initialState.welcome_email = true;
        if (emailResults.handbook?.sent) initialState.handbook_email = true;
        if (emailResults.buddy?.sent) initialState.buddy_notified = true;
        if (emailResults.podLeader?.sent) initialState.pod_leader_notified = true;

        await db.saveSlackThreadInfo(joiner.workEmail, threadTs, checklistTs);
        await db.updateChecklistState(joiner.workEmail, initialState);

        // 4. DM buddy + POD leader + HR
        await notify.dmBuddy(joiner);
        await notify.dmPodLeader(joiner);
        await notify.dmHr(joiner, threadTs);

        // 5. Log
        await db.addLog(joiner.name, 'D-1 emails sent + Slack notifications');
        d1Processed++;
      }

      // ── D-0: Welcome messages ──
      if (isTodayIST(joiner.joiningDate)) {
        console.log(`D-0 automation for ${joiner.name}`);

        // 1. Post in #general
        await notify.postGeneralWelcome(joiner);

        // 2. DM the new employee
        await notify.dmJoinee(joiner, configData);

        // 3. Update #hr-onboarding thread
        const threadInfo = await db.getSlackThreadInfo(joiner.workEmail);
        if (threadInfo?.threadTs) {
          await notify.postJoiningDayUpdate(joiner, threadInfo.threadTs);
        }

        // 4. Log
        await db.addLog(joiner.name, 'D-0 Slack automation executed');
        d0Processed++;
      }
    }

    console.log(`Daily cron: D-1=${d1Processed}, D-0=${d0Processed}`);
    res.status(200).json({ ok: true, d1Processed, d0Processed });
  } catch (err) {
    console.error('Daily onboarding cron error:', err);
    res.status(500).json({ error: err.message });
  }
}

module.exports = { handler };
