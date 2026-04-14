/**
 * POD Leader notification email — sent to POD leader's work email on D-1.
 * Ported from Code.gs sendPodLeaderNotification()
 */
module.exports = function podLeaderEmail(joiner, cfg) {
  const subject = `New POD Member — ${joiner.name}`;

  const html = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1f2937; line-height: 1.6; background: #f9fafb; padding: 20px;">
  <div style="background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
    <div style="background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%); padding: 28px 32px; text-align: center;">
      <h2 style="color: #ffffff; margin: 0; font-size: 18px; font-weight: 600; letter-spacing: -0.3px;">New POD Member</h2>
    </div>
    <div style="padding: 32px;">
      <p style="margin: 0 0 14px 0;">Hi,</p>
      <p style="margin: 0 0 14px 0;">Please meet your new pod member, <strong style="color: #2563eb;">${joiner.name}</strong>, who has joined devx as a <strong>${joiner.role}</strong>.</p>
      <p style="margin: 0 0 24px 0;">Let me know a suitable time for a quick handshake with your new buddy.</p>
      <div style="padding-top: 20px; border-top: 1px solid #e5e7eb;">
        <p style="margin: 0; color: #374151;">Warm regards,</p>
        <p style="margin: 4px 0 0 0; font-weight: 600; color: #111827;">${cfg.hrContactName}</p>
        <p style="margin: 2px 0 0 0; color: #6b7280; font-size: 13px;">${cfg.hrDesignation}</p>
        <p style="margin: 2px 0 0 0; color: #6b7280; font-size: 13px;">${cfg.hrContactPhone} &nbsp;|&nbsp; <a href="mailto:${cfg.hrContactEmail}" style="color: #2563eb; text-decoration: none;">${cfg.hrContactEmail}</a></p>
      </div>
    </div>
  </div>
</div>`;

  return { subject, html, to: joiner.podLeaderEmail };
};
