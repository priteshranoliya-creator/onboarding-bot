require('dotenv').config();

const { app, receiver } = require('./src/bolt');
const config = require('./src/config');

// Add custom routes to the Express app (for local dev / Railway)
const expressApp = receiver.app;

// Webhook from Apps Script
expressApp.post('/api/onboard-trigger', require('./src/triggers/onboard').handler);

// Cron endpoints (for manual testing or Railway cron)
expressApp.post('/api/cron/joining-day', require('./src/triggers/joining-day').handler);
expressApp.post('/api/cron/smart-alerts', require('./src/triggers/smart-alerts').handler);

// Health check
expressApp.get('/api/health', (req, res) => res.json({ ok: true }));

(async () => {
  await app.start(config.PORT);
  console.log(`⚡ Onboarding bot running on port ${config.PORT}`);
})();
