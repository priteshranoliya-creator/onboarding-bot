// ============================================================
// devx Ai Labs — ONBOARDING EMAIL AUTOMATION
// ============================================================
// ALL fire on D-1 (day before joining):
//   Email 1: Welcome + Credentials    → Joinee personal email
//   Email 2: Handbook + Policies       → Joinee personal email
//   Buddy Notification                 → Buddy work email
//   POD Leader Notification            → POD Leader work email
// ============================================================

const SHEET_NAME = 'Joiners';
const CONFIG_SHEET = 'Config';

const COL = {
  FULL_NAME: 0,          // A
  PERSONAL_EMAIL: 1,     // B
  PHONE: 2,              // C
  ROLE: 3,               // D
  DEPARTMENT: 4,         // E
  JOINING_DATE: 5,       // F
  MODE: 6,               // G
  POD_NAME: 7,           // H
  POD_LEADER: 8,         // I
  POD_LEADER_EMAIL: 9,   // J
  WORK_EMAIL: 10,        // K
  TEMP_PASSWORD: 11,     // L
  BUDDY_NAME: 12,        // M
  BUDDY_EMAIL: 13,       // N
  EMAIL_1_SENT: 14,      // O (auto)
  EMAIL_2_SENT: 15,      // P (auto)
  BUDDY_NOTIFIED: 16,    // Q (auto)
  POD_NOTIFIED: 17,      // R (auto)
  NOTES: 18,             // S
};


// ============================================================
// MAIN — Runs daily via trigger
// ============================================================
function checkAndSendEmails() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);
  const config = getConfig(ss);
  const data = sheet.getDataRange().getValues();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const joiningDate = new Date(row[COL.JOINING_DATE]);
    joiningDate.setHours(0, 0, 0, 0);

    if (!row[COL.FULL_NAME] || !row[COL.PERSONAL_EMAIL] || !row[COL.JOINING_DATE]) continue;

    const daysUntilJoining = Math.round((joiningDate - today) / (1000 * 60 * 60 * 24));
    const rowNum = i + 1;
    const joiner = buildJoinerData(row, joiningDate);

    if (daysUntilJoining === 1) {
      // Track which emails are sent in this run
      var welcomeSent = false;
      var handbookSent = false;
      var buddySent = false;
      var podLeaderSent = false;

      try {
        if (!row[COL.EMAIL_1_SENT]) {
          sendWelcomeEmail(joiner, config);
          markSent(sheet, rowNum, COL.EMAIL_1_SENT + 1);
          logAction(joiner.fullName, 'Welcome email sent to ' + joiner.personalEmail);
          welcomeSent = true;
        }
        if (!row[COL.EMAIL_2_SENT]) {
          sendHandbookEmail(joiner, config);
          markSent(sheet, rowNum, COL.EMAIL_2_SENT + 1);
          logAction(joiner.fullName, 'Handbook email sent to ' + joiner.personalEmail);
          handbookSent = true;
        }
        if (joiner.buddyEmail && !row[COL.BUDDY_NOTIFIED]) {
          sendBuddyNotification(joiner, config);
          markSent(sheet, rowNum, COL.BUDDY_NOTIFIED + 1);
          logAction(joiner.fullName, 'Buddy notification sent to ' + joiner.buddyEmail);
          buddySent = true;
        }
        if (joiner.podLeaderEmail && !row[COL.POD_NOTIFIED]) {
          sendPodLeaderNotification(joiner, config);
          markSent(sheet, rowNum, COL.POD_NOTIFIED + 1);
          logAction(joiner.fullName, 'POD Leader notification sent to ' + joiner.podLeaderEmail);
          podLeaderSent = true;
        }

        // ── SLACK WEBHOOK ─────────────────────────────────
        // Notify the Slack bot after emails are sent
        var tz = Session.getScriptTimeZone();
        notifySlackBot(
          {
            name:           row[COL.FULL_NAME],
            personalEmail:  row[COL.PERSONAL_EMAIL],
            phone:          row[COL.PHONE],
            role:           row[COL.ROLE],
            department:     row[COL.DEPARTMENT],
            joiningDate:    Utilities.formatDate(joiningDate, tz, 'dd/MM/yyyy'),
            mode:           row[COL.MODE],
            podName:        row[COL.POD_NAME],
            podLeaderName:  row[COL.POD_LEADER],
            podLeaderEmail: row[COL.POD_LEADER_EMAIL],
            workEmail:      row[COL.WORK_EMAIL],
            buddyName:      row[COL.BUDDY_NAME],
            buddyEmail:     row[COL.BUDDY_EMAIL],
          },
          {
            welcome:   welcomeSent || !!row[COL.EMAIL_1_SENT],
            handbook:  handbookSent || !!row[COL.EMAIL_2_SENT],
            buddy:     buddySent || !!row[COL.BUDDY_NOTIFIED],
            podLeader: podLeaderSent || !!row[COL.POD_NOTIFIED],
          }
        );
        // ──────────────────────────────────────────────────

      } catch (error) {
        MailApp.sendEmail(
          config.hrNotificationEmail,
          '⚠️ Onboarding Email Failed — ' + joiner.fullName,
          'Error: ' + error.message
        );
        logAction(joiner.fullName, 'ERROR: ' + error.message);
      }
    }
  }
}


