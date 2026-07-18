'use strict';

const Redis = require('ioredis');

// ─── Redis client singleton ───────────────────────────────────────────────────
// A single ioredis client instance is created here and exported for use by
// BullMQ queues/workers, which will be registered in later prompts.
// We do NOT create any BullMQ Queue or Worker instances here — this file is
// purely connection scaffolding.
let redisClient = null;

const MAX_RETRIES = 5;

/**
 * Creates and connects the ioredis client.
 * Resolves once the client emits 'ready'.
 * Caps auto-reconnect at MAX_RETRIES attempts via retryStrategy so a
 * permanently unreachable Redis doesn't spam the logs forever.
 */
const connectRedis = () => {
  return new Promise((resolve, reject) => {
    const client = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
      lazyConnect: true,
      // TLS is required for rediss:// URLs (Upstash, Redis Cloud, etc.).
      // ioredis infers TLS from the URL scheme but this makes it explicit.
      tls: process.env.REDIS_URL?.startsWith('rediss://') ? {} : undefined,
      // Cap auto-reconnect attempts so we don't spin forever if Redis is down.
      // retryStrategy receives the attempt count (1-based) and must return:
      //   - a number (ms to wait before retry), or
      //   - null/undefined/Error to stop retrying.
      retryStrategy: (times) => {
        if (times > MAX_RETRIES) {
          console.warn(
            `[redis] Giving up after ${MAX_RETRIES} reconnect attempts. ` +
            'BullMQ queues will be unavailable until Redis is reachable and the server restarts.'
          );
          return null; // stop retrying
        }
        const delay = Math.min(times * 200, 2000);
        console.log(`[redis] Reconnect attempt ${times}/${MAX_RETRIES} in ${delay}ms…`);
        return delay;
      },
    });

    client.on('connect', () => {
      console.log('[redis] Connecting to Redis…');
    });

    client.on('ready', () => {
      console.log('[redis] Redis connection ready.');
      resolve();
    });

    client.on('error', (err) => {
      console.error('[redis] Redis connection error:', err.message);
    });

    client.on('close', () => {
      console.warn('[redis] Redis connection closed.');
    });

    client.on('end', () => {
      console.warn('[redis] Redis client ended (max retries exhausted or manually closed).');
    });

    redisClient = client;

    // Initiate the connection now that listeners are registered.
    client.connect().catch((err) => {
      console.error('[redis] Could not connect to Redis on boot:', err.message);
      // Redis is non-fatal at this phase (no queues are live yet), so we log
      // but resolve rather than reject/exit. Change to reject() once BullMQ
      // queues are implemented and Redis becomes load-bearing.
      resolve();
    });
  });
};

/**
 * Returns the ioredis client instance.
 * BullMQ queues and workers import this function to reuse the same connection.
 */
const getRedisClient = () => {
  if (!redisClient) {
    throw new Error(
      '[redis] getRedisClient() called before connectRedis() — ensure server.js boot order is correct.'
    );
  }
  return redisClient;
};

module.exports = { connectRedis, getRedisClient };
