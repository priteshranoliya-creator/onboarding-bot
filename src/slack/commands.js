const db = require('../db/client');
const blocks = require('./blocks');
const { getCheckedCount, getTotalItemCount } = require('./checklist-items');
const { isWithinDaysIST, daysFromTodayIST } = require('../utils/date');

function register(app) {
  // /checklist [name] — show pending items for a joiner
  app.command('/checklist', async ({ command, ack, respond }) => {
    await ack();
    try {
      const name = command.text?.trim();
      if (!name) {
        await respond({ text: 'Usage: `/checklist Rahul Sharma`' });
        return;
      }

      const joiner = await db.getJoinerByName(name);
      if (!joiner) {
        await respond({ text: `No joiner found matching "${name}".` });
        return;
      }

      const state = await db.getChecklistState(joiner.workEmail);
      await respond({
        blocks: blocks.pendingItemsBlocks(joiner, state),
        text: `Pending items for ${joiner.name}`,
      });
    } catch (err) {
      console.error('/checklist error:', err);
      await respond({ text: 'Something went wrong. Check logs.' });
    }
  });

  // /onboard [name] — full status overview
  app.command('/onboard', async ({ command, ack, respond }) => {
    await ack();
    try {
      const name = command.text?.trim();
      if (!name) {
        await respond({ text: 'Usage: `/onboard Rahul Sharma`' });
        return;
      }

      const joiner = await db.getJoinerByName(name);
      if (!joiner) {
        await respond({ text: `No joiner found matching "${name}".` });
        return;
      }

      const state = await db.getChecklistState(joiner.workEmail);
      await respond({
        blocks: blocks.onboardStatusBlocks(joiner, state),
        text: `Onboarding status for ${joiner.name}`,
      });
    } catch (err) {
      console.error('/onboard error:', err);
      await respond({ text: 'Something went wrong. Check logs.' });
    }
  });

  // /upcoming — joiners in the next 7 days with readiness
  app.command('/upcoming', async ({ command, ack, respond }) => {
    await ack();
    try {
      const joiners = await db.getJoiners();
      const upcoming = [];

      for (const joiner of joiners) {
        if (!joiner.joiningDate) continue;
        if (!isWithinDaysIST(joiner.joiningDate, 7)) continue;

        const state = await db.getChecklistState(joiner.workEmail);
        upcoming.push({
          joiner,
          daysAway: daysFromTodayIST(joiner.joiningDate),
          checkedCount: getCheckedCount(state),
          totalCount: getTotalItemCount(),
        });
      }

      // Sort by days away ascending
      upcoming.sort((a, b) => a.daysAway - b.daysAway);

      await respond({
        blocks: blocks.upcomingBlocks(upcoming),
        text: `${upcoming.length} joiner(s) in the next 7 days`,
      });
    } catch (err) {
      console.error('/upcoming error:', err);
      await respond({ text: 'Something went wrong. Check logs.' });
    }
  });
}

module.exports = { register };