// ============================================================
// BUILD JOINER DATA
// ============================================================
function buildJoinerData(row, joiningDate) {
  const tz = Session.getScriptTimeZone();
  return {
    fullName: row[COL.FULL_NAME],
    firstName: row[COL.FULL_NAME].toString().split(' ')[0],
    personalEmail: row[COL.PERSONAL_EMAIL],
    phone: row[COL.PHONE],
    role: row[COL.ROLE],
    department: row[COL.DEPARTMENT],
    joiningDate: Utilities.formatDate(joiningDate, tz, 'dd MMMM yyyy'),
    joiningDay: Utilities.formatDate(joiningDate, tz, 'EEEE'),
    mode: row[COL.MODE],
    podName: row[COL.POD_NAME],
    podLeader: row[COL.POD_LEADER],
    podLeaderEmail: row[COL.POD_LEADER_EMAIL],
    workEmail: row[COL.WORK_EMAIL],
    tempPassword: row[COL.TEMP_PASSWORD],
    buddyName: row[COL.BUDDY_NAME],
    buddyEmail: row[COL.BUDDY_EMAIL],
  };
}


// ============================================================
// EMAIL 1 — WELCOME + CREDENTIALS
// Sent to: Employee Personal Email
// ============================================================
function sendWelcomeEmail(joiner, config) {
  const subject = `🎉 Welcome to devxlabs.ai, ${joiner.firstName}!`;

  const body = `
<div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #222; line-height: 1.7;">

  <div style="background: #111; padding: 28px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: #fff; margin: 0; font-size: 22px; letter-spacing: 0.5px;">🚀 Welcome to devxlabs.ai</h1>
  </div>

  <div style="padding: 30px; background: #fff; border: 1px solid #ddd; border-top: none; border-radius: 0 0 8px 8px;">

    <p>Hi <strong>${joiner.firstName}</strong>,</p>
    <p>Welcome to devxlabs.ai. 🎉</p>
    <p>We're delighted to have you join our team and look forward to working with you. We hope your journey with us will be a rewarding and enriching experience. ✨</p>

    <p>Please find below the details for your first day:</p>

    <!-- JOINING DETAILS -->
    <table style="width: 100%; border-collapse: collapse; margin: 16px 0; border: 1px solid #ddd;">
      <tr style="border-bottom: 1px solid #ddd;">
        <td style="padding: 12px 16px; font-weight: bold; width: 170px; background: #f5f5f5;">📍 Office Address</td>
        <td style="padding: 12px 16px;">${config.officeAddress}</td>
      </tr>
      <tr style="border-bottom: 1px solid #ddd;">
        <td style="padding: 12px 16px; font-weight: bold; background: #f5f5f5;">🕐 Reporting Time</td>
        <td style="padding: 12px 16px;">${config.reportingTime} <span style="color: #888;">(Only for tomorrow)</span></td>
      </tr>
      <tr style="border-bottom: 1px solid #ddd;">
        <td style="padding: 12px 16px; font-weight: bold; background: #f5f5f5;">📅 Reporting Date</td>
        <td style="padding: 12px 16px;">${joiner.joiningDate}</td>
      </tr>
      <tr style="border-bottom: 1px solid #ddd;">
        <td style="padding: 12px 16px; font-weight: bold; background: #f5f5f5;">📆 Reporting Day</td>
        <td style="padding: 12px 16px;">${joiner.joiningDay}</td>
      </tr>
      <tr style="border-bottom: 1px solid #ddd;">
        <td style="padding: 12px 16px; font-weight: bold; background: #f5f5f5;">🤝 Joining Buddy</td>
        <td style="padding: 12px 16px;">${joiner.buddyName}</td>
      </tr>
      <tr>
        <td style="padding: 12px 16px; font-weight: bold; background: #f5f5f5;">👤 HR Contact</td>
        <td style="padding: 12px 16px;">${config.hrContactName}</td>
      </tr>
    </table>

    <p>You will be joining the "<strong>${joiner.podName}</strong>" POD, Led by <strong>${joiner.podLeader}</strong> 💼</p>

    <!-- LOGIN CREDENTIALS -->
    <div style="background: #f5f5f5; border-left: 4px solid #222; padding: 16px 20px; margin: 20px 0;">
      <h3 style="margin: 0 0 10px 0; color: #111; font-size: 15px;">🔑 Login Credentials</h3>
      <table style="border-collapse: collapse;">
        <tr>
          <td style="padding: 4px 14px 4px 0; font-weight: bold;">Work Email:</td>
          <td style="padding: 4px 0;">${joiner.workEmail}</td>
        </tr>
        <tr>
          <td style="padding: 4px 14px 4px 0; font-weight: bold;">Password:</td>
          <td style="padding: 4px 0;"><code style="background: #eee; padding: 3px 10px; border-radius: 3px; border: 1px solid #ccc; font-size: 14px;">${joiner.tempPassword}</code></td>
        </tr>
      </table>
    </div>

    <p>Please use the links below to complete the required onboarding steps:</p>
    <ul style="margin: 10px 0; padding-left: 20px;">
      <li style="margin-bottom: 8px;">💰 <a href="${config.payrollLink}" style="color: #111; font-weight: 600;">Payroll Process Link</a> <span style="color: #888;">(Do not login now)</span></li>
      <li style="margin-bottom: 8px;">💬 <a href="${config.slackLink}" style="color: #111; font-weight: 600;">Slack Link</a> <span style="color: #888;">(Day to day communication)</span></li>
    </ul>

    <!-- NOTES -->
    <div style="background: #f9f9f9; border: 1px solid #ddd; padding: 16px; margin: 20px 0; border-radius: 4px;">
      <strong>📝 Note:</strong>
      <ol style="margin: 8px 0 0 0; padding-left: 20px;">
        <li style="margin-bottom: 6px;">🍽️ ${config.lunchNote}</li>
        <li style="margin-bottom: 6px;">💻 A work device will be provided by devx for official purposes.</li>
        <li>📄 Kindly upload the required documents as outlined in this form link: <a href="${config.docUploadFormLink}" style="color: #111; font-weight: 600;">Form</a> <span style="color: #888;">(Ignore if it is done)</span></li>
      </ol>
    </div>

    <p>If you have any questions prior to joining, feel free to reach out. We're excited to welcome you to the office and wish you a great start! 🌟</p>

    <!-- SIGNATURE -->
    <div style="margin-top: 28px; padding-top: 20px; border-top: 2px solid #111;">
      <p style="margin: 0;">Warm regards,</p>
      <p style="margin: 4px 0 0 0; font-weight: bold;">${config.hrContactName}</p>
      <p style="margin: 2px 0 0 0; color: #666; font-size: 13px;">${config.hrDesignation}</p>
      <p style="margin: 2px 0 0 0; color: #666; font-size: 13px;">📞 ${config.hrContactPhone} &nbsp;|&nbsp; ✉️ ${config.hrContactEmail}</p>
    </div>

  </div>
</div>`;

  MailApp.sendEmail({
    to: joiner.personalEmail,
    cc: joiner.workEmail || '',
    subject: subject,
    htmlBody: body,
  });
}


