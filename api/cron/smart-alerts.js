// Vercel cron: runs Mondays at 5:00 AM UTC (10:30 AM IST).
// Posts pending reminders and weekly digest.
const { handler } = require('../../src/triggers/smart-alerts');

module.exports = async (req, res) => {
  // Verify Vercel cron secret
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  return handler(req, res);
};
