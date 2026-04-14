/**
 * Combined D-1 + D-0 daily cron — runs at 3:30 AM UTC (9:00 AM IST).
 * Replaces both api/cron/joining-day.js and the old Apps Script cron.
 */
const config = require('../../src/config');
const { handler } = require('../../src/triggers/send-emails');

module.exports = async (req, res) => {
  // Verify cron secret
  const authHeader = req.headers.authorization || '';
  if (authHeader !== `Bearer ${config.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  return handler(req, res);
};
