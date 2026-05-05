// ─────────────────────────────────────────────────────────────
// Slack List → #bot-sync channel → DB
// Picks up JOINER_SYNC messages posted by Workflow Builder,
// resolves People-type fields (<@U123>) to name + email,
// and upserts the joiner into Postgres.
// ─────────────────────────────────────────────────────────────

const db = require('../db/client');
const config = require('../config');

const BOT_SYNC_CHANNEL = config.SLACK_BOT_SYNC_CHANNEL;

function register(app) {
  app.event('message', async ({ event, client }) => {
    // Only handle messages in #bot-sync
    if (event.channel !== BOT_SYNC_CHANNEL) return;
    // Ignore edits, deletes — but ALLOW bot_message (Workflow Builder posts as bot)
    if (event.subtype && event.subtype !== 'bot_message') return;
    // Must start with JOINER_SYNC marker
    if (!event.text || !event.text.startsWith('JOINER_SYNC')) return;

    try {
      console.log('JOINER_SYNC message received');

      // Parse key: value lines
      // Handles both "key: value" on one line AND "key:\nvalue" across lines
      const lines = event.text.split('\n').slice(1); // skip "JOINER_SYNC"
      const data = {};
      const knownKeys = [
        'name', 'workEmail', 'personalEmail', 'mode', 'role',
        'joiningDate', 'resumeUrl', 'status', 'buddy', 'location',
        'podLeader', 'podName', 'department', 'phone', 'tempPassword',
      ];
      let currentKey = null;
      for (const line of lines) {
        const colonIdx = line.indexOf(':');
        if (colonIdx > 0) {
          const possibleKey = line.slice(0, colonIdx).trim();
          if (knownKeys.includes(possibleKey)) {
            currentKey = possibleKey;
            const value = line.slice(colonIdx + 1).trim();
            data[currentKey] = value;
            continue;
          }
        }
        // Line without a key — append to current key if value was empty
        if (currentKey && !data[currentKey] && line.trim()) {
          data[currentKey] = line.trim();
        }
      }

      // Clean Slack-mangled values:
      //  - <mailto:a@b.com|a@b.com> → a@b.com
      //  - <http://example.com|example.com> → example.com
      //  - HTML entities (&amp; &lt; &gt; &quot; &#39;) → real chars
      // Slack auto-linkifies anything that looks like a URL/email and
      // HTML-escapes special characters in plain text. Both must be
      // reversed before storing, otherwise tempPassword and emails
      // arrive corrupt (e.g. "abc&amp;" instead of "abc&").
      for (const key of Object.keys(data)) {
        if (typeof data[key] !== 'string') continue;
        let v = data[key];
        v = v.replace(/<mailto:([^|>]+)\|[^>]+>/g, '$1');
        v = v.replace(/<mailto:([^>]+)>/g, '$1');
        v = v.replace(/<https?:\/\/[^|>]+\|([^>]+)>/g, '$1');
        v = v.replace(/<(https?:\/\/[^>]+)>/g, '$1');
        v = decodeHtmlEntities(v);
        data[key] = v;
      }

      if (!data.workEmail) {
        console.warn('JOINER_SYNC: missing workEmail, skipping');
        return;
      }

      // Skip only genuinely dead entries — sync everything else (Pending, Offer Accepted, Confirmed, etc.)
      // so HR gets D-7→D-1 alerts even if they forgot to mark Confirmed.
      const SKIP_STATUSES = ['rejected', 'declined', 'not interested', 'withdrawn', 'offer declined'];
      const status = (data.status || '').toLowerCase();
      if (SKIP_STATUSES.includes(status)) {
        console.log(`JOINER_SYNC: skipping ${data.name} (status: ${data.status})`);
        return;
      }

      // Resolve People-type fields: <@U123ABC> or @Name → { name, email }
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
 * Input can be: "<@U0ABC123>", "@Smit Patel", "John Doe", or empty.
 */
async function resolveUser(client, raw) {
  const empty = { name: '', email: '' };
  if (!raw) return empty;

  // Try 1: Extract user ID from <@U123> or <@U123|name> format
  const match = raw.match(/<@(U[A-Z0-9]+)(?:\|[^>]*)?>/);
  if (match) {
    return await lookupById(client, match[1], raw);
  }

  // Try 2: Handle @Name format (Workflow Builder People fields)
  const cleanName = raw.startsWith('@') ? raw.slice(1).trim() : raw.trim();
  if (!cleanName) return empty;

  // Try to find user by searching workspace members
  try {
    const res = await client.users.list({ limit: 500 });
    const members = res.members || [];
    const found = members.find(m => {
      if (m.deleted || m.is_bot) return false;
      const real = (m.real_name || '').toLowerCase();
      const display = (m.profile?.display_name || '').toLowerCase();
      const target = cleanName.toLowerCase();
      return real === target || display === target;
    });

    if (found) {
      return {
        name: found.real_name || found.profile?.display_name || cleanName,
        email: found.profile?.email || '',
      };
    }
  } catch (err) {
    console.warn(`Could not search users for "${cleanName}":`, err.message);
  }

  // Fallback: return the name as-is, no email
  return { name: cleanName, email: '' };
}

async function lookupById(client, userId, fallbackName) {
  try {
    const res = await client.users.info({ user: userId });
    const profile = res.user?.profile || {};
    return {
      name: res.user?.real_name || profile.real_name || profile.display_name || '',
      email: profile.email || '',
    };
  } catch (err) {
    console.warn(`Could not resolve user ${userId}:`, err.message);
    return { name: fallbackName || '', email: '' };
  }
}

function decodeHtmlEntities(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

module.exports = { register };
