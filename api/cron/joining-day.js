// Vercel cron: runs daily at 4:00 AM UTC (9:30 AM IST).
// Handles D-0 welcome posts and joinee DMs.
const { handler } = require('../../src/triggers/joining-day');

module.exports = async (req, res) => {
  // Verify Vercel cron secret
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  return handler(req, res);
};