// ============================================================
// EMAIL 2 — HANDBOOK + POLICIES
// Sent to: Employee Personal Email
// ============================================================
function sendHandbookEmail(joiner, config) {
  const subject = `📚 Employee Handbook & Policies — Please Review & Acknowledge`;

  const body = `
<div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #222; line-height: 1.7;">

  <div style="background: #111; padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
    <h2 style="color: #fff; margin: 0; font-size: 20px;">📖 Employee Handbook & Policies</h2>
  </div>

  <div style="padding: 30px; background: #fff; border: 1px solid #ddd; border-top: none; border-radius: 0 0 8px 8px;">

    <p>Hi <strong>${joiner.firstName}</strong>,</p>
    <p>We are sharing the devx Employee Handbook with you. 📋 Kindly review them carefully and feel free to reach out if you have any doubts or need clarification.</p>

    <!-- POLICY LINKS -->
    <div style="margin: 20px 0; border: 1px solid #ddd; border-radius: 4px; overflow: hidden;">
      <div style="background: #f5f5f5; padding: 12px 16px; font-weight: bold; border-bottom: 1px solid #ddd;">📂 Company Policies</div>
      <table style="width: 100%; border-collapse: collapse;">
        <tr style="border-bottom: 1px solid #eee;">
          <td style="padding: 11px 16px;">📄 <a href="${config.assetPolicyLink}" style="color: #111; text-decoration: none;">Asset Policy</a></td>
        </tr>
        <tr style="border-bottom: 1px solid #eee;">
          <td style="padding: 11px 16px;">📄 <a href="${config.referralPolicyLink}" style="color: #111; text-decoration: none;">Employee Referral Policy</a></td>
        </tr>
        <tr style="border-bottom: 1px solid #eee;">
          <td style="padding: 11px 16px;">📄 <a href="${config.separationPolicyLink}" style="color: #111; text-decoration: none;">Employment Separation Policy</a></td>
        </tr>
        <tr style="border-bottom: 1px solid #eee;">
          <td style="padding: 11px 16px;">📄 <a href="${config.leavePolicyLink}" style="color: #111; text-decoration: none;">Leave Policy</a></td>
        </tr>
        <tr style="border-bottom: 1px solid #eee;">
          <td style="padding: 11px 16px;">📄 <a href="${config.poshPolicyLink}" style="color: #111; text-decoration: none;">POSH Policy</a></td>
        </tr>
        <tr style="border-bottom: 1px solid #eee;">
          <td style="padding: 11px 16px;">📄 <a href="${config.reimbursementLink}" style="color: #111; text-decoration: none;">Razorpay Reimbursement Process</a></td>
        </tr>
        <tr>
          <td style="padding: 11px 16px;">📄 <a href="${config.wfhPolicyLink}" style="color: #111; text-decoration: none;">Work From Home (WFH) Policy</a></td>
        </tr>
      </table>
    </div>

    <!-- ACKNOWLEDGMENT -->
    <div style="border: 2px solid #222; padding: 20px; margin: 20px 0; text-align: center; border-radius: 4px;">
      <p style="margin: 0 0 8px 0; font-weight: bold;">✍️ Acknowledgment Required</p>
      <p style="margin: 0 0 14px 0; font-size: 14px; color: #555;">Please review the policies, add your e-signature, and share it back in the same thread once completed.</p>
      <a href="${config.acknowledgmentFormLink}" style="display: inline-block; background: #111; color: #fff; padding: 12px 32px; border-radius: 4px; text-decoration: none; font-weight: 600; font-size: 14px;">Open Acknowledgment Form →</a>
    </div>

    <p>Thank you! 🙏</p>

    <!-- SIGNATURE -->
    <div style="margin-top: 28px; padding-top: 20px; border-top: 2px solid #111;">
      <p style="margin: 0;">Warm regards,</p>
      <p style="margin: 4px 0 0 0; font-weight: bold;">${config.hrContactName}</p>
      <p style="margin: 2px 0 0 0; color: #666; font-size: 13px;">${config.hrDesignation}</p>
      <p style="margin: 2px 0 0 0; color: #666; font-size: 13px;">📞 ${config.hrContactPhone} &nbsp;|&nbsp; ✉️ ${config.hrContactEmail}</p>
    </div>

  </div>
</div>`;

  MailApp.sendEmail({
    to: joiner.personalEmail,
    cc: joiner.workEmail || '',
    subject: subject,
    htmlBody: body,
  });
}


