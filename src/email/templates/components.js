/**
 * Reusable HTML email components — v2.0 design system.
 * Dark header, solid colors, dark-mode safe, MSO compatible.
 */

/** Outer page wrapper — centred card on light background */
function htmlShell(headerHtml, bodyHtml) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>devxlabs.ai</title>
  <style>
    @media only screen and (max-width: 600px) {
      .email-outer  { padding: 12px 8px !important; }
      .email-header { padding: 22px 18px 18px !important; }
      .email-header h1 { font-size: 19px !important; }
      .email-body   { padding: 22px 18px 22px !important; }
      .info-label   { width: 110px !important; font-size: 12px !important; padding: 8px 10px !important; }
      .info-value   { font-size: 13px !important; padding: 8px 10px !important; }
      .policy-arrow { display: none !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;">
<!--[if mso]><table role="presentation" width="640" align="center"><tr><td><![endif]-->
<div class="email-outer" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:640px;margin:0 auto;color:#1e293b;line-height:1.65;background-color:#f1f5f9;padding:24px 16px;">
  <div style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.07);">
    ${headerHtml}
    <div class="email-body" style="padding:32px 28px 28px;background-color:#ffffff;">${bodyHtml}</div>
  </div>
  <div style="text-align:center;padding:16px 0 0;font-size:11px;color:#94a3b8;">
    &copy; ${new Date().getFullYear()} devx Ai Labs &middot; Surat, India
  </div>
</div>
<!--[if mso]></td></tr></table><![endif]-->
</body>
</html>`;
}

/** Dark header banner */
function htmlHeader(title, subtitle) {
  const sub = subtitle
    ? `<p style="color:#d1d5db;margin:6px 0 0;font-size:13px;font-weight:400;">${subtitle}</p>`
    : '';
  return `
<div class="email-header" style="background-color:#0f172a;padding:32px 32px 28px;text-align:center;">
  <div style="display:inline-block;background-color:#ffffff;color:#0f172a;padding:4px 14px;border-radius:20px;font-size:11px;font-weight:700;letter-spacing:0.4px;margin-bottom:12px;">devxlabs.ai</div>
  <h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:700;letter-spacing:-0.3px;">${title}</h1>
  ${sub}
</div>`;
}

/** Section heading */
function htmlSectionTitle(emoji, text) {
  return `<div style="font-weight:700;font-size:14px;color:#0f172a;margin:0 0 12px;letter-spacing:-0.2px;">${emoji} ${text}</div>`;
}

/** Key-value info card */
function htmlInfoCard(rows) {
  const trs = rows.map(r =>
    `<tr>
      <td class="info-label" style="padding:9px 14px;color:#64748b;font-size:13px;width:140px;vertical-align:top;background-color:#f8fafc;white-space:nowrap;">${r.label}</td>
      <td class="info-value" style="padding:9px 14px;font-size:14px;color:#1e293b;background-color:#f8fafc;word-break:break-word;">${r.value}</td>
    </tr>`
  ).join('');
  return `
<div style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;margin-bottom:24px;">
  <table style="width:100%;border-collapse:collapse;">${trs}</table>
</div>`;
}

/** Highlighted callout box */
function htmlCallout(bgColor, borderColor, contentHtml) {
  return `
<div style="background-color:${bgColor};border:1px solid ${borderColor};border-radius:12px;padding:20px;margin-bottom:24px;">
  ${contentHtml}
</div>`;
}

/** Accent left-border block */
function htmlAccentBlock(borderColor, contentHtml) {
  return `
<div style="border-left:4px solid ${borderColor};background-color:#f8fafc;padding:20px 22px;border-radius:0 10px 10px 0;margin-bottom:24px;">
  ${contentHtml}
</div>`;
}

/** CTA button */
function htmlButton(url, label) {
  return `
<div style="text-align:center;margin:20px 0;">
  <a href="${url}" style="display:inline-block;background-color:#0f172a;color:#ffffff;padding:13px 36px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;letter-spacing:0.2px;">${label}</a>
</div>`;
}

/** Policy card link */
function htmlPolicyCard(title, url) {
  return `
<a href="${url}" style="text-decoration:none;display:block;margin-bottom:10px;">
  <div style="background-color:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px 18px;">
    <table style="width:100%;border-collapse:collapse;">
      <tr>
        <td style="font-weight:600;color:#1e293b;font-size:14px;">${title}</td>
        <td class="policy-arrow" style="text-align:right;color:#64748b;font-size:18px;width:24px;white-space:nowrap;">&rarr;</td>
      </tr>
    </table>
  </div>
</a>`;
}

/** Signature block */
function htmlSignature(cfg) {
  return `
<div style="border-top:1px solid #e2e8f0;padding-top:22px;margin-top:28px;">
  <p style="margin:0;color:#475569;font-size:14px;">Warm regards,</p>
  <p style="margin:5px 0 0;font-weight:700;color:#0f172a;font-size:15px;">${cfg.hrContactName}</p>
  <p style="margin:2px 0 0;color:#64748b;font-size:12px;">${cfg.hrDesignation}</p>
  <p style="margin:2px 0 0;color:#64748b;font-size:12px;">${cfg.hrContactPhone} &nbsp;&middot;&nbsp; <a href="mailto:${cfg.hrContactEmail}" style="color:#2563eb;text-decoration:none;">${cfg.hrContactEmail}</a></p>
</div>`;
}

/** Greeting line */
function htmlGreeting(name) {
  return `<p style="margin:0 0 14px;font-size:15px;">Hi <strong>${name}</strong>,</p>`;
}

/** Paragraph */
function htmlP(text) {
  return `<p style="margin:0 0 16px;font-size:14px;color:#334155;">${text}</p>`;
}

module.exports = {
  htmlShell,
  htmlHeader,
  htmlSectionTitle,
  htmlInfoCard,
  htmlCallout,
  htmlAccentBlock,
  htmlButton,
  htmlPolicyCard,
  htmlSignature,
  htmlGreeting,
  htmlP,
};
