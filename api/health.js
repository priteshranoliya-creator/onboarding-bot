module.exports = (req, res) => res.json({
  ok: true,
  env: {
    WEBHOOK_SECRET_SET: !!process.env.WEBHOOK_SECRET,
    WEBHOOK_SECRET_LEN: (process.env.WEBHOOK_SECRET || '').length,
    WEBHOOK_SECRET_START: (process.env.WEBHOOK_SECRET || '').substring(0, 8),
    SLACK_BOT_TOKEN_SET: !!process.env.SLACK_BOT_TOKEN,
    SLACK_SIGNING_SECRET_SET: !!process.env.SLACK_SIGNING_SECRET,
    GOOGLE_SHEET_ID_SET: !!process.env.GOOGLE_SHEET_ID,
  },
});
