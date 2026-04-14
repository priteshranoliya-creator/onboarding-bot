/**
 * Welcome + Credentials email — v2.0 design.
 * Sent to employee personal email (CC work) on D-1.
 */
const {
  htmlShell, htmlHeader, htmlSectionTitle, htmlInfoCard,
  htmlAccentBlock, htmlCallout, htmlSignature, htmlGreeting, htmlP,
} = require('./components');

module.exports = function welcomeEmail(joiner, cfg) {
  const subject = `Welcome to devxlabs.ai, ${joiner.firstName}! 🚀`;

  const header = htmlHeader(
    `Welcome aboard, ${joiner.firstName}! 🚀`,
    "We're excited to start this journey together"
  );

  const body = [
    htmlGreeting(joiner.firstName),
    htmlP(`Welcome to <strong>devxlabs.ai</strong>! We're delighted to have you join the team and look forward to working together. Your journey with us starts tomorrow — here's everything you need. ✨`),

    htmlSectionTitle('📅', 'First Day Details'),
    htmlInfoCard([
      { label: 'Office Address', value: cfg.officeAddress },
      { label: 'Reporting Time', value: cfg.reportingTime + ' <span style="color:#94a3b8;">(first day only)</span>' },
      { label: 'Reporting Date', value: joiner.joiningDateLong },
      { label: 'Reporting Day', value: joiner.joiningDay },
      { label: 'Joining Buddy', value: joiner.buddyName },
      { label: 'HR Contact', value: cfg.hrContactName },
    ]),

    htmlP(`You'll be joining the <strong>${joiner.podName}</strong> POD, led by <strong>${joiner.podLeaderName}</strong>. 💼`),

    htmlSectionTitle('🔐', 'Login Credentials'),
    htmlAccentBlock('#0f172a', `
      <table style="font-size:14px;border-collapse:collapse;">
        <tr>
          <td style="padding:5px 16px 5px 0;color:#64748b;background-color:#f8fafc;">Work Email</td>
          <td style="padding:5px 0;background-color:#f8fafc;"><a href="mailto:${joiner.workEmail}" style="color:#2563eb;text-decoration:none;font-weight:600;">${joiner.workEmail}</a></td>
        </tr>
        <tr>
          <td style="padding:5px 16px 5px 0;color:#64748b;background-color:#f8fafc;">Password</td>
          <td style="padding:5px 0;background-color:#f8fafc;"><code style="background-color:#e2e8f0;color:#0f172a;padding:4px 12px;border-radius:6px;font-family:'SF Mono',Consolas,monospace;font-size:13px;">${joiner.tempPassword}</code></td>
        </tr>
      </table>
    `),

    htmlSectionTitle('🚀', 'Onboarding Links'),
    `<div style="margin-bottom:24px;">
      <a href="${cfg.payrollLink}" style="display:inline-block;background-color:#f1f5f9;border:1px solid #e2e8f0;border-radius:8px;padding:10px 18px;margin:0 8px 8px 0;text-decoration:none;color:#1e293b;font-size:13px;font-weight:600;">💰 Payroll Process</a>
      <a href="${cfg.slackLink}" style="display:inline-block;background-color:#f1f5f9;border:1px solid #e2e8f0;border-radius:8px;padding:10px 18px;margin:0 8px 8px 0;text-decoration:none;color:#1e293b;font-size:13px;font-weight:600;">💬 Slack Workspace</a>
    </div>`,

    htmlCallout('#fffbeb', '#fde68a', `
      ${htmlSectionTitle('📌', 'Things to Note')}
      <ul style="margin:0;padding-left:18px;font-size:13px;color:#78350f;">
        <li style="margin-bottom:6px;">🍽️ ${cfg.lunchNote}</li>
        <li style="margin-bottom:6px;">💻 A work device will be provided for official purposes.</li>
        <li>📄 Upload required documents via this <a href="${cfg.docUploadFormLink}" style="color:#92400e;font-weight:600;">form</a>. <span style="color:#a16207;">(Ignore if done)</span></li>
      </ul>
    `),

    htmlP("If you have any questions before joining, feel free to reach out. We look forward to welcoming you tomorrow! 🌟"),
    htmlSignature(cfg),
  ].join('');

  return { subject, html: htmlShell(header, body), to: joiner.personalEmail, cc: joiner.workEmail };
};
