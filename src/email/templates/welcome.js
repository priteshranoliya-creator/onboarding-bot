/**
 * Welcome + Credentials email — v2.0 design.
 * Sent to employee personal email (CC work) on D-1.
 */
const {
  htmlShell, htmlHeader, htmlSectionTitle, htmlInfoCard,
  htmlAccentBlock, htmlCallout, htmlSignature, htmlGreeting, htmlP,
} = require('./components');

module.exports = function welcomeEmail(joiner, cfg) {
  const subject = `Welcome to devx labs, ${joiner.firstName}! 🚀`;
  // Blank/unknown mode defaults to onsite — safer to over-inform than miss the lunch line.
  const isOnline = (joiner.mode || '').toLowerCase().trim() === 'online';
  const dayOneNote = isOnline
    ? `💻 Reporting virtually — your buddy will connect with you on Slack on Day 1.`
    : `🍽️ Please do not bring your lunch on ${joiner.joiningDay}. We have arranged an onboarding lunch for you.`;

  const header = htmlHeader(
    `Welcome aboard, ${joiner.firstName}! 🚀`,
    "We're excited to start this journey together"
  );

  const body = [
    htmlGreeting(joiner.firstName),
    htmlP(`Welcome to <strong>devx labs</strong>! We're delighted to have you join the team and look forward to working together. Your journey with us starts tomorrow — here's everything you need. ✨`),

    htmlSectionTitle('📅', 'First Day Details'),
    htmlInfoCard([
      { label: 'Office Address', value: cfg.officeAddress },
      ...(!isOnline ? [
        { label: 'Reporting Time', value: cfg.reportingTime + ' <span style="color:#94a3b8;">(first day only)</span>' },
      ] : []),
      { label: 'Reporting Date', value: joiner.joiningDateLong },
      { label: 'Joining Buddy', value: joiner.buddyName },
      { label: 'HR Contact', value: cfg.hrContactName },
    ]),

    htmlP(`You'll be joining the <strong>${joiner.podName}</strong> POD, led by <strong>${joiner.podLeaderName}</strong>. 💼`),

    joiner.mode ? htmlP(`*Work Mode:* <strong>${joiner.mode}</strong>`) : '',

    htmlSectionTitle('🔐', 'Login Credentials'),
    htmlAccentBlock('#0f172a', `
      <table style="font-size:14px;border-collapse:collapse;width:100%;">
        <tr>
          <td style="padding:5px 14px 5px 0;color:#64748b;background-color:#f8fafc;white-space:nowrap;vertical-align:top;">Work Email</td>
          <td style="padding:5px 0;background-color:#f8fafc;word-break:break-all;"><a href="mailto:${joiner.workEmail}" style="color:#2563eb;text-decoration:none;font-weight:600;">${joiner.workEmail}</a></td>
        </tr>
        <tr>
          <td style="padding:5px 14px 5px 0;color:#64748b;background-color:#f8fafc;white-space:nowrap;vertical-align:top;">Password</td>
          <td style="padding:5px 0;background-color:#f8fafc;"><code style="background-color:#e2e8f0;color:#0f172a;padding:4px 12px;border-radius:6px;font-family:'SF Mono',Consolas,monospace;font-size:13px;word-break:break-all;">${joiner.tempPassword}</code></td>
        </tr>
      </table>
    `),

    htmlSectionTitle('🚀', 'Onboarding Links'),
    `<ul style="margin:0 0 24px 0;padding-left:20px;font-size:14px;color:#334155;">
      <li style="margin-bottom:8px;"><a href="${cfg.payrollLink}" style="color:#2563eb;text-decoration:underline;font-weight:500;">Razorpay Payroll Dashboard</a></li>
      <li style="margin-bottom:8px;"><a href="${cfg.slackLink}" style="color:#2563eb;text-decoration:underline;font-weight:500;">Slack Workspace</a></li>
    </ul>`,

    htmlCallout('#fffbeb', '#fde68a', `
      ${htmlSectionTitle('📌', 'Things to Note')}
      <ul style="margin:0;padding-left:18px;font-size:13px;color:#78350f;">
        <li style="margin-bottom:6px;">${dayOneNote}</li>
        <li style="margin-bottom:6px;">💻 A work device will be provided for official purposes.</li>
        <li style="margin-bottom:6px;">📄 <strong>Action required:</strong> Please upload your required documents via <a href="${cfg.docUploadFormLink}" style="color:#92400e;font-weight:700;text-decoration:underline;">this form</a> before Day 1. <span style="color:#a16207;">(Skip if already done)</span></li>
      </ul>
    `),

    htmlP("If you have any questions before joining, feel free to reach out. We look forward to welcoming you tomorrow! 🌟"),
    htmlSignature(cfg),
  ].join('');

  return { subject, html: htmlShell(header, body), to: joiner.personalEmail };
};
