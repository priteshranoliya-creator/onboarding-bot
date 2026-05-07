/**
 * Buddy notification email — v2.0 design.
 * Sent to buddy's work email on D-1.
 */
const {
  htmlShell, htmlHeader, htmlSectionTitle, htmlInfoCard,
  htmlAccentBlock, htmlSignature, htmlGreeting, htmlP,
} = require('./components');

module.exports = function buddyEmail(joiner, cfg) {
  const buddyFirstName = (joiner.buddyName || '').split(' ')[0];
  const subject = `Joining Buddy Assignment — ${joiner.name} joins tomorrow`;
  const isOnline = (joiner.mode || '').toLowerCase().trim() === 'online';

  const header = htmlHeader('Joining Buddy Assignment', `${joiner.name} is counting on you`);

  const responsibilities = [
    'Be their first point of contact on Day 1.',
    'Introduce them to the team and nearby colleagues.',
    'Help them set up their workstation and tools.',
    isOnline
      ? 'Walk them through daily routines (standup, virtual coffee, daily check-in).'
      : 'Walk them through daily routines (standup, lunch, check-in/check-out).',
    'Answer any questions they have in the first week.',
    'Make sure they feel welcome and included.',
  ];

  const welcomeIntro = isOnline
    ? '<strong>Welcome & Onboarding Support</strong> — Personally welcome the new joiner on Day 1; be available on Slack throughout the day to support them.'
    : '<strong>Welcome & Onboarding Support</strong> — Personally welcome the new joiner on Day 1; from coffee and lunch to evening tea, stick with your new bud.';

  const listItems = responsibilities.map(r =>
    `<li style="margin-bottom:7px;font-size:13px;color:#1e3a5f;">${r}</li>`
  ).join('');

  const body = [
    htmlGreeting(buddyFirstName),
    htmlP(`<strong>${joiner.name}</strong> has been assigned to you as their joining buddy. Please help them get familiar with the team, processes, and everything they need to feel at home.`),

    htmlInfoCard([
      { label: 'Name', value: joiner.name },
      { label: 'Role', value: joiner.role },
      { label: 'POD', value: `<strong style="color:#2563eb;">${joiner.podName}</strong>` },
      { label: 'Joining Date', value: joiner.joiningDateLong },
    ]),

    htmlAccentBlock('#2563eb', `
      <div style="font-weight:700;font-size:14px;color:#1e3a8a;margin-bottom:10px;">Role of a Joining Buddy</div>
      <p style="margin:0 0 12px;font-size:13px;color:#1e3a5f;">${welcomeIntro}</p>
      <ol style="padding-left:18px;margin:0;">${listItems}</ol>
    `),

    htmlP("Thank you for being a great buddy!"),
    htmlSignature(cfg),
  ].join('');

  return { subject, html: htmlShell(header, body), to: joiner.buddyEmail };
};
