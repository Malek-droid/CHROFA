'use strict';

const cron = require('node-cron');
const Business = require('../models/Business');
const User = require('../models/User');
const { getWeeklyDigestData } = require('./digestService');
const { sendWeeklyDigestEmail } = require('./emailService');

// ─── Digest scheduler ─────────────────────────────────────────────────────────

let digestJob = null;

/**
 * Start the weekly digest scheduler.
 * This runs every Monday at 8:00 AM UTC.
 */
function startDigestScheduler() {
  if (digestJob) {
    console.log('[digestScheduler] Scheduler already running.');
    return;
  }

  // Run every Monday at 8:00 AM UTC
  digestJob = cron.schedule('0 8 * * 1', async () => {
    console.log('[digestScheduler] Running weekly digest check...');
    await sendDigests();
  });

  console.log('[digestScheduler] Weekly digest scheduler started (runs every Monday at 8:00 AM UTC).');
}

/**
 * Stop the digest scheduler.
 */
function stopDigestScheduler() {
  if (digestJob) {
    digestJob.stop();
    digestJob = null;
    console.log('[digestScheduler] Weekly digest scheduler stopped.');
  }
}

/**
 * Send weekly digests to all businesses with digest enabled.
 */
async function sendDigests() {
  try {
    // Find all businesses with weekly digest enabled
    const businesses = await Business.find({
      'notificationPreferences.dailyDigest': true,
    }).populate('ownerId');

    console.log(`[digestScheduler] Found ${businesses.length} businesses with digest enabled.`);

    for (const business of businesses) {
      try {
        const owner = business.ownerId;
        if (!owner || !owner.email) {
          console.error(`[digestScheduler] No owner email found for business ${business._id}`);
          continue;
        }

        // Get digest data
        const digestData = await getWeeklyDigestData(business._id);

        // Send digest email
        await sendWeeklyDigestEmail({
          to: owner.email,
          businessName: business.name,
          pastWeek: digestData.pastWeek,
          upcomingWeek: digestData.upcomingWeek,
        });

        console.log(`[digestScheduler] Digest sent for business ${business._id}`);
      } catch (error) {
        console.error(`[digestScheduler] Failed to send digest for business ${business._id}:`, error);
      }
    }
  } catch (error) {
    console.error('[digestScheduler] Error in digest check:', error);
  }
}

/**
 * Manually trigger a digest check (useful for testing).
 */
async function triggerDigestCheck() {
  console.log('[digestScheduler] Manually triggering digest check...');
  await sendDigests();
}

module.exports = {
  startDigestScheduler,
  stopDigestScheduler,
  triggerDigestCheck,
};
