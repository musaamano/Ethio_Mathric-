/**
 * subscriptionExpiry.js
 *
 * Scheduled job that marks expired subscriptions as 'expired'.
 *
 * Safety guarantees:
 *  - Idempotent: safe to run any number of times; only touches rows
 *    that are BOTH status='active' AND expires_at < NOW().
 *  - Never touches 'pending', 'cancelled', or already-'expired' rows.
 *  - Never touches subscriptions that have not yet expired.
 *  - Uses a single parameterized UPDATE — no race conditions from
 *    read-then-write patterns.
 *  - Logs how many rows were affected each run (0 is normal and fine).
 *  - Errors are caught and logged; they never crash the server.
 *
 * Access enforcement:
 *  - requireSubscription middleware already checks
 *    status='active' AND expires_at > NOW()
 *    so students lose access the moment expires_at passes,
 *    even before this job runs.
 *  - This job keeps the status column accurate so the admin
 *    panel, student UI, and analytics show the correct state.
 *
 * Scheduling:
 *  - No external cron library required — uses Node's built-in setInterval.
 *  - Default: runs every hour (configurable via SUBSCRIPTION_EXPIRY_INTERVAL_MS).
 *  - Also runs once immediately on startup to catch any rows that
 *    expired while the server was offline.
 */

const { pool }  = require('../config/db');
const logger    = require('../utils/logger');

// Default interval: 1 hour. Override in .env if needed.
const INTERVAL_MS =
  parseInt(process.env.SUBSCRIPTION_EXPIRY_INTERVAL_MS) || 60 * 60 * 1000;

/**
 * Expire all active subscriptions whose expires_at is in the past.
 *
 * @returns {Promise<number>} number of rows updated
 */
async function expireSubscriptions() {
  try {
    const { rowCount } = await pool.query(
      `UPDATE subscriptions
       SET    status     = 'expired',
              updated_at = NOW()
       WHERE  status     = 'active'
         AND  expires_at < NOW()`
    );

    if (rowCount > 0) {
      logger.info(`[SubscriptionExpiry] Expired ${rowCount} subscription(s)`);
    } else {
      logger.debug('[SubscriptionExpiry] No subscriptions to expire');
    }

    return rowCount;
  } catch (err) {
    // Log but never rethrow — a failed expiry run should not crash the server
    logger.error('[SubscriptionExpiry] Job failed:', err.message);
    return 0;
  }
}

/**
 * Start the expiry job.
 *
 * Call this once after the database connection is confirmed ready.
 * Returns the interval handle so the caller can stop it if needed
 * (useful in tests).
 *
 * @returns {{ stop: Function }} object with a stop() method
 */
function startExpiryJob() {
  logger.info(
    `[SubscriptionExpiry] Starting expiry job ` +
    `(interval: ${INTERVAL_MS / 1000}s)`
  );

  // Run immediately on startup to catch anything that expired while offline
  expireSubscriptions();

  // Then run on the configured interval
  const handle = setInterval(expireSubscriptions, INTERVAL_MS);

  // Allow Node to exit even if this interval is still registered
  if (handle.unref) handle.unref();

  return {
    stop: () => {
      clearInterval(handle);
      logger.info('[SubscriptionExpiry] Job stopped');
    },
  };
}

module.exports = { startExpiryJob, expireSubscriptions };
