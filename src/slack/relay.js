// ─────────────────────────────────────────────────────────────
// POD Leader DM → Bot → Forward to HR
// When a POD Leader replies to the bot's DM with timing/availability,
// forward it to HR with context about which joiner.
// ─────────────────────────────────────────────────────────────

const config = require('../config');
const db = require('../db/client');
const { lookupByEmail, openDM } = require('../utils/lookup');
const { daysFromTodayIST } = require('../utils/date');

function register(app) {
  app.event('message', async ({ event, client }) => {
    // Only handle DMs (channel_type: 'im')
    if (event.channel_type !== 'im') return;
    // Ignore bot messages, edits, deletes
    if (event.subtype) return;
    if (event.bot_id) return;
    if (!event.user || !event.text) return;

    try {
      // Get sender's email
      const userInfo = await client.users.info({ user: event.user });
      const senderEmail = userInfo.user?.profile?.email?.toLowerCase();
      if (!senderEmail) return;

      // Ignore HR's own messages
      if (senderEmail === (config.HR_EMAIL || '').toLowerCase()) return;

      // Find joiners where the sender is the POD leader AND joining is recent/upcoming (±14 days)
      const joiners = await db.getJoiners();
      const matches = joiners.filter((j) => {
        if (!j.joiningDate || !j.podLeaderEmail) return false;
        if (j.podLeaderEmail.toLowerCase() !== senderEmail) return false;
        return Math.abs(daysFromTodayIST(j.joiningDate)) <= 14;
      });

      if (matches.length === 0) return;

      // Forward to HR
      const hrUserId = await lookupByEmail(config.HR_EMAIL);
      if (!hrUserId) return;
      const hrDm = await openDM(hrUserId);

      const joinersList = matches
        .map((j) => `*${j.name}* (${j.role}, joining ${j.joiningDate})`)
        .join(matches.length > 1 ? ' / ' : '');

      const leaderName = matches[0].podLeaderName;

      await client.chat.postMessage({
        channel: hrDm,
        text: `POD Leader ${leaderName} replied about ${matches[0].name}`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `:speech_balloon: *${leaderName}* (POD Leader) responded regarding ${joinersList}:`,
            },
          },
          {
            type: 'section',
            text: { type: 'mrkdwn', text: `>${event.text.replace(/\n/g, '\n>')}` },
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: `Sent via DM from <@${event.user}>`,
              },
            ],
          },
        ],
      });

      // Acknowledge to the POD leader so they know it went through
      await client.chat.postMessage({
        channel: event.channel,
        text: "Thanks! I've shared this with HR.",
      });

      // Log
      await db.addLog(
        matches[0].name,
        `POD Leader reply forwarded to HR: ${event.text.substring(0, 100)}`
      );
    } catch (err) {
      console.error('Relay error:', err);
    }
  });
}

module.exports = { register };
