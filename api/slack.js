// Vercel serverless handler for all Slack events, actions, and commands.
// Slack sends everything to this single endpoint.
const { receiver } = require('../src/bolt');

module.exports = receiver.app;
