// Local dev / Railway entry point.
// Run with: node scripts/server.js
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { app, receiver } = require('../src/bolt');
const config = require('../src/config');

// Add custom routes to the Express app (for local dev / Railway)
const expressApp = receiver.app;

// Webhook from Apps Script (wrapped for body parsing)
expressApp.post('/api/onboard-trigger', require('../src/triggers/onboard').handler);

// Cron endpoints (for manual testing or Railway cron)
expressApp.post('/api/cron/joining-day', require('../src/triggers/joining-day').handler);
expressApp.post('/api/cron/smart-alerts', require('../src/triggers/smart-alerts').handler);

// Health check
expressApp.get('/api/health', (req, res) => res.json({ ok: true, local: true }));

(async () => {
  await app.start(config.PORT);
  console.log(`⚡ Onboarding bot running on port ${config.PORT}`);
})();
