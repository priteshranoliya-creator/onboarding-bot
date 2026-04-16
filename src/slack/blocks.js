const { formatLong } = require('../utils/date');
const { CHECKLIST_CATEGORIES } = require('./checklist-items');

// ─── D-1 Announcement in #hr-onboarding ─────────────────────────

function announcementBlocks(joiner) {
  const dateStr = formatLong(parseDate(joiner.joiningDate));
  return [
    {
      type: 'header',
      text: { type: 'plain_text', text: `New Joiner: ${joiner.name}` },
    },
    { type: 'divider' },
    {
      type: 'section',
      fields: [
        mrkdwn(`*Role:*\n${joiner.role}`),
        mrkdwn(`*Department:*\n${joiner.department}`),
        mrkdwn(`*Joining:*\n${dateStr}`),
        mrkdwn(`*Mode:*\n${joiner.mode}`),
        mrkdwn(`*Buddy:*\n${joiner.buddyName}`),
        mrkdwn(`*POD:*\n${joiner.podName} (Lead: ${joiner.podLeaderName})`),
      ],
    },
    {
      type: 'section',
      fields: [mrkdwn(`*Work Email:*\n${joiner.workEmail}`)],
    },
  ];
}

// ─── Interactive Checklist (posted as thread reply) ──────────────

function checklistBlocks(joiner, state = {}) {
  const blocks = [
    {
      type: 'header',
      text: { type: 'plain_text', text: `Onboarding Checklist — ${joiner.name}` },
    },
  ];

  let totalItems = 0;
  let checkedItems = 0;

  for (const cat of CHECKLIST_CATEGORIES) {
    blocks.push({ type: 'divider' });
    blocks.push({
      type: 'section',
      text: mrkdwn(`*${cat.label}*`),
    });

    const options = cat.items.map((item) => ({
      text: { type: 'mrkdwn', text: item.label },
      value: item.id,
    }));

    const initialOptions = cat.items
      .filter((item) => state[item.id])
      .map((item) => ({
        text: { type: 'mrkdwn', text: item.label },
        value: item.id,
      }));

    totalItems += cat.items.length;
    checkedItems += initialOptions.length;

    const element = {
      type: 'checkboxes',
      action_id: `checklist_${cat.id}`,
      options,
    };
    if (initialOptions.length > 0) {
      element.initial_options = initialOptions;
    }

    blocks.push({
      type: 'actions',
      block_id: `chk::${cat.id}::${joiner.workEmail}`,
      elements: [element],
    });
  }

  const pct = totalItems > 0 ? Math.round((checkedItems / totalItems) * 100) : 0;
  blocks.push({ type: 'divider' });
  blocks.push({
    type: 'context',
    elements: [
      mrkdwn(`${checkedItems}/${totalItems} completed (${pct}%)`),
    ],
  });

  return blocks;
}

// ─── Buddy DM ────────────────────────────────────────────────────

function buddyDmBlocks(joiner) {
  const dateStr = formatLong(parseDate(joiner.joiningDate));
  return [
    {
      type: 'header',
      text: { type: 'plain_text', text: 'Joining Buddy Assignment' },
    },
    { type: 'divider' },
    {
      type: 'section',
      text: mrkdwn(
        `Hi ${joiner.buddyName},\n\n` +
          `You've been assigned as the *Joining Buddy* for *${joiner.name}*, ` +
          `who is joining as *${joiner.role}* in the *${joiner.podName}* POD on *${dateStr}*.`
      ),
    },
    {
      type: 'section',
      text: mrkdwn(
        '*Your responsibilities:*\n\n' +
          '1. Be their first point of contact on Day 1\n' +
          '2. Give them an office tour (workstations, meeting rooms, pantry, restrooms)\n' +
          '3. Introduce them to the team and nearby colleagues\n' +
          '4. Help them set up their workstation and tools\n' +
          '5. Walk them through daily routines (standup, lunch, check-in/check-out)\n' +
          '6. Show them Slack channels, calendar invites, and communication norms\n' +
          '7. Answer any questions they have in the first week\n' +
          '8. Make sure they feel welcome and included\n' +
          '9. Check in with them at end of Day 1 and Day 3'
      ),
    },
    {
      type: 'context',
      elements: [mrkdwn('Thank you for helping make their onboarding experience great!')],
    },
  ];
}

