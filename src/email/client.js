/**
 * SMTP email client (nodemailer) with idempotency.
 */
const nodemailer = require('nodemailer');
const config = require('../config');
const db = require('../db/client');

let transporter = null;
function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.SMTP_HOST,
      port: Number(config.SMTP_PORT),
      secure: Number(config.SMTP_PORT) === 465,
      auth: {
        user: config.SMTP_USER,
        pass: config.SMTP_PASSWORD,
      },
    });
  }
  return transporter;
}

/**
 * Send an email via SMTP with idempotency check.
 * Skips if the same idempotencyKey was already sent successfully.
 */
async function sendEmail({ to, cc, subject, html, idempotencyKey, replyTo, joinerId, template }) {
  // Idempotency check
  if (idempotencyKey) {
    const alreadySent = await db.hasEmailBeenSent(idempotencyKey);
    if (alreadySent) {
      console.log(`Skipping email (already sent): ${idempotencyKey}`);
      return { skipped: true, idempotencyKey };
    }
  }

  // DRY_RUN mode: redirect all emails to test address
  const actualTo = config.DRY_RUN ? (config.DRY_RUN_EMAIL || config.HR_EMAIL) : to;
  const actualCc = config.DRY_RUN ? undefined : (cc || undefined);

  try {
    const info = await getTransporter().sendMail({
      from: config.SMTP_FROM_EMAIL,
      to: actualTo,
      cc: actualCc,
      subject: config.DRY_RUN ? `[DRY RUN] ${subject}` : subject,
      html,
      replyTo: replyTo || config.company.hrContactEmail,
    });

    // Record success
    if (idempotencyKey && joinerId) {
      await db.recordEmailSend({
        joinerId,
        template: template || 'unknown',
        idempotencyKey,
        resendId: info.messageId || '',
        status: 'sent',
      });
    }

    console.log(`Email sent: ${template} → ${actualTo} (${info.messageId})`);
    return { sent: true, messageId: info.messageId };
  } catch (err) {
    console.error(`Email failed: ${template} → ${to}:`, err.message);

    // Record failure
    if (idempotencyKey && joinerId) {
      await db.recordEmailSend({
        joinerId,
        template: template || 'unknown',
        idempotencyKey,
        resendId: '',
        status: 'failed',
      });
    }

    return { sent: false, error: err.message };
  }
}

module.exports = { sendEmail };
