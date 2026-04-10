const { App, ExpressReceiver } = require('@slack/bolt');
const config = require('./config');

const receiver = new ExpressReceiver({
  signingSecret: config.SLACK_SIGNING_SECRET,
  processBeforeResponse: true,
  endpoints: '/api/slack',
});

const app = new App({
  token: config.SLACK_BOT_TOKEN,
  receiver,
  processBeforeResponse: true,
});

// Register all Slack handlers
require('./slack/checklist').register(app);
require('./slack/commands').register(app);

// Handle @bot mentions
app.event('app_mention', async ({ event, say }) => {
  await say({
    thread_ts: event.ts,
    text: "Hi! I'm the onboarding bot. Use `/onboard [name]`, `/checklist [name]`, or `/upcoming` to get started.",
  });
});

module.exports = { app, receiver };
