/**
 * Manually sync the missed JOINER_SYNC entries from #bot-sync into prod DB.
 * Mirrors src/slack/list-sync.js logic (resolves @leader/@buddy via Slack users.list).
 * Usage: node scripts/manual-sync.js
 */
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const { WebClient } = require('@slack/web-api');
const db = require('../src/db/client');
const config = require('../src/config');

const slack = new WebClient(config.SLACK_BOT_TOKEN);

const ENTRIES = [
  { name: 'Gopi Vavilla',      role: 'Growth Associate',      mode: '',       joiningDate: '2026-05-18', podName: '',                  podLeader: '',                buddy: '', personalEmail: '',                          status: 'pending' },
  { name: 'Aryan Vora',        role: 'Growth Consultant',     mode: 'Online', joiningDate: '2026-06-01', podName: 'Cha - Ching',       podLeader: '@Yash',           buddy: '', personalEmail: '',                          status: 'Offer Accepted' },
  { name: 'Megha Desai',       role: 'Outcome Manager Lead',  mode: 'Online', joiningDate: '2026-05-21', podName: 'Anchor',            podLeader: '@Pushpal',        buddy: '', personalEmail: 'meghadesai511@gmail.com',   status: 'Offer Accepted' },
  { name: 'Urvaang Naik',      role: 'APM/ Outcome Manager',  mode: 'Onsite', joiningDate: '2026-06-22', podName: 'Anchor',            podLeader: '@Pushpal',        buddy: '', personalEmail: '',                          status: 'Offer Accepted' },
  { name: 'Kaustubh Kejriwal', role: 'Growth Consultant',     mode: 'Online', joiningDate: '2026-07-01', podName: 'Cha - Ching',       podLeader: '@Yash',           buddy: '', personalEmail: '',                          status: 'Offer Accepted' },
  { name: 'Priyanshu Arya',    role: 'DevOps',                mode: 'Onsite', joiningDate: '2026-06-01', podName: 'Uptime Syndicate',  podLeader: '@Naisarg Parekh', buddy: '', personalEmail: '',                          status: 'Offer rolled' },
  { name: 'Priyanshu Joshi',   role: 'Growth Consultant',     mode: 'Online', joiningDate: '2026-07-01', podName: 'Cha - Ching',       podLeader: '@Yash',           buddy: '', personalEmail: '',                          status: 'Offer Accepted' },
];

async function buildUserMap() {
  const res = await slack.users.list({ limit: 500 });
  const map = new Map();
  for (const m of res.members || []) {
    if (m.deleted || m.is_bot) continue;
    const email = m.profile?.email || '';
    const real = (m.real_name || '').toLowerCase();
    const display = (m.profile?.display_name || '').toLowerCase();
    if (real)    map.set(real,    { name: m.real_name, email });
    if (display) map.set(display, { name: m.real_name || m.profile.display_name, email });
  }
  return map;
}

function resolve(raw, userMap) {
  if (!raw) return { name: '', email: '' };
  const clean = raw.startsWith('@') ? raw.slice(1).trim() : raw.trim();
  const found = userMap.get(clean.toLowerCase());
  if (found) return found;
  return { name: clean, email: '' };
}

async function main() {
  console.log('Loading Slack workspace users…');
  const userMap = await buildUserMap();
  console.log(`Loaded ${userMap.size} user keys\n`);

  for (const e of ENTRIES) {
    const podLeader = resolve(e.podLeader, userMap);
    const buddy = resolve(e.buddy, userMap);

    const joinerData = {
      name: e.name,
      workEmail: '',
      personalEmail: e.personalEmail,
      phone: '',
      role: e.role,
      joiningDate: e.joiningDate,
      mode: e.mode,
      podName: e.podName,
      podLeaderName: podLeader.name,
      podLeaderEmail: podLeader.email,
      buddyName: buddy.name,
      buddyEmail: buddy.email,
      tempPassword: '',
      resumeUrl: '',
      status: e.status,
      department: '',
      notes: '',
    };

    try {
      const id = await db.upsertJoiner(joinerData);
      await db.addEvent({
        joinerId: id,
        eventType: 'list_sync',
        payload: { source: 'manual_sync', status: e.status },
        actor: 'manual_script',
      });
      console.log(`✓ ${e.name.padEnd(20)} → #${id}  podLeader=${podLeader.name || '-'} <${podLeader.email || '-'}>`);
    } catch (err) {
      console.error(`✗ ${e.name}: ${err.message}`);
    }
  }
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
