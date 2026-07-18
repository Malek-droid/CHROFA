'use strict';

const { Queue } = require('bullmq');
const { getRedisClient } = require('../config/redis');

let queue = null;

/**
 * Singleton getter for the BullMQ Queue.
 */
function getQueue() {
  if (!queue) {
    queue = new Queue('calendar-sync', {
      connection: getRedisClient(),
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000 // 5s, 10s, 20s...
        },
        removeOnComplete: true, // Avoid bloating Redis with successfully processed logs
        removeOnFail: false
      }
    });
  }
  return queue;
}

/**
 * Enqueues a calendar synchronization job.
 *
 * @param {string} type - 'create-event' | 'update-event' | 'delete-event'
 * @param {object} data - Job payload
 */
async function addSyncJob(type, data) {
  try {
    const q = getQueue();
    const identifier = data.appointmentId || data.googleEventId;
    const jobName = `${type}-${identifier}`;
    await q.add(jobName, { type, ...data });
    console.log(`[calendar-queue] Enqueued job: ${jobName}`);
  } catch (err) {
    console.error('[calendar-queue] Failed to enqueue job:', err.message);
  }
}

module.exports = { addSyncJob };
