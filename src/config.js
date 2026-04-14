module.exports = {
  // Slack
  SLACK_BOT_TOKEN: process.env.SLACK_BOT_TOKEN,
  SLACK_SIGNING_SECRET: process.env.SLACK_SIGNING_SECRET,
  SLACK_HR_CHANNEL: process.env.SLACK_HR_CHANNEL,
  SLACK_GENERAL_CHANNEL: process.env.SLACK_GENERAL_CHANNEL,
  HR_EMAIL: process.env.HR_EMAIL || 'pooja.soni@devxlabs.ai',

  // Secrets
  WEBHOOK_SECRET: process.env.WEBHOOK_SECRET,
  CRON_SECRET: process.env.CRON_SECRET,

  // Database
  DATABASE_URL: process.env.DATABASE_URL,

  // SMTP email
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: process.env.SMTP_PORT || '465',
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASSWORD: process.env.SMTP_PASSWORD,
  SMTP_FROM_EMAIL: process.env.SMTP_FROM_EMAIL || 'onboarding@devxlabs.ai',
  DRY_RUN_EMAIL: process.env.DRY_RUN_EMAIL || '',
  DRY_RUN: process.env.DRY_RUN === 'true',

  // Google Sheets (kept for backfill / transition period)
  GOOGLE_SHEET_ID: process.env.GOOGLE_SHEET_ID,
  getGoogleCredentials() {
    if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
      return JSON.parse(
        Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_KEY, 'base64').toString()
      );
    }
    return null;
  },

  PORT: process.env.PORT || 3000,

  // Company config — hardcoded in src/company-config.js (not env vars)
  company: require('./company-config'),
};
