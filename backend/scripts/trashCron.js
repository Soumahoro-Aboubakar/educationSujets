/**
 * Trash Purge Cron Job
 *
 * Automatically purges documents that have been in the trash
 * for more than 6 days. Runs every 6 hours.
 */

const { purgeExpiredTrash } = require('../services/documentService');

const PURGE_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours

const startTrashPurgeCron = () => {
  console.info('[TRASH_CRON] Starting trash purge cron — runs every 6 hours');

  // Run once on startup (with a small delay to let DB connect)
  setTimeout(async () => {
    try {
      const result = await purgeExpiredTrash();
      console.info(`[TRASH_CRON] Initial purge completed — purged: ${result.purged}`);
    } catch (error) {
      console.error(`[TRASH_CRON] Initial purge failed: ${error.message}`);
    }
  }, 10_000);

  // Then run periodically
  setInterval(async () => {
    try {
      const result = await purgeExpiredTrash();
      if (result.purged > 0) {
        console.info(`[TRASH_CRON] Periodic purge completed — purged: ${result.purged}`);
      }
    } catch (error) {
      console.error(`[TRASH_CRON] Periodic purge failed: ${error.message}`);
    }
  }, PURGE_INTERVAL_MS);
};

module.exports = startTrashPurgeCron;