// ============================================================
// BUDDY NOTIFICATION (Clean, no emojis — internal)
// Sent to: Buddy's Work Email
// ============================================================
function sendBuddyNotification(joiner, config) {
  const buddyFirstName = joiner.buddyName.toString().split(' ')[0];
  const subject = `Joining Buddy Assignment — ${joiner.fullName} joins tomorrow`;

  const body = `
<div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #222; line-height: 1.7;">

  <div style="background: #111; padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
    <h2 style="color: #fff; margin: 0; font-size: 20px;">Joining Buddy Assignment</h2>
  </div>

  <div style="padding: 30px; background: #fff; border: 1px solid #ddd; border-top: none; border-radius: 0 0 8px 8px;">

    <p>Hi <strong>${buddyFirstName}</strong>,</p>
    <p>I would like to inform you that <strong>${joiner.fullName}</strong> has been assigned to you as their joining buddy. Kindly assist them in getting familiar with the team, processes and other necessary guidance.</p>

    <table style="width: 100%; border-collapse: collapse; margin: 16px 0; border: 1px solid #ddd;">
      <tr style="border-bottom: 1px solid #ddd;">
        <td style="padding: 10px 14px; font-weight: bold; background: #f5f5f5; width: 130px;">Name</td>
        <td style="padding: 10px 14px;">${joiner.fullName}</td>
      </tr>
      <tr style="border-bottom: 1px solid #ddd;">
        <td style="padding: 10px 14px; font-weight: bold; background: #f5f5f5;">Role</td>
        <td style="padding: 10px 14px;">${joiner.role}</td>
      </tr>
      <tr style="border-bottom: 1px solid #ddd;">
        <td style="padding: 10px 14px; font-weight: bold; background: #f5f5f5;">POD</td>
        <td style="padding: 10px 14px;">${joiner.podName}</td>
      </tr>
      <tr>
        <td style="padding: 10px 14px; font-weight: bold; background: #f5f5f5;">Joining Date</td>
        <td style="padding: 10px 14px;">${joiner.joiningDay}, ${joiner.joiningDate}</td>
      </tr>
    </table>

    <div style="background: #f5f5f5; border-left: 4px solid #222; padding: 16px 20px; margin: 20px 0;">
      <h3 style="margin: 0 0 12px 0; color: #111; font-size: 15px;">Role of a Joining Buddy</h3>
      <p style="margin: 0 0 10px 0;"><strong>Welcome & Onboarding Support</strong> — Personally welcome the new joiner on Day 1; from coffee and lunch to evening tea, stick with your new bud.</p>
      <ol style="padding-left: 20px; margin: 0;">
        <li style="margin-bottom: 6px;">Help them settle in by explaining team norms, work principles, and company culture.</li>
        <li style="margin-bottom: 6px;">Be available to answer informal questions about day-to-day processes.</li>
        <li style="margin-bottom: 6px;">Direct the new joiner to the right person or resource when needed.</li>
        <li style="margin-bottom: 6px;">Introduce the new joiner to teammates and cross-functional colleagues.</li>
        <li style="margin-bottom: 6px;">Facilitate inclusion in team meetings, group chats, and social activities.</li>
        <li style="margin-bottom: 6px;">Provide a safe space to ask "small" or "silly" questions without judgment.</li>
        <li style="margin-bottom: 6px;">Gather feedback from the new joiner about their onboarding experience.</li>
        <li style="margin-bottom: 6px;">Share insights with the HR team if any improvements are needed.</li>
        <li style="margin-bottom: 6px;"><strong>Give them a complete office tour on Day 1.</strong></li>
      </ol>
    </div>

    <p>Thank you for being a great buddy!</p>

    <div style="margin-top: 28px; padding-top: 20px; border-top: 2px solid #111;">
      <p style="margin: 0;">Warm regards,</p>
      <p style="margin: 4px 0 0 0; font-weight: bold;">${config.hrContactName}</p>
      <p style="margin: 2px 0 0 0; color: #666; font-size: 13px;">${config.hrDesignation}</p>
      <p style="margin: 2px 0 0 0; color: #666; font-size: 13px;">${config.hrContactPhone} &nbsp;|&nbsp; ${config.hrContactEmail}</p>
    </div>

  </div>
</div>`;

  MailApp.sendEmail({ to: joiner.buddyEmail, subject: subject, htmlBody: body });
}


