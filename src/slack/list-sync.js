// ─────────────────────────────────────────────────────────────
// Slack List → #bot-sync channel → DB
// Picks up JOINER_SYNC messages posted by Workflow Builder,
// resolves People-type fields (<@U123>) to name + email,
// and upserts the joiner into Postgres.
// ─────────────────────────────────────────────────────────────

const db = require('../db/client');

const BOT_SYNC_CHANNEL = 'C0ATTDDNCJU';

function register(app) {
  app.event('message', async ({ event, client }) => {
    // Only handle messages in #bot-sync
    if (event.channel !== BOT_SYNC_CHANNEL) return;
    // Ignore edits, deletes, bot thread replies
    if (event.subtype) return;
    // Must start with JOINER_SYNC marker
    if (!event.text || !event.text.startsWith('JOINER_SYNC')) return;

    try {
      console.log('JOINER_SYNC message received');

      // Parse key: value lines
      const lines = event.text.split('\n').slice(1); // skip "JOINER_SYNC"
      const data = {};
      for (const line of lines) {
        const colonIdx = line.indexOf(':');
        if (colonIdx === -1) continue;
        const key = line.slice(0, colonIdx).trim();
        const value = line.slice(colonIdx + 1).trim();
        if (key && value) data[key] = value;
      }

      if (!data.workEmail) {
        console.warn('JOINER_SYNC: missing workEmail, skipping');
        return;
      }

      // Resolve People-type fields: <@U123ABC> → { name, email }
      const buddy = await resolveUser(client, data.buddy);
      const podLeader = await resolveUser(client, data.podLeader);

      const joinerData = {
        name: data.name || '',
        workEmail: data.workEmail,
        personalEmail: data.personalEmail || '',
        phone: data.phone || '',
        role: data.role || '',
        joiningDate: data.joiningDate || '',
        mode: data.mode || '',
        podName: data.podName || '',
        podLeaderName: podLeader.name,
        podLeaderEmail: podLeader.email,
        buddyName: buddy.name,
        buddyEmail: buddy.email,
        tempPassword: data.tempPassword || '',
        resumeUrl: data.resumeUrl || '',
        status: data.status || 'pending',
        department: data.department || '',
        notes: '',
      };

      const joinerId = await db.upsertJoiner(joinerData);

      await db.addEvent({
        joinerId,
        eventType: 'list_sync',
        payload: { source: 'slack_list', status: joinerData.status },
        actor: 'slack_workflow',
      });

      console.log(`JOINER_SYNC: ${joinerData.name} (${joinerData.workEmail}) → joiner #${joinerId}`);

      // React with checkmark so HR knows it worked
      await client.reactions.add({
        channel: event.channel,
        timestamp: event.ts,
        name: 'white_check_mark',
      });
    } catch (err) {
      console.error('JOINER_SYNC error:', err);
      // React with X so HR knows it failed
      try {
        await client.reactions.add({
          channel: event.channel,
          timestamp: event.ts,
          name: 'x',
        });
      } catch { /* ignore reaction error */ }
    }
  });
}

/**
 * Resolve a Slack People-type field to { name, email }.
 * Input can be: "<@U0ABC123>", "U0ABC123", "John Doe", or empty.
 */
async function resolveUser(client, raw) {
  const empty = { name: '', email: '' };
  if (!raw) return empty;

  // Extract user ID from <@U123> or <@U123|name> format
  const match = raw.match(/<@(U[A-Z0-9]+)(?:\|[^>]*)?>/);
  const userId = match ? match[1] : null;

  if (!userId) {
    // Not a People-type value — treat as plain text name
    return { name: raw, email: '' };
  }

  try {
    const res = await client.users.info({ user: userId });
    const profile = res.user?.profile || {};
    const name = res.user?.real_name || profile.real_name || profile.display_name || '';
    const email = profile.email || '';
    return { name, email };
  } catch (err) {
    console.warn(`Could not resolve user ${userId}:`, err.message);
    return { name: raw, email: '' };
  }
}

module.exports = { register };