// ─── POD Leader DM ───────────────────────────────────────────────

function podLeaderDmBlocks(joiner) {
  const dateStr = formatLong(parseDate(joiner.joiningDate));
  return [
    {
      type: 'header',
      text: { type: 'plain_text', text: 'New POD Member Alert' },
    },
    { type: 'divider' },
    {
      type: 'section',
      text: mrkdwn(
        `Hi ${joiner.podLeaderName},\n\n` +
          `A new member is joining your POD *${joiner.podName}*:`
      ),
    },
    {
      type: 'section',
      fields: [
        mrkdwn(`*Name:*\n${joiner.name}`),
        mrkdwn(`*Role:*\n${joiner.role}`),
        mrkdwn(`*Department:*\n${joiner.department}`),
        mrkdwn(`*Joining:*\n${dateStr}`),
        mrkdwn(`*Mode:*\n${joiner.mode}`),
        mrkdwn(`*Buddy:*\n${joiner.buddyName}`),
      ],
    },
    {
      type: 'section',
      text: mrkdwn(
        `*Work Email:* ${joiner.workEmail}\n\n` +
          '*Action items:*\n' +
          '1. Schedule a handshake meeting within the first 2 days\n' +
          '2. Introduce them to the POD and share current projects\n' +
          '3. Set up a team intro call\n' +
          '4. Assign starter tasks for the first week'
      ),
    },
  ];
}

// ─── HR Confirmation DM ─────────────────────────────────────────

function hrConfirmationBlocks(joiner, threadLink) {
  return [
    {
      type: 'section',
      text: mrkdwn(
        `Onboarding notifications sent for *${joiner.name}* (${joiner.role}).\n\n` +
          `*Checklist thread:* ${threadLink}\n` +
          `*Buddy:* ${joiner.buddyName} — notified\n` +
          `*POD Leader:* ${joiner.podLeaderName} — notified`
      ),
    },
  ];
}

// ─── D-0 Welcome in #general ────────────────────────────────────

function generalWelcomeBlocks(joiner) {
  return [
    {
      type: 'section',
      text: mrkdwn(
        `Welcome *${joiner.name}* joining as *${joiner.role}* in the *${joiner.podName}* POD! Say hi!`
      ),
    },
  ];
}

// ─── D-0 Joinee DM ──────────────────────────────────────────────

function joineeDmBlocks(joiner, configData) {
  const links = [];
  if (configData.leavePolicyLink)
    links.push(`<${configData.leavePolicyLink}|Leave Policy>`);
  if (configData.poshPolicyLink)
    links.push(`<${configData.poshPolicyLink}|POSH Policy>`);
  if (configData.wfhPolicyLink)
    links.push(`<${configData.wfhPolicyLink}|WFH Policy>`);
  if (configData.assetPolicyLink)
    links.push(`<${configData.assetPolicyLink}|Asset Policy>`);
  if (configData.referralPolicyLink)
    links.push(`<${configData.referralPolicyLink}|Referral Policy>`);
  if (configData.separationPolicyLink)
    links.push(`<${configData.separationPolicyLink}|Separation Policy>`);
  if (configData.reimbursementLink)
    links.push(`<${configData.reimbursementLink}|Reimbursement Process>`);

  const blocks = [
    {
      type: 'header',
      text: { type: 'plain_text', text: `Welcome to devx Ai Labs, ${joiner.name.split(' ')[0]}!` },
    },
    { type: 'divider' },
    {
      type: 'section',
      text: mrkdwn(
        "We're thrilled to have you on board. Here's everything you need to get started:"
      ),
    },
    {
      type: 'section',
      text: mrkdwn(
        `*Your Buddy:* ${joiner.buddyName || 'TBD'} — they'll help you settle in today.\n` +
          `*Your POD Leader:* ${joiner.podLeaderName || 'TBD'} — you'll meet them soon.\n` +
          `*Your POD:* ${joiner.podName || 'TBD'}`
      ),
    },
  ];

  if (links.length > 0) {
    blocks.push({
      type: 'section',
      text: mrkdwn('*Company Policies:*\n' + links.map((l) => `  ${l}`).join('\n')),
    });
  }

  const formLinks = [];
  if (configData.acknowledgmentFormLink)
    formLinks.push(`*Acknowledgment Form:* <${configData.acknowledgmentFormLink}|Sign here>`);
  if (configData.docUploadFormLink)
    formLinks.push(`*Document Upload:* <${configData.docUploadFormLink}|Upload here>`);
  if (configData.payrollLink)
    formLinks.push(`*Payroll:* <${configData.payrollLink}|Razorpay Payroll>`);

  if (formLinks.length > 0) {
    blocks.push({
      type: 'section',
      text: mrkdwn(formLinks.join('\n')),
    });
  }

  blocks.push({
    type: 'context',
    elements: [
      mrkdwn(`HR Contact: ${configData.hrContactName || 'HR'} — ${configData.hrContactEmail || ''}`),
    ],
  });

  return blocks;
}

