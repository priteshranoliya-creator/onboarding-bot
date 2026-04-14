/**
 * Handbook & Policies email — sent to employee personal email on D-1.
 * Ported from Code.gs sendHandbookEmail()
 */
module.exports = function handbookEmail(joiner, cfg) {
  const subject = 'Employee Handbook & Policies — Please Review & Acknowledge';

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

  const html = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #1f2937; line-height: 1.6; background: #f9fafb; padding: 20px;">
  <div style="background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
    <div style="background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%); padding: 32px; text-align: center;">
      <h2 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 600; letter-spacing: -0.3px;">Employee Handbook & Policies</h2>
      <p style="color: #bfdbfe; margin: 6px 0 0 0; font-size: 13px;">Please review and acknowledge</p>
    </div>
    <div style="padding: 32px;">
      <p style="margin: 0 0 14px 0;">Hi <strong>${joiner.firstName}</strong>,</p>
      <p style="margin: 0 0 20px 0;">We're sharing the devx Employee Handbook with you. Kindly review each policy carefully and feel free to reach out if you have any questions.</p>
      <p style="margin: 24px 0 12px 0; font-weight: 600; color: #111827;">Company Policies</p>
      ${policyCard('Asset Policy', cfg.assetPolicyLink)}
      ${policyCard('Employee Referral Policy', cfg.referralPolicyLink)}
      ${policyCard('Employment Separation Policy', cfg.separationPolicyLink)}
      ${policyCard('Leave Policy', cfg.leavePolicyLink)}
      ${policyCard('POSH Policy', cfg.poshPolicyLink)}
      ${policyCard('Razorpay Reimbursement Process', cfg.reimbursementLink)}
      ${policyCard('Work From Home (WFH) Policy', cfg.wfhPolicyLink)}
      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 22px; margin: 28px 0 20px 0; text-align: center; border-radius: 8px;">
        <p style="margin: 0 0 6px 0; font-weight: 600; color: #15803d; font-size: 15px;">Acknowledgment Required</p>
        <p style="margin: 0 0 16px 0; font-size: 13px; color: #166534;">Please review the policies, add your e-signature, and submit the form.</p>
        <a href="${cfg.acknowledgmentFormLink}" style="display: inline-block; background: #2563eb; color: #ffffff; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px;">Open Acknowledgment Form</a>
      </div>
      <p style="margin: 20px 0;">Thank you!</p>
      <div style="margin-top: 24px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
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
