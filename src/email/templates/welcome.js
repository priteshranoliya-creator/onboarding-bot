/**
 * Welcome + Credentials email — sent to employee personal email on D-1.
 * Ported from Code.gs sendWelcomeEmail()
 */
module.exports = function welcomeEmail(joiner, cfg) {
  const subject = `Welcome to devxlabs.ai, ${joiner.firstName}!`;

  const html = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #1f2937; line-height: 1.6; background: #f9fafb; padding: 20px;">
  <div style="background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
    <div style="background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%); padding: 36px 32px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600; letter-spacing: -0.3px;">Welcome to devxlabs.ai</h1>
      <p style="color: #bfdbfe; margin: 8px 0 0 0; font-size: 14px;">We're excited to have you on board</p>
    </div>
    <div style="padding: 32px;">
      <p style="margin: 0 0 12px 0;">Hi <strong>${joiner.firstName}</strong>,</p>
      <p style="margin: 0 0 14px 0;">Welcome to devxlabs.ai! We're delighted to have you join our team and look forward to working with you. We hope your journey with us will be a rewarding and enriching experience.</p>
      <p style="margin: 20px 0 12px 0; font-weight: 600; color: #111827;">Your first day details</p>
      <table style="width: 100%; border-collapse: collapse; margin: 0 0 20px 0; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 12px 16px; font-weight: 600; width: 170px; background: #f9fafb; color: #374151;">Office Address</td>
          <td style="padding: 12px 16px;">${cfg.officeAddress}</td>
        </tr>
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 12px 16px; font-weight: 600; background: #f9fafb; color: #374151;">Reporting Time</td>
          <td style="padding: 12px 16px;">${cfg.reportingTime} <span style="color: #6b7280;">(Only for tomorrow)</span></td>
        </tr>
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 12px 16px; font-weight: 600; background: #f9fafb; color: #374151;">Reporting Date</td>
          <td style="padding: 12px 16px;">${joiner.joiningDateLong}</td>
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
          <td style="padding: 12px 16px;">${cfg.hrContactName}</td>
        </tr>
      </table>
      <p style="margin: 0 0 20px 0;">You will be joining the <strong style="color: #2563eb;">${joiner.podName}</strong> POD, led by <strong>${joiner.podLeaderName}</strong>.</p>
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
        <li style="margin-bottom: 8px;"><a href="${cfg.payrollLink}" style="color: #2563eb; text-decoration: underline; font-weight: 500;">Payroll Process Link</a> <span style="color: #6b7280;">(Do not login now)</span></li>
        <li style="margin-bottom: 8px;"><a href="${cfg.slackLink}" style="color: #2563eb; text-decoration: underline; font-weight: 500;">Slack Workspace</a> <span style="color: #6b7280;">(Day-to-day communication)</span></li>
      </ul>
      <div style="background: #fffbeb; border: 1px solid #fef3c7; padding: 16px 20px; margin: 0 0 20px 0; border-radius: 6px;">
        <p style="margin: 0 0 8px 0; font-weight: 600; color: #92400e;">A few things to note</p>
        <ol style="margin: 0; padding-left: 20px; color: #78350f;">
          <li style="margin-bottom: 6px;">${cfg.lunchNote}</li>
          <li style="margin-bottom: 6px;">A work device will be provided by devx for official purposes.</li>
          <li>Kindly upload the required documents via this <a href="${cfg.docUploadFormLink}" style="color: #2563eb; text-decoration: underline; font-weight: 500;">form</a> <span style="color: #78350f;">(Ignore if already done)</span></li>
        </ol>
      </div>
      <p style="margin: 0 0 24px 0;">If you have any questions prior to joining, feel free to reach out. We're excited to welcome you and wish you a great start!</p>
      <div style="padding-top: 20px; border-top: 1px solid #e5e7eb;">
        <p style="margin: 0; color: #374151;">Warm regards,</p>
        <p style="margin: 4px 0 0 0; font-weight: 600; color: #111827;">${cfg.hrContactName}</p>
        <p style="margin: 2px 0 0 0; color: #6b7280; font-size: 13px;">${cfg.hrDesignation}</p>
        <p style="margin: 2px 0 0 0; color: #6b7280; font-size: 13px;">${cfg.hrContactPhone} &nbsp;|&nbsp; <a href="mailto:${cfg.hrContactEmail}" style="color: #2563eb; text-decoration: none;">${cfg.hrContactEmail}</a></p>
      </div>
    </div>
  </div>
</div>`;

  return { subject, html, to: joiner.personalEmail, cc: joiner.workEmail };
};
