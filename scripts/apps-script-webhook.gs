/**
 * ════════════════════════════════════════════════════════════════
 * SLACK WEBHOOK — Add this to your existing Apps Script project.
 *
 * After your D-1 emails are sent for a joiner, call:
 *   notifySlackBot(joinerRow, emailsSentFlags)
 *
 * This sends a POST to your Node.js onboarding bot.
 * ════════════════════════════════════════════════════════════════
 */

// ─── Config ──────────────────────────────────────────────────────

/**
 * Get the webhook URL and secret from the Config sheet.
 * Add these two rows to your Config sheet:
 *   Slack Bot Webhook URL  |  https://your-app.vercel.app/api/onboard-trigger
 *   Slack Bot Webhook Secret  |  your-secret-here
 */
function getWebhookConfig_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var configSheet = ss.getSheetByName('Config');
  var data = configSheet.getDataRange().getValues();
  var cfg = {};
  for (var i = 0; i < data.length; i++) {
    if (data[i][0]) cfg[data[i][0].toString().trim()] = (data[i][1] || '').toString().trim();
  }
  return {
    url: cfg['Slack Bot Webhook URL'] || '',
    secret: cfg['Slack Bot Webhook Secret'] || '',
  };
}

// ─── Webhook Call ────────────────────────────────────────────────

/**
 * Send joiner data to the Slack onboarding bot.
 *
 * @param {Object} joiner - Joiner data object (see below)
 * @param {Object} emailsSent - Which emails were sent { welcome, handbook, buddy, podLeader }
 */
function notifySlackBot(joiner, emailsSent) {
  var webhook = getWebhookConfig_();
  if (!webhook.url) {
    Logger.log('Slack webhook URL not configured — skipping');
    return;
  }

  var payload = {
    secret: webhook.secret,
    joiner: {
      name: joiner.name,
      personalEmail: joiner.personalEmail,
      phone: joiner.phone,
      role: joiner.role,
      department: joiner.department,
      joiningDate: joiner.joiningDate,
      mode: joiner.mode,
      podName: joiner.podName,
      podLeaderName: joiner.podLeaderName,
      podLeaderEmail: joiner.podLeaderEmail,
      workEmail: joiner.workEmail,
      buddyName: joiner.buddyName,
      buddyEmail: joiner.buddyEmail,
    },
    emailsSent: emailsSent || {},
  };

  var options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  };

  try {
    var response = UrlFetchApp.fetch(webhook.url, options);
    var code = response.getResponseCode();
    var body = response.getContentText();
    Logger.log('Slack webhook response: ' + code + ' — ' + body);

    if (code !== 200) {
      Logger.log('WARNING: Slack webhook returned ' + code);
    }
  } catch (e) {
    Logger.log('Slack webhook error: ' + e.toString());
  }
}

// ─── Integration with your existing sendOnboardingEmails() ──────

/**
 * EXAMPLE: How to integrate with your existing D-1 email function.
 *
 * In your existing sendOnboardingEmails() function, after you send
 * all 4 emails for a joiner, add this call:
 *
 *   // After all emails are sent for this row:
 *   notifySlackBot(
 *     {
 *       name:           row[0],   // Column A
 *       personalEmail:  row[1],   // Column B
 *       phone:          row[2],   // Column C
 *       role:           row[3],   // Column D
 *       department:     row[4],   // Column E
 *       joiningDate:    Utilities.formatDate(row[5], 'Asia/Kolkata', 'dd/MM/yyyy'),  // Column F
 *       mode:           row[6],   // Column G
 *       podName:        row[7],   // Column H
 *       podLeaderName:  row[8],   // Column I
 *       podLeaderEmail: row[9],   // Column J
 *       workEmail:      row[10],  // Column K
 *       buddyName:      row[12],  // Column M
 *       buddyEmail:     row[13],  // Column N
 *     },
 *     {
 *       welcome:   welcomeEmailSent,    // boolean
 *       handbook:  handbookEmailSent,    // boolean
 *       buddy:     buddyNotified,        // boolean
 *       podLeader: podLeaderNotified,    // boolean
 *     }
 *   );
 */

// ─── Manual Test ─────────────────────────────────────────────────

/**
 * Test the webhook with a dummy joiner.
 * Run this manually from the Apps Script editor to verify connectivity.
 */
function testSlackWebhook() {
  notifySlackBot(
    {
      name: 'Test User',
      personalEmail: 'test@gmail.com',
      phone: '9876543210',
      role: 'Test Engineer',
      department: 'Engineering',
      joiningDate: '22/04/2026',
      mode: 'Offline',
      podName: 'Atlas',
      podLeaderName: 'Sneha Mehta',
      podLeaderEmail: 'sneha@devxlabs.ai',
      workEmail: 'test@devxlabs.ai',
      buddyName: 'Priya Patel',
      buddyEmail: 'priya@devxlabs.ai',
    },
    {
      welcome: true,
      handbook: true,
      buddy: true,
      podLeader: true,
    }
  );
}