// ============================================================
// POD LEADER NOTIFICATION (Clean, no emojis — internal)
// Sent to: POD Leader's Work Email
// ============================================================
function sendPodLeaderNotification(joiner, config) {
  const leaderFirstName = joiner.podLeader.toString().split(' ')[0];
  const subject = `New Team Member Joining ${joiner.podName} POD Tomorrow — ${joiner.fullName}`;

  const body = `
<div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #222; line-height: 1.7;">

  <div style="background: #111; padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
    <h2 style="color: #fff; margin: 0; font-size: 20px;">New Member Joining Your POD</h2>
  </div>

  <div style="padding: 30px; background: #fff; border: 1px solid #ddd; border-top: none; border-radius: 0 0 8px 8px;">

    <p>Hi <strong>${leaderFirstName}</strong>,</p>
    <p>This is to inform you that a new team member is joining the <strong>${joiner.podName}</strong> POD tomorrow.</p>

    <table style="width: 100%; border-collapse: collapse; margin: 16px 0; border: 1px solid #ddd;">
      <tr style="border-bottom: 1px solid #ddd;">
        <td style="padding: 10px 14px; font-weight: bold; background: #f5f5f5; width: 140px;">Name</td>
        <td style="padding: 10px 14px;">${joiner.fullName}</td>
      </tr>
      <tr style="border-bottom: 1px solid #ddd;">
        <td style="padding: 10px 14px; font-weight: bold; background: #f5f5f5;">Role</td>
        <td style="padding: 10px 14px;">${joiner.role}</td>
      </tr>
      <tr style="border-bottom: 1px solid #ddd;">
        <td style="padding: 10px 14px; font-weight: bold; background: #f5f5f5;">Department</td>
        <td style="padding: 10px 14px;">${joiner.department}</td>
      </tr>
      <tr style="border-bottom: 1px solid #ddd;">
        <td style="padding: 10px 14px; font-weight: bold; background: #f5f5f5;">Joining Date</td>
        <td style="padding: 10px 14px;">${joiner.joiningDay}, ${joiner.joiningDate}</td>
      </tr>
      <tr style="border-bottom: 1px solid #ddd;">
        <td style="padding: 10px 14px; font-weight: bold; background: #f5f5f5;">Mode</td>
        <td style="padding: 10px 14px;">${joiner.mode}</td>
      </tr>
      <tr style="border-bottom: 1px solid #ddd;">
        <td style="padding: 10px 14px; font-weight: bold; background: #f5f5f5;">Joining Buddy</td>
        <td style="padding: 10px 14px;">${joiner.buddyName}</td>
      </tr>
      <tr>
        <td style="padding: 10px 14px; font-weight: bold; background: #f5f5f5;">Work Email</td>
        <td style="padding: 10px 14px;">${joiner.workEmail}</td>
      </tr>
    </table>

    <div style="background: #f5f5f5; border-left: 4px solid #222; padding: 16px 20px; margin: 20px 0;">
      <h3 style="margin: 0 0 12px 0; color: #111; font-size: 15px;">What We Need From You</h3>
      <ol style="padding-left: 20px; margin: 0;">
        <li style="margin-bottom: 8px;"><strong>Handshake meeting</strong> — Schedule a brief welcome meeting with ${joiner.firstName} on Day 1 or within the first week.</li>
        <li style="margin-bottom: 8px;"><strong>POD introduction</strong> — Help ${joiner.firstName} understand the POD's current focus, goals, and their role in it.</li>
        <li style="margin-bottom: 8px;"><strong>Team introduction</strong> — Introduce them to POD members (in-person or on the Saturday team meet).</li>
        <li style="margin-bottom: 8px;"><strong>Initial tasks</strong> — Have starter tasks or reading material ready for ramp-up.</li>
      </ol>
    </div>

    <p>The joining buddy <strong>${joiner.buddyName}</strong> will handle Day 1 logistics (office tour, team norms, etc.). Please coordinate with them if needed.</p>

    <p>Thank you for welcoming ${joiner.firstName} to the team!</p>

    <div style="margin-top: 28px; padding-top: 20px; border-top: 2px solid #111;">
      <p style="margin: 0;">Warm regards,</p>
      <p style="margin: 4px 0 0 0; font-weight: bold;">${config.hrContactName}</p>
      <p style="margin: 2px 0 0 0; color: #666; font-size: 13px;">${config.hrDesignation}</p>
      <p style="margin: 2px 0 0 0; color: #666; font-size: 13px;">${config.hrContactPhone} &nbsp;|&nbsp; ${config.hrContactEmail}</p>
    </div>

  </div>
</div>`;

  MailApp.sendEmail({ to: joiner.podLeaderEmail, subject: subject, htmlBody: body });
}


