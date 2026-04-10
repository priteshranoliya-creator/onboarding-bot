const sheets = require('../sheets/client');
const notify = require('./notify');
const config = require('../config');
const {
  CHECKLIST_CATEGORIES,
  JOINEE_NOTIFICATIONS,
  getAllItemIds,
  getTotalItemCount,
  getCheckedCount,
} = require('./checklist-items');

// ─── Register Bolt Handlers ─────────────────────────────────────

function register(app) {
  // One handler per checkbox category
  for (const cat of CHECKLIST_CATEGORIES) {
    app.action(`checklist_${cat.id}`, async ({ action, body, ack }) => {
      await ack();

      try {
        // Parse employee email from block_id: "chk::{catId}::{email}"
        const blockId = action.block_id;
        const parts = blockId.split('::');
        const workEmail = parts[2];
        if (!workEmail) return;

        // Get current state from sheet
        const currentState = await sheets.getChecklistState(workEmail);

        // Build the new selected set for this category
        const selectedIds = new Set(
          (action.selected_options || []).map((opt) => opt.value)
        );

        // Determine what changed in this category
        const newlyChecked = [];
        const newlyUnchecked = [];
        for (const item of cat.items) {
          const wasChecked = !!currentState[item.id];
          const isNowChecked = selectedIds.has(item.id);
          if (isNowChecked && !wasChecked) newlyChecked.push(item.id);
          if (!isNowChecked && wasChecked) newlyUnchecked.push(item.id);
        }

        // Update state
        const newState = { ...currentState };
        for (const id of newlyChecked) newState[id] = true;
        for (const id of newlyUnchecked) newState[id] = false;

        // Persist to Google Sheet
        await sheets.updateChecklistState(workEmail, newState);

        // Get joiner info for message rebuild and DMs
        const joiner = await sheets.getJoinerByEmail(workEmail);
        if (!joiner) return;

        // Update the checklist message in-place
        const channelId = body.channel?.id || config.SLACK_HR_CHANNEL;
        const checklistTs = body.message?.ts;
        if (checklistTs) {
          await notify.updateChecklistMessage(channelId, checklistTs, joiner, newState);
        }

        // DM joinee for relevant newly-checked items
        for (const itemId of newlyChecked) {
          if (JOINEE_NOTIFICATIONS[itemId]) {
            await notify.dmJoineeCheckNotification(joiner, JOINEE_NOTIFICATIONS[itemId]);
          }
        }

        // Log
        for (const itemId of newlyChecked) {
          await sheets.addLog(joiner.name, `Checked: ${itemId}`);
        }
        for (const itemId of newlyUnchecked) {
          await sheets.addLog(joiner.name, `Unchecked: ${itemId}`);
        }
      } catch (err) {
        console.error('Checklist action error:', err);
      }
    });
  }
}

module.exports = {
  CHECKLIST_CATEGORIES,
  JOINEE_NOTIFICATIONS,
  getAllItemIds,
  getTotalItemCount,
  getCheckedCount,
  register,
};
