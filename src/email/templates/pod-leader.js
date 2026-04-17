/**
 * POD Leader notification email — v2.0 design.
 * Sent to POD leader's work email on D-1.
 */
const {
  htmlShell, htmlHeader, htmlSectionTitle, htmlInfoCard,
  htmlAccentBlock, htmlSignature, htmlGreeting, htmlP,
} = require('./components');

module.exports = function podLeaderEmail(joiner, cfg) {
  const subject = `New POD Member — ${joiner.name}`;
  const leaderFirstName = (joiner.podLeaderName || '').split(' ')[0];

  const header = htmlHeader('New POD Member', `${joiner.podName} is growing`);

  const actionItems = [
    'Schedule a handshake meeting within the first day.',
    'Introduce them to the POD.',
    'Set up a team intro call.',
    'Assign starter tasks for the first week.',
  ];

  const actionList = actionItems.map(item =>
    `<li style="margin-bottom:7px;font-size:13px;color:#1e3a5f;">${item}</li>`
  ).join('');

  const body = [
    htmlGreeting(leaderFirstName),
    htmlP(`Please meet your new pod member, <strong style="color:#2563eb;">${joiner.name}</strong>, who has joined devx as a <strong>${joiner.role}</strong>.`),

    htmlInfoCard([
      { label: 'Name', value: joiner.name },
      { label: 'Role', value: joiner.role },
      { label: 'Joining Date', value: `${joiner.joiningDay}, ${joiner.joiningDateLong}` },
      { label: 'Mode', value: joiner.mode || '-' },
      { label: 'Buddy', value: joiner.buddyName || '-' },
      { label: 'Work Email', value: `<a href="mailto:${joiner.workEmail}" style="color:#2563eb;text-decoration:none;">${joiner.workEmail}</a>` },
    ]),

    htmlAccentBlock('#2563eb', `
      <div style="font-weight:700;font-size:14px;color:#1e3a8a;margin-bottom:10px;">Action items</div>
      <p style="margin:0 0 12px;font-size:13px;color:#1e3a5f;">Let me know a suitable time for a quick handshake with your new team member.</p>
      <ol style="padding-left:18px;margin:0;">${actionList}</ol>
    `),

    htmlSignature(cfg),
  ].join('');

  return { subject, html: htmlShell(header, body), to: joiner.podLeaderEmail };
};