// ============================================================
// UTILITY FUNCTIONS
// ============================================================
function getConfig(ss) {
  const configSheet = ss.getSheetByName(CONFIG_SHEET);
  const configData = configSheet.getDataRange().getValues();
  const config = {};
  const keyMap = {
    'Company Name': 'companyName',
    'Office Address': 'officeAddress',
    'Default Reporting Time': 'reportingTime',
    'HR Contact Name': 'hrContactName',
    'HR Contact Phone': 'hrContactPhone',
    'HR Contact Email': 'hrContactEmail',
    'HR Designation': 'hrDesignation',
    'Payroll Process Link': 'payrollLink',
    'Slack Workspace Link': 'slackLink',
    'Document Upload Form Link': 'docUploadFormLink',
    'Acknowledgment Form Link': 'acknowledgmentFormLink',
    'Asset Policy Link': 'assetPolicyLink',
    'Employee Referral Policy Link': 'referralPolicyLink',
    'Employment Separation Policy Link': 'separationPolicyLink',
    'Leave Policy Link': 'leavePolicyLink',
    'POSH Policy Link': 'poshPolicyLink',
    'Razorpay Reimbursement Process Link': 'reimbursementLink',
    'WFH Policy Link': 'wfhPolicyLink',
    'HR Notification Email': 'hrNotificationEmail',
    'Lunch Note': 'lunchNote',
  };
  configData.forEach(row => {
    if (keyMap[row[0]]) config[keyMap[row[0]]] = row[1];
  });
  return config;
}