// ─── Joinee Notification (when checklist item is checked) ────────

function joineeCheckNotificationBlocks(joinerName, message) {
  return [
    {
      type: 'section',
      text: mrkdwn(`Hi ${joinerName.split(' ')[0]}, ${message}`),
    },
  ];
}

// ─── Slash Command: /onboard status ──────────────────────────────

function onboardStatusBlocks(joiner, state) {
  const { CHECKLIST_CATEGORIES: cats } = require('./checklist-items');
  const blocks = [
    {
      type: 'header',
      text: { type: 'plain_text', text: `Onboarding Status — ${joiner.name}` },
    },
    { type: 'divider' },
    {
      type: 'section',
      fields: [
        mrkdwn(`*Role:*\n${joiner.role}`),
        mrkdwn(`*Joining:*\n${joiner.joiningDate}`),
        mrkdwn(`*Mode:*\n${joiner.mode}`),
        mrkdwn(`*POD:*\n${joiner.podName}`),
      ],
    },
    { type: 'divider' },
  ];

  let total = 0;
  let done = 0;
  for (const cat of cats) {
    const catDone = cat.items.filter((i) => state[i.id]).length;
    const catTotal = cat.items.length;
    total += catTotal;
    done += catDone;
    const emoji = catDone === catTotal ? ':white_check_mark:' : ':hourglass_flowing_sand:';
    blocks.push({
      type: 'section',
      text: mrkdwn(`${emoji} *${cat.label}* — ${catDone}/${catTotal}`),
    });
  }

  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  blocks.push({ type: 'divider' });
  blocks.push({
    type: 'context',
    elements: [mrkdwn(`*Overall:* ${done}/${total} (${pct}%)`)],
  });

  return blocks;
}

// ─── Slash Command: /checklist pending items ─────────────────────

function pendingItemsBlocks(joiner, state) {
  const { CHECKLIST_CATEGORIES: cats, getTotalItemCount, getCheckedCount } = require('./checklist-items');
  const total = getTotalItemCount();
  const done = getCheckedCount(state);
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const progressBar = buildProgressBar(done, total);

  const blocks = [
    {
      type: 'header',
      text: { type: 'plain_text', text: `Checklist — ${joiner.name}` },
    },
    {
      type: 'section',
      text: mrkdwn(`${progressBar}  *${done}/${total}* completed (${pct}%)`),
    },
    { type: 'divider' },
  ];

  let hasPending = false;
  for (const cat of cats) {
    const doneItems = cat.items.filter((i) => state[i.id]);
    const pendingItems = cat.items.filter((i) => !state[i.id]);
    const catEmoji = pendingItems.length === 0 ? ':white_check_mark:' : ':clipboard:';

    let lines = '';
    for (const item of cat.items) {
      if (state[item.id]) {
        lines += `\n  :white_check_mark:  ~${item.label}~`;
      } else {
        lines += `\n  :black_square_button:  ${item.label}`;
        hasPending = true;
      }
    }

    blocks.push({
      type: 'section',
      text: mrkdwn(`${catEmoji} *${cat.label}* — ${doneItems.length}/${cat.items.length}${lines}`),
    });
  }

  if (!hasPending) {
    blocks.push({ type: 'divider' });
    blocks.push({
      type: 'section',
      text: mrkdwn(':tada: *All items completed!* Great job.'),
    });
  }

  return blocks;
}

