const config = require('../config');
const db = require('../db/client');
const notify = require('../slack/notify');
const { sendOnboardingEmails } = require('../email/send');

/**
 * D-1 onboard trigger handler.
 * Now sends emails directly via Resend (no longer depends on Apps Script).
 * Can also be called manually via /api/onboard-trigger for ad-hoc triggers.
 *
 * Expected body:
 * {
 *   secret: "WEBHOOK_SECRET",
 *   joiner: { name, personalEmail, phone, role, department, joiningDate, mode,
 *             podName, podLeaderName, podLeaderEmail, workEmail, buddyName, buddyEmail }
 * }
 */
async function handler(req, res) {
  try {
    // Verify webhook secret
    if (req.body?.secret !== config.WEBHOOK_SECRET) {
      return res.status(401).json({ error: 'Invalid secret' });
    }

    const { joiner } = req.body;
    if (!joiner || !joiner.workEmail) {
      return res.status(400).json({ error: 'Missing joiner data' });
    }

    console.log(`D-1 trigger received for ${joiner.name}`);

    // 0. Upsert joiner into DB (in case called directly, not via list-sync)
    const joinerId = await db.upsertJoiner(joiner);
    joiner._id = joinerId;

    // 1. Send all 4 onboarding emails via Resend
    const emailResults = await sendOnboardingEmails(joiner);

    // Build initial checklist state from emails sent
    const initialState = {};
    if (emailResults.welcome?.sent) initialState.welcome_email = true;
    if (emailResults.handbook?.sent) initialState.handbook_email = true;
    if (emailResults.buddy?.sent) initialState.buddy_notified = true;
    if (emailResults.podLeader?.sent) initialState.pod_leader_notified = true;

    // 2. Post announcement + checklist in #hr-onboarding
    const { threadTs, checklistTs } = await notify.postAnnouncement(joiner);

    // 3. Save thread info and initial checklist state
    await db.saveSlackThreadInfo(joiner.workEmail, threadTs, checklistTs);
    await db.updateChecklistState(joiner.workEmail, initialState);

    // 4. DM buddy + POD leader + HR
    await notify.dmBuddy(joiner);
    await notify.dmPodLeader(joiner);
    await notify.dmHr(joiner, threadTs);

    // 5. Log
    await db.addLog(joiner.name, 'D-1 emails sent + Slack notifications');

    console.log(`D-1 notifications complete for ${joiner.name}`);
    res.status(200).json({ ok: true, threadTs, emailResults });
  } catch (err) {
    console.error('Onboard trigger error:', err);
    res.status(500).json({ error: err.message });
  }
}

module.exports = { handler };