function markSent(sheet, rowNum, colNum) {
  const ts = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm');
  sheet.getRange(rowNum, colNum).setValue('✅ ' + ts);
}

function logAction(name, action) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let logSheet = ss.getSheetByName('Logs');
  if (!logSheet) {
    logSheet = ss.insertSheet('Logs');
    logSheet.appendRow(['Timestamp', 'Employee', 'Action']);
  }
  logSheet.appendRow([new Date(), name, action]);
}


// ============================================================
// MANUAL TEST
// ============================================================
function manualSendEmail() {
  const ROW_NUMBER = 2;
  const EMAIL_NUMBER = 1;

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);
  const config = getConfig(ss);
  const row = sheet.getRange(ROW_NUMBER, 1, 1, sheet.getLastColumn()).getValues()[0];
  const joiner = buildJoinerData(row, new Date(row[COL.JOINING_DATE]));

  if (EMAIL_NUMBER === 1) {
    sendWelcomeEmail(joiner, config);
    markSent(sheet, ROW_NUMBER, COL.EMAIL_1_SENT + 1);
    logAction(joiner.fullName, '[MANUAL] Welcome email sent to ' + joiner.personalEmail);
  }
  if (EMAIL_NUMBER === 2) {
    sendHandbookEmail(joiner, config);
    markSent(sheet, ROW_NUMBER, COL.EMAIL_2_SENT + 1);
    logAction(joiner.fullName, '[MANUAL] Handbook email sent to ' + joiner.personalEmail);
  }
  if (EMAIL_NUMBER === 3) {
    sendBuddyNotification(joiner, config);
    markSent(sheet, ROW_NUMBER, COL.BUDDY_NOTIFIED + 1);
    logAction(joiner.fullName, '[MANUAL] Buddy notification sent to ' + joiner.buddyEmail);
  }
  if (EMAIL_NUMBER === 4) {
    sendPodLeaderNotification(joiner, config);
    markSent(sheet, ROW_NUMBER, COL.POD_NOTIFIED + 1);
    logAction(joiner.fullName, '[MANUAL] POD Leader notification sent to ' + joiner.podLeaderEmail);
  }

  Logger.log('Email ' + EMAIL_NUMBER + ' sent for ' + joiner.fullName);
}


