module.exports = {
  SLACK_BOT_TOKEN: process.env.SLACK_BOT_TOKEN,
  SLACK_SIGNING_SECRET: process.env.SLACK_SIGNING_SECRET,
  SLACK_HR_CHANNEL: process.env.SLACK_HR_CHANNEL,
  SLACK_GENERAL_CHANNEL: process.env.SLACK_GENERAL_CHANNEL,
  HR_EMAIL: process.env.HR_EMAIL || 'pooja.soni@devxlabs.ai',
  GOOGLE_SHEET_ID: process.env.GOOGLE_SHEET_ID,
  WEBHOOK_SECRET: process.env.WEBHOOK_SECRET,
  CRON_SECRET: process.env.CRON_SECRET,
  PORT: process.env.PORT || 3000,

  getGoogleCredentials() {
    if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
      return JSON.parse(
        Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_KEY, 'base64').toString()
      );
    }
    return null;
  },
};
