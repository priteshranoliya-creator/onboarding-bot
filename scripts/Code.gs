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
  const subject = `Welcome to devxlabs.ai, ${joiner.firstName}!`;

  const body = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #1f2937; line-height: 1.6; background: #f9fafb; padding: 20px;">

  <div style="background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">

    <!-- HEADER -->
    <div style="background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%); padding: 36px 32px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600; letter-spacing: -0.3px;">Welcome to devxlabs.ai</h1>
      <p style="color: #bfdbfe; margin: 8px 0 0 0; font-size: 14px;">We're excited to have you on board</p>
    </div>

    <!-- BODY -->
    <div style="padding: 32px;">

      <p style="margin: 0 0 12px 0;">Hi <strong>${joiner.firstName}</strong>,</p>
      <p style="margin: 0 0 14px 0;">Welcome to devxlabs.ai! We're delighted to have you join our team and look forward to working with you. We hope your journey with us will be a rewarding and enriching experience.</p>

      <p style="margin: 20px 0 12px 0; font-weight: 600; color: #111827;">Your first day details</p>

      <table style="width: 100%; border-collapse: collapse; margin: 0 0 20px 0; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 12px 16px; font-weight: 600; width: 170px; background: #f9fafb; color: #374151;">Office Address</td>
          <td style="padding: 12px 16px;">${config.officeAddress}</td>
        </tr>
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 12px 16px; font-weight: 600; background: #f9fafb; color: #374151;">Reporting Time</td>
          <td style="padding: 12px 16px;">${config.reportingTime} <span style="color: #6b7280;">(Only for tomorrow)</span></td>
        </tr>
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 12px 16px; font-weight: 600; background: #f9fafb; color: #374151;">Reporting Date</td>
          <td style="padding: 12px 16px;">${joiner.joiningDate}</td>
        </tr>
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 12px 16px; font-weight: 600; background: #f9fafb; color: #374151;">Reporting Day</td>
          <td style="padding: 12px 16px;">${joiner.joiningDay}</td>
        </tr>
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 12px 16px; font-weight: 600; background: #f9fafb; color: #374151;">Joining Buddy</td>
          <td style="padding: 12px 16px;">${joiner.buddyName}</td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; font-weight: 600; background: #f9fafb; color: #374151;">HR Contact</td>
          <td style="padding: 12px 16px;">${config.hrContactName}</td>
        </tr>
      </table>

      <p style="margin: 0 0 20px 0;">You will be joining the <strong style="color: #2563eb;">${joiner.podName}</strong> POD, led by <strong>${joiner.podLeader}</strong>.</p>

      <!-- LOGIN CREDENTIALS -->
      <div style="background: #eff6ff; border-left: 4px solid #2563eb; padding: 18px 22px; margin: 0 0 24px 0; border-radius: 6px;">
        <p style="margin: 0 0 12px 0; color: #1e40af; font-size: 15px; font-weight: 600;">Login Credentials</p>
        <table style="border-collapse: collapse;">
          <tr>
            <td style="padding: 3px 14px 3px 0; font-weight: 600; color: #374151;">Work Email:</td>
            <td style="padding: 3px 0;"><a href="mailto:${joiner.workEmail}" style="color: #2563eb; text-decoration: none;">${joiner.workEmail}</a></td>
          </tr>
          <tr>
            <td style="padding: 3px 14px 3px 0; font-weight: 600; color: #374151;">Password:</td>
            <td style="padding: 3px 0;"><code style="background: #ffffff; padding: 3px 10px; border-radius: 4px; border: 1px solid #dbeafe; font-size: 14px; color: #111827;">${joiner.tempPassword}</code></td>
          </tr>
        </table>
      </div>

      <p style="margin: 0 0 10px 0; font-weight: 600; color: #111827;">Next steps</p>
      <ul style="margin: 0 0 20px 0; padding-left: 20px; color: #374151;">
        <li style="margin-bottom: 8px;"><a href="${config.payrollLink}" style="color: #2563eb; text-decoration: underline; font-weight: 500;">Payroll Process Link</a> <span style="color: #6b7280;">(Do not login now)</span></li>
        <li style="margin-bottom: 8px;"><a href="${config.slackLink}" style="color: #2563eb; text-decoration: underline; font-weight: 500;">Slack Workspace</a> <span style="color: #6b7280;">(Day-to-day communication)</span></li>
      </ul>

      <!-- NOTES -->
      <div style="background: #fffbeb; border: 1px solid #fef3c7; padding: 16px 20px; margin: 0 0 20px 0; border-radius: 6px;">
        <p style="margin: 0 0 8px 0; font-weight: 600; color: #92400e;">A few things to note</p>
        <ol style="margin: 0; padding-left: 20px; color: #78350f;">
          <li style="margin-bottom: 6px;">${config.lunchNote}</li>
          <li style="margin-bottom: 6px;">A work device will be provided by devx for official purposes.</li>
          <li>Kindly upload the required documents via this <a href="${config.docUploadFormLink}" style="color: #2563eb; text-decoration: underline; font-weight: 500;">form</a> <span style="color: #78350f;">(Ignore if already done)</span></li>
        </ol>
      </div>

      <p style="margin: 0 0 24px 0;">If you have any questions prior to joining, feel free to reach out. We're excited to welcome you and wish you a great start!</p>

      <!-- SIGNATURE -->
      <div style="padding-top: 20px; border-top: 1px solid #e5e7eb;">
        <p style="margin: 0; color: #374151;">Warm regards,</p>
        <p style="margin: 4px 0 0 0; font-weight: 600; color: #111827;">${config.hrContactName}</p>
        <p style="margin: 2px 0 0 0; color: #6b7280; font-size: 13px;">${config.hrDesignation}</p>
        <p style="margin: 2px 0 0 0; color: #6b7280; font-size: 13px;">${config.hrContactPhone} &nbsp;|&nbsp; <a href="mailto:${config.hrContactEmail}" style="color: #2563eb; text-decoration: none;">${config.hrContactEmail}</a></p>
      </div>

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
  const subject = `Employee Handbook & Policies — Please Review & Acknowledge`;

  // Policy link card — styled like a clickable attachment
  function policyCard(title, url) {
    return `
      <a href="${url}" style="display: block; text-decoration: none; margin-bottom: 10px;">
        <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 12px 16px; display: flex; align-items: center;">
          <div style="background: #2563eb; width: 36px; height: 36px; border-radius: 6px; display: inline-block; vertical-align: middle; text-align: center; line-height: 36px; color: white; font-size: 14px; font-weight: 600; margin-right: 12px;">PDF</div>
          <div style="display: inline-block; vertical-align: middle;">
            <div style="color: #2563eb; font-size: 14px; font-weight: 600; text-decoration: underline;">${title}</div>
            <div style="color: #6b7280; font-size: 12px; margin-top: 2px;">Click to open</div>
          </div>
        </div>
      </a>`;
  }

  const body = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #1f2937; line-height: 1.6; background: #f9fafb; padding: 20px;">

  <div style="background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">

    <!-- HEADER -->
    <div style="background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%); padding: 32px; text-align: center;">
      <h2 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 600; letter-spacing: -0.3px;">Employee Handbook & Policies</h2>
      <p style="color: #bfdbfe; margin: 6px 0 0 0; font-size: 13px;">Please review and acknowledge</p>
    </div>

    <!-- BODY -->
    <div style="padding: 32px;">

      <p style="margin: 0 0 14px 0;">Hi <strong>${joiner.firstName}</strong>,</p>
      <p style="margin: 0 0 20px 0;">We're sharing the devx Employee Handbook with you. Kindly review each policy carefully and feel free to reach out if you have any questions.</p>

      <!-- POLICY CARDS -->
      <p style="margin: 24px 0 12px 0; font-weight: 600; color: #111827;">Company Policies</p>
      ${policyCard('Asset Policy', config.assetPolicyLink)}
      ${policyCard('Employee Referral Policy', config.referralPolicyLink)}
      ${policyCard('Employment Separation Policy', config.separationPolicyLink)}
      ${policyCard('Leave Policy', config.leavePolicyLink)}
      ${policyCard('POSH Policy', config.poshPolicyLink)}
      ${policyCard('Razorpay Reimbursement Process', config.reimbursementLink)}
      ${policyCard('Work From Home (WFH) Policy', config.wfhPolicyLink)}

      <!-- ACKNOWLEDGMENT -->
      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 22px; margin: 28px 0 20px 0; text-align: center; border-radius: 8px;">
        <p style="margin: 0 0 6px 0; font-weight: 600; color: #15803d; font-size: 15px;">Acknowledgment Required</p>
        <p style="margin: 0 0 16px 0; font-size: 13px; color: #166534;">Please review the policies, add your e-signature, and submit the form.</p>
        <a href="${config.acknowledgmentFormLink}" style="display: inline-block; background: #2563eb; color: #ffffff; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px;">Open Acknowledgment Form</a>
      </div>

      <p style="margin: 20px 0;">Thank you!</p>

      <!-- SIGNATURE -->
      <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
        <p style="margin: 0; color: #374151;">Warm regards,</p>
        <p style="margin: 4px 0 0 0; font-weight: 600; color: #111827;">${config.hrContactName}</p>
        <p style="margin: 2px 0 0 0; color: #6b7280; font-size: 13px;">${config.hrDesignation}</p>
        <p style="margin: 2px 0 0 0; color: #6b7280; font-size: 13px;">${config.hrContactPhone} &nbsp;|&nbsp; <a href="mailto:${config.hrContactEmail}" style="color: #2563eb; text-decoration: none;">${config.hrContactEmail}</a></p>
      </div>

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
// BUDDY NOTIFICATION
// Sent to: Buddy's Work Email
// ============================================================
function sendBuddyNotification(joiner, config) {
  const buddyFirstName = joiner.buddyName.toString().split(' ')[0];
  const subject = `Joining Buddy Assignment — ${joiner.fullName} joins tomorrow`;

  const body = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #1f2937; line-height: 1.6; background: #f9fafb; padding: 20px;">

  <div style="background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">

    <div style="background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%); padding: 30px 32px; text-align: center;">
      <h2 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 600; letter-spacing: -0.3px;">Joining Buddy Assignment</h2>
    </div>

    <div style="padding: 32px;">

      <p style="margin: 0 0 14px 0;">Hi <strong>${buddyFirstName}</strong>,</p>
      <p style="margin: 0 0 20px 0;"><strong>${joiner.fullName}</strong> has been assigned to you as their joining buddy. Kindly assist them in getting familiar with the team, processes, and other necessary guidance.</p>

      <table style="width: 100%; border-collapse: collapse; margin: 0 0 24px 0; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 12px 16px; font-weight: 600; background: #f9fafb; width: 130px; color: #374151;">Name</td>
          <td style="padding: 12px 16px;">${joiner.fullName}</td>
        </tr>
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 12px 16px; font-weight: 600; background: #f9fafb; color: #374151;">Role</td>
          <td style="padding: 12px 16px;">${joiner.role}</td>
        </tr>
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 12px 16px; font-weight: 600; background: #f9fafb; color: #374151;">POD</td>
          <td style="padding: 12px 16px;"><strong style="color: #2563eb;">${joiner.podName}</strong></td>
        </tr>
        <tr>
          <td style="padding: 12px 16px; font-weight: 600; background: #f9fafb; color: #374151;">Joining Date</td>
          <td style="padding: 12px 16px;">${joiner.joiningDay}, ${joiner.joiningDate}</td>
        </tr>
      </table>

      <div style="background: #eff6ff; border-left: 4px solid #2563eb; padding: 20px 22px; margin: 0 0 24px 0; border-radius: 6px;">
        <p style="margin: 0 0 10px 0; color: #1e40af; font-size: 15px; font-weight: 600;">Role of a Joining Buddy</p>
        <p style="margin: 0 0 12px 0; color: #1e3a8a;"><strong>Welcome & Onboarding Support</strong> — Personally welcome the new joiner on Day 1; from coffee and lunch to evening tea, stick with your new bud.</p>
        <ol style="padding-left: 20px; margin: 0; color: #1e3a8a;">
          <li style="margin-bottom: 6px;">Help them settle in by explaining team norms, work principles, and company culture.</li>
          <li style="margin-bottom: 6px;">Be available to answer informal questions about day-to-day processes.</li>
          <li style="margin-bottom: 6px;">Direct the new joiner to the right person or resource when needed.</li>
          <li style="margin-bottom: 6px;">Introduce the new joiner to teammates and cross-functional colleagues.</li>
          <li style="margin-bottom: 6px;">Facilitate inclusion in team meetings, group chats, and social activities.</li>
          <li style="margin-bottom: 6px;">Provide a safe space to ask small or informal questions without judgment.</li>
          <li style="margin-bottom: 6px;">Gather feedback from the new joiner about their onboarding experience.</li>
          <li style="margin-bottom: 6px;">Share insights with the HR team if any improvements are needed.</li>
          <li style="margin-bottom: 6px;"><strong>Give them a complete office tour on Day 1.</strong></li>
        </ol>
      </div>

      <p style="margin: 0 0 24px 0;">Thank you for being a great buddy!</p>

      <div style="padding-top: 20px; border-top: 1px solid #e5e7eb;">
        <p style="margin: 0; color: #374151;">Warm regards,</p>
        <p style="margin: 4px 0 0 0; font-weight: 600; color: #111827;">${config.hrContactName}</p>
        <p style="margin: 2px 0 0 0; color: #6b7280; font-size: 13px;">${config.hrDesignation}</p>
        <p style="margin: 2px 0 0 0; color: #6b7280; font-size: 13px;">${config.hrContactPhone} &nbsp;|&nbsp; <a href="mailto:${config.hrContactEmail}" style="color: #2563eb; text-decoration: none;">${config.hrContactEmail}</a></p>
      </div>

    </div>
  </div>
</div>`;

  MailApp.sendEmail({ to: joiner.buddyEmail, subject: subject, htmlBody: body });
}


// ============================================================
// POD LEADER NOTIFICATION — short & simple
// Sent to: POD Leader's Work Email
// ============================================================
function sendPodLeaderNotification(joiner, config) {
  const subject = `New POD Member — ${joiner.fullName}`;

  const body = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1f2937; line-height: 1.6; background: #f9fafb; padding: 20px;">

  <div style="background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">

    <div style="background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%); padding: 28px 32px; text-align: center;">
      <h2 style="color: #ffffff; margin: 0; font-size: 18px; font-weight: 600; letter-spacing: -0.3px;">New POD Member</h2>
    </div>

    <div style="padding: 32px;">

      <p style="margin: 0 0 14px 0;">Hi,</p>
      <p style="margin: 0 0 14px 0;">Please meet your new pod member, <strong style="color: #2563eb;">${joiner.fullName}</strong>, who has joined devx as a <strong>${joiner.role}</strong>.</p>
      <p style="margin: 0 0 24px 0;">Let me know a suitable time for a quick handshake with your new buddy.</p>

      <div style="padding-top: 20px; border-top: 1px solid #e5e7eb;">
        <p style="margin: 0; color: #374151;">Warm regards,</p>
        <p style="margin: 4px 0 0 0; font-weight: 600; color: #111827;">${config.hrContactName}</p>
        <p style="margin: 2px 0 0 0; color: #6b7280; font-size: 13px;">${config.hrDesignation}</p>
        <p style="margin: 2px 0 0 0; color: #6b7280; font-size: 13px;">${config.hrContactPhone} &nbsp;|&nbsp; <a href="mailto:${config.hrContactEmail}" style="color: #2563eb; text-decoration: none;">${config.hrContactEmail}</a></p>
      </div>

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