// ============================================================
// MANUAL TEST — Slack webhook only (no emails)
// ============================================================
function manualTestSlackWebhook() {
  const ROW_NUMBER = 2;

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);
  const row = sheet.getRange(ROW_NUMBER, 1, 1, sheet.getLastColumn()).getValues()[0];
  const joiningDate = new Date(row[COL.JOINING_DATE]);
  const tz = Session.getScriptTimeZone();

  notifySlackBot(
    {
      name:           row[COL.FULL_NAME],
      personalEmail:  row[COL.PERSONAL_EMAIL],
      phone:          row[COL.PHONE],
      role:           row[COL.ROLE],
      department:     row[COL.DEPARTMENT],
      joiningDate:    Utilities.formatDate(joiningDate, tz, 'dd/MM/yyyy'),
      mode:           row[COL.MODE],
      podName:        row[COL.POD_NAME],
      podLeaderName:  row[COL.POD_LEADER],
      podLeaderEmail: row[COL.POD_LEADER_EMAIL],
      workEmail:      row[COL.WORK_EMAIL],
      buddyName:      row[COL.BUDDY_NAME],
      buddyEmail:     row[COL.BUDDY_EMAIL],
    },
    {
      welcome:   !!row[COL.EMAIL_1_SENT],
      handbook:  !!row[COL.EMAIL_2_SENT],
      buddy:     !!row[COL.BUDDY_NOTIFIED],
      podLeader: !!row[COL.POD_NOTIFIED],
    }
  );

  Logger.log('Slack webhook sent for ' + row[COL.FULL_NAME]);
}


// ============================================================
// TRIGGER — Run ONCE
// ============================================================
function createDailyTrigger() {
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'checkAndSendEmails') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('checkAndSendEmails')
    .timeBased().everyDays(1).atHour(9).create();
  Logger.log('✅ Daily trigger created — runs at 9 AM');
}
