const { WebClient } = require('@slack/web-api');
const config = require('../config');

let client = null;
function getClient() {
  if (!client) client = new WebClient(config.SLACK_BOT_TOKEN);
  return client;
}

// Cache email → Slack user ID to avoid hitting rate limits
const cache = new Map();

/**
 * Look up a Slack user ID by their email address.
 * Returns the user ID string, or null if not found.
 */
async function lookupByEmail(email) {
  if (!email) return null;
  const lower = email.toLowerCase();
  if (cache.has(lower)) return cache.get(lower);

  try {
    const res = await getClient().users.lookupByEmail({ email: lower });
    const userId = res.user?.id || null;
    if (userId) cache.set(lower, userId);
    return userId;
  } catch (err) {
    if (err.data?.error === 'users_not_found') {
      cache.set(lower, null);
      return null;
    }
    throw err;
  }
}

/**
 * Open a DM conversation with a user and return the channel ID.
 */
async function openDM(userId) {
  const res = await getClient().conversations.open({ users: userId });
  return res.channel.id;
}

module.exports = { lookupByEmail, openDM };