function buildProgressBar(done, total) {
  const filled = total > 0 ? Math.round((done / total) * 10) : 0;
  const empty = 10 - filled;
  return ':large_green_square:'.repeat(filled) + ':white_large_square:'.repeat(empty);
}

// ─── Slash Command: /upcoming ────────────────────────────────────

function upcomingBlocks(joiners) {
  if (joiners.length === 0) {
    return [
      { type: 'section', text: mrkdwn('No joiners in the next 7 days.') },
    ];
  }

  const blocks = [
    {
      type: 'header',
      text: { type: 'plain_text', text: 'Upcoming Joiners (Next 7 Days)' },
    },
    { type: 'divider' },
  ];

  for (const { joiner, daysAway, checkedCount, totalCount } of joiners) {
    const pct = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0;
    const dayLabel =
      daysAway === 0 ? 'Today' : daysAway === 1 ? 'Tomorrow' : `In ${daysAway} days`;
    const readiness = pct === 100 ? ':white_check_mark: Ready' : `:hourglass_flowing_sand: ${pct}%`;
    blocks.push({
      type: 'section',
      text: mrkdwn(
        `*${joiner.name}* — ${joiner.role}\n` +
          `${dayLabel} (${joiner.joiningDate}) | ${joiner.mode} | ${readiness}`
      ),
    });
  }

  return blocks;
}

// ─── Thread update for D-0 ───────────────────────────────────────

function joiningDayThreadBlocks(joiner) {
  return [
    {
      type: 'section',
      text: mrkdwn(`:large_green_circle: *${joiner.name}* has joined today!`),
    },
  ];
}

// ─── Smart Alert: pending reminder ───────────────────────────────

function pendingReminderBlocks(joiner, pendingCount) {
  return [
    {
      type: 'section',
      text: mrkdwn(
        `:warning: *${joiner.name}* still has *${pendingCount} pending* checklist items ` +
          `(joined ${joiner.joiningDate}). Please review.`
      ),
    },
  ];
}

function weeklyDigestBlocks(thisWeek, fullyOnboarded, pendingList) {
  const blocks = [
    {
      type: 'header',
      text: { type: 'plain_text', text: 'Weekly Onboarding Summary' },
    },
    { type: 'divider' },
    {
      type: 'section',
      text: mrkdwn(
        `*This week:* ${thisWeek} joiner(s)\n` +
          `*Fully onboarded:* ${fullyOnboarded}\n` +
          `*Pending items:* ${pendingList.length} joiner(s)`
      ),
    },
  ];

  for (const { name, pending } of pendingList) {
    blocks.push({
      type: 'section',
      text: mrkdwn(`  :hourglass_flowing_sand: ${name} — ${pending} items remaining`),
    });
  }

  return blocks;
}

// ─── Helpers ─────────────────────────────────────────────────────

function mrkdwn(text) {
  return { type: 'mrkdwn', text };
}

function parseDate(dateStr) {
  const [d, m, y] = dateStr.split('/').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

module.exports = {
  announcementBlocks,
  checklistBlocks,
  buddyDmBlocks,
  podLeaderDmBlocks,
  hrConfirmationBlocks,
  generalWelcomeBlocks,
  joineeDmBlocks,
  joineeCheckNotificationBlocks,
  onboardStatusBlocks,
  pendingItemsBlocks,
  upcomingBlocks,
  joiningDayThreadBlocks,
  pendingReminderBlocks,
  weeklyDigestBlocks,
};
