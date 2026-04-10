const { WebClient } = require('@slack/web-api');
const config = require('../config');
const { lookupByEmail, openDM } = require('../utils/lookup');
const blocks = require('./blocks');

let client = null;
function getClient() {
  if (!client) client = new WebClient(config.SLACK_BOT_TOKEN);
  return client;
}

/**
 * Post the D-1 announcement in #hr-onboarding and reply with the checklist.
 * Returns { threadTs, checklistTs }.
 */
async function postAnnouncement(joiner) {
  const slack = getClient();

  // Post main announcement
  const announcementRes = await slack.chat.postMessage({
    channel: config.SLACK_HR_CHANNEL,
    blocks: blocks.announcementBlocks(joiner),
    text: `New Joiner: ${joiner.name} — ${joiner.role}`,
  });
  const threadTs = announcementRes.ts;

  // Reply with interactive checklist in the thread
  const checklistRes = await slack.chat.postMessage({
    channel: config.SLACK_HR_CHANNEL,
    thread_ts: threadTs,
    blocks: blocks.checklistBlocks(joiner, {}),
    text: `Onboarding Checklist — ${joiner.name}`,
  });

  return { threadTs, checklistTs: checklistRes.ts };
}

/** DM the joining buddy */
async function dmBuddy(joiner) {
  const userId = await lookupByEmail(joiner.buddyEmail);
  if (!userId) {
    console.warn(`Buddy not found on Slack: ${joiner.buddyEmail}`);
    return;
  }
  const dmChannel = await openDM(userId);
  await getClient().chat.postMessage({
    channel: dmChannel,
    blocks: blocks.buddyDmBlocks(joiner),
    text: `You've been assigned as joining buddy for ${joiner.name}`,
  });
}

/** DM the POD leader */
async function dmPodLeader(joiner) {
  const userId = await lookupByEmail(joiner.podLeaderEmail);
  if (!userId) {
    console.warn(`POD Leader not found on Slack: ${joiner.podLeaderEmail}`);
    return;
  }
  const dmChannel = await openDM(userId);
  await getClient().chat.postMessage({
    channel: dmChannel,
    blocks: blocks.podLeaderDmBlocks(joiner),
    text: `New POD member: ${joiner.name} joining ${joiner.podName}`,
  });
}

/** DM HR with confirmation + link to the thread */
async function dmHr(joiner, threadTs) {
  const userId = await lookupByEmail(config.HR_EMAIL);
  if (!userId) {
    console.warn(`HR not found on Slack: ${config.HR_EMAIL}`);
    return;
  }

  const threadLink = `https://devxlabs.slack.com/archives/${config.SLACK_HR_CHANNEL}/p${threadTs.replace('.', '')}`;
  const dmChannel = await openDM(userId);
  await getClient().chat.postMessage({
    channel: dmChannel,
    blocks: blocks.hrConfirmationBlocks(joiner, threadLink),
    text: `Onboarding notifications sent for ${joiner.name}`,
  });
}

/** DM the new joinee on their work Slack (D-0) */
async function dmJoinee(joiner, configData) {
  const userId = await lookupByEmail(joiner.workEmail);
  if (!userId) {
    console.warn(`Joinee not found on Slack: ${joiner.workEmail}`);
    return;
  }
  const dmChannel = await openDM(userId);
  await getClient().chat.postMessage({
    channel: dmChannel,
    blocks: blocks.joineeDmBlocks(joiner, configData),
    text: `Welcome to devx Ai Labs, ${joiner.name.split(' ')[0]}!`,
  });
}

/** Post welcome message in #general (D-0) */
async function postGeneralWelcome(joiner) {
  await getClient().chat.postMessage({
    channel: config.SLACK_GENERAL_CHANNEL,
    blocks: blocks.generalWelcomeBlocks(joiner),
    text: `Welcome ${joiner.name} joining as ${joiner.role} in ${joiner.podName} POD! Say hi!`,
  });
}

/** Update the #hr-onboarding thread on joining day */
async function postJoiningDayUpdate(joiner, threadTs) {
  await getClient().chat.postMessage({
    channel: config.SLACK_HR_CHANNEL,
    thread_ts: threadTs,
    blocks: blocks.joiningDayThreadBlocks(joiner),
    text: `${joiner.name} has joined today!`,
  });
}

/** Send a checklist item notification DM to the joinee */
async function dmJoineeCheckNotification(joiner, message) {
  const userId = await lookupByEmail(joiner.workEmail);
  if (!userId) return;
  const dmChannel = await openDM(userId);
  await getClient().chat.postMessage({
    channel: dmChannel,
    blocks: blocks.joineeCheckNotificationBlocks(joiner.name, message),
    text: message,
  });
}

/** Update the checklist message in-place */
async function updateChecklistMessage(channelId, checklistTs, joiner, state) {
  await getClient().chat.update({
    channel: channelId,
    ts: checklistTs,
    blocks: blocks.checklistBlocks(joiner, state),
    text: `Onboarding Checklist — ${joiner.name}`,
  });
}

/** Post smart alert in the joiner's thread */
async function postPendingReminder(joiner, threadTs, pendingCount) {
  await getClient().chat.postMessage({
    channel: config.SLACK_HR_CHANNEL,
    thread_ts: threadTs,
    blocks: blocks.pendingReminderBlocks(joiner, pendingCount),
    text: `${joiner.name} has ${pendingCount} pending items`,
  });
}

/** Post weekly digest in #hr-onboarding */
async function postWeeklyDigest(thisWeek, fullyOnboarded, pendingList) {
  await getClient().chat.postMessage({
    channel: config.SLACK_HR_CHANNEL,
    blocks: blocks.weeklyDigestBlocks(thisWeek, fullyOnboarded, pendingList),
    text: `Weekly Summary: ${thisWeek} joiners, ${fullyOnboarded} fully onboarded`,
  });
}

module.exports = {
  postAnnouncement,
  dmBuddy,
  dmPodLeader,
  dmHr,
  dmJoinee,
  postGeneralWelcome,
  postJoiningDayUpdate,
  dmJoineeCheckNotification,
  updateChecklistMessage,
  postPendingReminder,
  postWeeklyDigest,
};
