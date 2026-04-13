// Root entry point for Vercel detection.
// Actual API endpoints live in the `api/` folder.
module.exports = (req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({
    service: 'devx-onboarding-bot',
    status: 'ok',
    routes: ['/api/health', '/api/slack', '/api/onboard-trigger', '/api/cron/joining-day', '/api/cron/smart-alerts'],
  }));
};
