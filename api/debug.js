// Temporary debug endpoint — DELETE after testing
module.exports = (req, res) => {
  res.json({
    hasWebhookSecret: !!process.env.WEBHOOK_SECRET,
    webhookSecretLength: (process.env.WEBHOOK_SECRET || '').length,
    webhookSecretStart: (process.env.WEBHOOK_SECRET || '').substring(0, 6),
    hasSlackToken: !!process.env.SLACK_BOT_TOKEN,
    hasSigningSecret: !!process.env.SLACK_SIGNING_SECRET,
    hasSheetId: !!process.env.GOOGLE_SHEET_ID,
    hasCronSecret: !!process.env.CRON_SECRET,
    nodeEnv: process.env.NODE_ENV,
  });
};
