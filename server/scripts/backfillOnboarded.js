'use strict';

const Business = require('../models/Business');

/**
 * Backfills isOnboarded: true for businesses that were created before the
 * isOnboarded field was introduced. These businesses have complete data
 * (services and staff) so they are fully set up and bookable.
 *
 * This is idempotent — running it multiple times is safe.
 * Criteria: isOnboarded field is missing/null AND the business has at least
 * one service AND at least one staff member.
 */
async function backfillOnboardedStatus() {
  try {
    const result = await Business.updateMany(
      {
        isOnboarded: { $in: [null, undefined, false] },
        $expr: {
          $and: [
            { $gt: [{ $size: { $ifNull: ['$services', []] } }, 0] },
            { $gt: [{ $size: { $ifNull: ['$staff', []] } }, 0] },
          ],
        },
      },
      { $set: { isOnboarded: true } }
    );

    if (result.modifiedCount > 0) {
      console.log(
        `[backfill] Set isOnboarded=true on ${result.modifiedCount} pre-existing business(es) ` +
        `that had complete services+staff but lacked the flag.`
      );
    } else {
      console.log('[backfill] isOnboarded backfill: no documents needed updating.');
    }
  } catch (err) {
    // Log but do not crash the server — the backfill is a best-effort
    // migration and should never prevent the server from starting.
    console.error('[backfill] isOnboarded backfill failed:', err.message);
  }
}

module.exports = { backfillOnboardedStatus };
