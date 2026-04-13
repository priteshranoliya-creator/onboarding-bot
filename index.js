// Root entry point for Vercel detection.
// Actual API endpoints live in the `api/` folder and are handled separately.
module.exports = (req, res) => {
  res.status(200).json({
    service: 'devx-onboarding-bot',
    status: 'ok',
    routes: ['/api/health', '/api/slack', '/api/onboard-trigger', '/api/cron/joining-day', '/api/cron/smart-alerts'],
  });
};
