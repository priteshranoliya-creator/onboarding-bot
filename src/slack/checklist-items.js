// Checklist definitions — extracted to avoid circular dependency.

const CHECKLIST_CATEGORIES = [
  {
    id: 'pre_joining',
    label: 'Pre-Joining (D-1)',
    items: [
      { id: 'welcome_email', label: 'Welcome email sent' },
      { id: 'handbook_email', label: 'Handbook email sent' },
      { id: 'buddy_notified', label: 'Buddy notified' },
      { id: 'pod_leader_notified', label: 'POD Leader notified' },
      { id: 'work_email_created', label: 'Work email created in Google Admin' },
      { id: 'slack_invite', label: 'Slack invite sent' },
      { id: 'slack_channels', label: 'Added to Slack channels' },
      { id: 'whatsapp_group', label: 'Added to WhatsApp group' },
    ],
  },
  {
    id: 'day0',
    label: 'Day 0 (Joining Day)',
    items: [
      { id: 'workstation', label: 'Workstation allocated + assets handed over' },
      { id: 'welcome_kit', label: 'Welcome kit given' },
      { id: 'biometric', label: 'Biometric and face scan registered' },
      { id: 'two_fa', label: '2FA set up on work email' },
      { id: 'linkedin', label: 'LinkedIn status updated' },
      { id: 'razorpay_link', label: 'Razorpay link shared' },
    ],
  },
  {
    id: 'documents',
    label: 'Documents',
    items: [
      { id: 'contract_signed', label: 'Employee contract signed & scanned' },
      { id: 'offer_letter', label: 'Offer letter signed & scanned' },
      { id: 'relieving_letter', label: 'Relieving letter collected' },
      { id: 'bank_details', label: 'Bank details set up on Razorpay' },
      { id: 'self_docs', label: 'Employee self-uploaded docs on Razorpay' },
      { id: 'policy_ack', label: 'Policy acknowledgment form signed' },
    ],
  },
  {
    id: 'payroll',
    label: 'Payroll',
    items: [
      { id: 'pf_details', label: 'PF account details collected' },
      { id: 'uan_created', label: 'UAN created (200 OT + 1800 PF)' },
      { id: 'pt_pf_explained', label: 'PT + PF deductions explained' },
      { id: 'salary_category', label: 'Salary category confirmed' },
    ],
  },
  {
    id: 'induction',
    label: 'Induction',
    items: [
      { id: 'hr_welcome', label: 'HR welcome session done' },
      { id: 'office_tour', label: 'Office tour by buddy' },
      { id: 'team_intro', label: 'Team introduction (Saturday meet)' },
      { id: 'votex_intro', label: 'Votex introduced' },
      { id: 'policies_walkthrough', label: 'Key policies walkthrough' },
      { id: 'pod_intro', label: 'POD introduction + handshake with POD leader' },
      { id: 'induction_pushpal', label: 'Induction meeting with Pushpal' },
      { id: 'rms_role', label: 'Role added in RMS' },
      { id: 'welcome_post', label: 'Welcome post on Slack/LinkedIn' },
    ],
  },
];

// Items that trigger a DM to the joinee when checked
const JOINEE_NOTIFICATIONS = {
  workstation: 'Your workstation has been allocated and assets handed over.',
  welcome_kit: 'Your welcome kit is ready!',
  biometric: 'Your biometric and face scan have been registered.',
  two_fa: '2FA has been set up on your work email.',
  razorpay_link: 'Your Razorpay payroll link has been shared — check your email.',
  contract_signed: 'Your employee contract has been signed and processed.',
  offer_letter: 'Your offer letter has been signed and processed.',
  bank_details: 'Your bank details have been set up on Razorpay.',
  pf_details: 'Your PF account details have been collected.',
  uan_created: 'Your UAN has been created.',
  rms_role: 'Your role has been added in RMS.',
  welcome_post: 'Your welcome post is live on Slack/LinkedIn!',
};

function getAllItemIds() {
  const ids = [];
  for (const cat of CHECKLIST_CATEGORIES) {
    for (const item of cat.items) {
      ids.push(item.id);
    }
  }
  return ids;
}

function getTotalItemCount() {
  return getAllItemIds().length;
}

function getCheckedCount(state) {
  return getAllItemIds().filter((id) => state[id]).length;
}

module.exports = {
  CHECKLIST_CATEGORIES,
  JOINEE_NOTIFICATIONS,
  getAllItemIds,
  getTotalItemCount,
  getCheckedCount,
};
