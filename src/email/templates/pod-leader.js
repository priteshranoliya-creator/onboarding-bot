/**
 * POD Leader notification email — v2.0 design.
 * Sent to POD leader's work email on D-1.
 */
const {
  htmlShell, htmlHeader, htmlInfoCard,
  htmlSignature, htmlGreeting, htmlP,
} = require('./components');

module.exports = function podLeaderEmail(joiner, cfg) {
  const subject = `New POD Member — ${joiner.name}`;
  const leaderFirstName = (joiner.podLeaderName || '').split(' ')[0];

  const header = htmlHeader('New POD Member', `${joiner.podName} is growing`);

  const body = [
    htmlGreeting(leaderFirstName),
    htmlP(`Please meet your new pod member, <strong style="color:#2563eb;">${joiner.name}</strong>, who has joined devx as a <strong>${joiner.role}</strong>.`),
    htmlP("Let me know a suitable time for a quick handshake with your new team member."),

    htmlInfoCard([
      { label: 'Name', value: joiner.name },
      { label: 'Role', value: joiner.role },
      { label: 'Department', value: joiner.department || '-' },
      { label: 'Joining Date', value: `${joiner.joiningDay}, ${joiner.joiningDateLong}` },
      { label: 'Mode', value: joiner.mode || '-' },
      { label: 'Buddy', value: joiner.buddyName || '-' },
      { label: 'Work Email', value: `<a href="mailto:${joiner.workEmail}" style="color:#2563eb;text-decoration:none;">${joiner.workEmail}</a>` },
    ]),

    htmlSignature(cfg),
  ].join('');

  return { subject, html: htmlShell(header, body), to: joiner.podLeaderEmail };
};
