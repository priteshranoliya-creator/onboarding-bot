/**
 * Handbook & Policies email — v2.0 design.
 * Sent to employee personal email (CC work) on D-1.
 */
const {
  htmlShell, htmlHeader, htmlSectionTitle, htmlPolicyCard,
  htmlCallout, htmlSignature, htmlGreeting, htmlP,
} = require('./components');

module.exports = function handbookEmail(joiner, cfg) {
  const subject = '📚 Employee Handbook & Policies — Please Review';

  const header = htmlHeader('Employee Handbook', 'Please review and acknowledge');

  const policies = [
    ['Asset Policy', cfg.assetPolicyLink],
    ['Employee Referral Policy', cfg.referralPolicyLink],
    ['Employment Separation Policy', cfg.separationPolicyLink],
    ['Leave Policy', cfg.leavePolicyLink],
    ['POSH Policy', cfg.poshPolicyLink],
    ['Reimbursement Process', cfg.reimbursementLink],
    ['Work From Home (WFH) Policy', cfg.wfhPolicyLink],
  ];

  const policyCards = policies.map(p => htmlPolicyCard(p[0], p[1])).join('');

  const body = [
    htmlGreeting(joiner.firstName),
    htmlP("We're sharing the devx Employee Handbook with you. 📋 Please review each policy carefully and reach out if you have any questions."),

    htmlSectionTitle('📂', 'Company Policies'),
    `<div style="margin-bottom:24px;">${policyCards}</div>`,

    htmlCallout('#f0fdf4', '#bbf7d0', `
      <div style="text-align:center;">
        <p style="margin:0 0 4px;font-weight:700;color:#166534;font-size:15px;">✍️ Acknowledgment Required</p>
        <p style="margin:0 0 16px;font-size:13px;color:#15803d;">Review the policies, add your e-signature, and share it back.</p>
        <a href="${cfg.acknowledgmentFormLink}" style="display:inline-block;background-color:#0f172a;color:#ffffff;padding:13px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Open Acknowledgment Form &rarr;</a>
      </div>
    `),

    htmlP("Thank you! 🙏"),
    htmlSignature(cfg),
  ].join('');

  return { subject, html: htmlShell(header, body), to: joiner.personalEmail, cc: joiner.workEmail };
};
