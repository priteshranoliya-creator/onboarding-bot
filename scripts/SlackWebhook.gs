// ============================================================
// SLACK WEBHOOK — Sends joiner data to the Node.js Slack bot
// ============================================================
// Reads webhook URL and secret from Config sheet.
// Called automatically by checkAndSendEmails() in Code.gs.
// ============================================================

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
