const { App, ExpressReceiver } = require('@slack/bolt');
const express = require('express');
const config = require('./config');

const receiver = new ExpressReceiver({
  signingSecret: config.SLACK_SIGNING_SECRET,
  processBeforeResponse: true,
  endpoints: '/api/slack',
});

// Ensure the Express app parses JSON bodies for non-Slack routes.
// Must skip /api/slack since Bolt needs the raw body for signature verification.
receiver.app.use((req, res, next) => {
  if (req.path === '/api/slack') return next();
  return express.json({ limit: '1mb' })(req, res, next);
});

const app = new App({
  token: config.SLACK_BOT_TOKEN,
  receiver,
  processBeforeResponse: true,
});

// Register all Slack handlers
require('./slack/checklist').register(app);
require('./slack/commands').register(app);
require('./slack/relay').register(app);

// Handle @bot mentions
app.event('app_mention', async ({ event, say }) => {
  await say({
    thread_ts: event.ts,
    text: "Hi! I'm the onboarding bot. Use `/onboard [name]`, `/checklist [name]`, or `/upcoming` to get started.",
  });
});

module.exports = { app, receiver };
