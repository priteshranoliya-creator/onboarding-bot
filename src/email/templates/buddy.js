/**
 * Buddy notification email — sent to buddy's work email on D-1.
 * Ported from Code.gs sendBuddyNotification()
 */
module.exports = function buddyEmail(joiner, cfg) {
  const buddyFirstName = (joiner.buddyName || '').split(' ')[0];
  const subject = `Joining Buddy Assignment — ${joiner.name} joins tomorrow`;

  const html = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #1f2937; line-height: 1.6; background: #f9fafb; padding: 20px;">
  <div style="background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
    <div style="background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%); padding: 30px 32px; text-align: center;">
      <h2 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 600; letter-spacing: -0.3px;">Joining Buddy Assignment</h2>
    </div>
    <div style="padding: 32px;">
      <p style="margin: 0 0 14px 0;">Hi <strong>${buddyFirstName}</strong>,</p>
      <p style="margin: 0 0 20px 0;"><strong>${joiner.name}</strong> has been assigned to you as their joining buddy. Kindly assist them in getting familiar with the team, processes, and other necessary guidance.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 0 0 24px 0; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 12px 16px; font-weight: 600; background: #f9fafb; width: 130px; color: #374151;">Name</td>
          <td style="padding: 12px 16px;">${joiner.name}</td>
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
          <td style="padding: 12px 16px;">${joiner.joiningDay}, ${joiner.joiningDateLong}</td>
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
        <p style="margin: 4px 0 0 0; font-weight: 600; color: #111827;">${cfg.hrContactName}</p>
        <p style="margin: 2px 0 0 0; color: #6b7280; font-size: 13px;">${cfg.hrDesignation}</p>
        <p style="margin: 2px 0 0 0; color: #6b7280; font-size: 13px;">${cfg.hrContactPhone} &nbsp;|&nbsp; <a href="mailto:${cfg.hrContactEmail}" style="color: #2563eb; text-decoration: none;">${cfg.hrContactEmail}</a></p>
      </div>
    </div>
  </div>
</div>`;

  return { subject, html, to: joiner.buddyEmail };
};
