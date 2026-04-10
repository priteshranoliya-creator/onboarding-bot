const config = require('../config');
const sheets = require('../sheets/client');
const notify = require('../slack/notify');

/**
 * D-1 onboard trigger handler.
 * Called by Apps Script after D-1 emails are sent.
 *
 * Expected body:
 * {
 *   secret: "WEBHOOK_SECRET",
 *   joiner: { name, personalEmail, phone, role, department, joiningDate, mode,
 *             podName, podLeaderName, podLeaderEmail, workEmail, buddyName, buddyEmail },
 *   emailsSent: { welcome, handbook, buddy, podLeader }
 * }
 */
async function handler(req, res) {
  try {
    // Verify webhook secret
    if (req.body?.secret !== config.WEBHOOK_SECRET) {
      return res.status(401).json({
        error: 'Invalid secret',
        debug: {
          receivedType: typeof req.body?.secret,
          receivedLength: (req.body?.secret || '').length,
          receivedStart: (req.body?.secret || '').substring(0, 8),
          expectedSet: !!config.WEBHOOK_SECRET,
          expectedLength: (config.WEBHOOK_SECRET || '').length,
          expectedStart: (config.WEBHOOK_SECRET || '').substring(0, 8),
          bodyType: typeof req.body,
          bodyKeys: Object.keys(req.body || {}),
        },
      });
    }

    const { joiner, emailsSent } = req.body;
    if (!joiner || !joiner.workEmail) {
      return res.status(400).json({ error: 'Missing joiner data' });
    }

    console.log(`D-1 trigger received for ${joiner.name}`);

    // Build initial checklist state from emails already sent
    const initialState = {};
    if (emailsSent?.welcome) initialState.welcome_email = true;
    if (emailsSent?.handbook) initialState.handbook_email = true;
    if (emailsSent?.buddy) initialState.buddy_notified = true;
    if (emailsSent?.podLeader) initialState.pod_leader_notified = true;

    // 1. Post announcement + checklist in #hr-onboarding
    const { threadTs, checklistTs } = await notify.postAnnouncement(joiner);

    // 2. Save thread info and initial checklist state to sheet
    await sheets.saveSlackThreadInfo(joiner.workEmail, threadTs, checklistTs);
    await sheets.updateChecklistState(joiner.workEmail, initialState);

    // 3. DM the joining buddy
    await notify.dmBuddy(joiner);

    // 4. DM the POD leader
    await notify.dmPodLeader(joiner);

    // 5. DM HR with confirmation
    await notify.dmHr(joiner, threadTs);

    // 6. Log
    await sheets.addLog(joiner.name, 'D-1 Slack notifications sent');

    console.log(`D-1 notifications complete for ${joiner.name}`);
    res.status(200).json({ ok: true, threadTs });
  } catch (err) {
    console.error('Onboard trigger error:', err);
    res.status(500).json({ error: err.message });
  }
}

module.exports = { handler };
