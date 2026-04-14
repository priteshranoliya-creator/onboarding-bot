/**
 * Slack List → Postgres ingest endpoint.
 * Called by Slack Workflow Builder when a list item is added/changed.
 */
const config = require('../src/config');
const db = require('../src/db/client');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify webhook secret
  const secret = req.headers['x-webhook-secret'] || req.body?.secret;
  if (secret !== config.WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Invalid secret' });
  }

  try {
    const data = req.body;

    if (!data.workEmail && !data.work_email) {
      return res.status(400).json({ error: 'Missing workEmail field' });
    }

    // Normalize field names (Slack Workflow may send either format)
    const joinerData = {
      name: data.name || data.Name || '',
      role: data.role || data.Role || '',
      department: data.department || data.Department || '',
      joiningDate: data.joiningDate || data.joining_date || data['Joining date'] || '',
      mode: data.mode || data.jobType || data['Job Type'] || '',
      podName: data.podName || data.pod_name || data['POD Name'] || '',
      podLeaderName: data.podLeaderName || data.pod_leader || data['POD Leader'] || '',
      podLeaderEmail: data.podLeaderEmail || data.pod_leader_email || data['POD Leader Email'] || '',
      workEmail: data.workEmail || data.work_email || data['Work Email'] || '',
      buddyName: data.buddyName || data.buddy_name || data['Buddy Name'] || '',
      buddyEmail: data.buddyEmail || data.buddy_email || data['Buddy Email'] || '',
      personalEmail: data.personalEmail || data.personal_email || data['Personal Email'] || '',
      phone: data.phone || data.Phone || '',
      tempPassword: data.tempPassword || data.temp_password || data['Temp Password'] || '',
      resumeUrl: data.resumeUrl || data.resume_url || data.Resume || '',
      status: data.status || data.Status || 'pending',
      notes: data.notes || data.Notes || '',
    };

    const joinerId = await db.upsertJoiner(joinerData);

    // Check if this is a new record or update
    await db.addEvent({
      joinerId,
      eventType: 'list_sync',
      payload: { source: 'slack_list', status: joinerData.status },
      actor: 'slack_workflow',
    });

    console.log(`List sync: ${joinerData.name} (${joinerData.workEmail}) → joiner #${joinerId}`);
    res.status(200).json({ ok: true, joinerId });
  } catch (err) {
    console.error('List sync error:', err);
    res.status(500).json({ error: err.message });
  }
};
