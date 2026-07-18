'use strict';

const mongoose = require('mongoose');

// ─── Retry configuration ──────────────────────────────────────────────────────
const MAX_ATTEMPTS = 5;
const BASE_DELAY_MS = 1000; // initial wait before first retry

/**
 * Connects to MongoDB using exponential backoff retry logic.
 *
 * Strategy:
 *   - Attempt 1 immediately.
 *   - On failure wait BASE_DELAY_MS * 2^attempt ms before retrying.
 *   - After MAX_ATTEMPTS failures, log a fatal message and exit the process.
 *     We do NOT throw — we exit, because a server with no database is not
 *     recoverable in a meaningful way and should not stay alive to serve errors.
 *
 * Note: mongoose.connect() rejects on initial connection failure. After a
 * successful connection, Mongoose's built-in reconnect logic takes over for
 * mid-session disconnections, which is why we only need retry logic here (at
 * boot) and not in the disconnected event handler below.
 */
const connectDB = async () => {
  const uri = process.env.MONGODB_URI;

  mongoose.connection.on('connected', () => {
    console.log('[db] MongoDB connected successfully.');
  });

  mongoose.connection.on('error', (err) => {
    // This fires for errors AFTER the initial connection — e.g. auth failures,
    // network drops. Mongoose will attempt reconnection automatically.
    console.error('[db] MongoDB connection error:', err.message);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('[db] MongoDB disconnected. Mongoose will attempt to reconnect…');
  });

  mongoose.connection.on('reconnected', () => {
    console.log('[db] MongoDB reconnected.');
  });

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      await mongoose.connect(uri, {
        // Tells Mongoose not to buffer commands if the connection drops mid-run.
        // If the DB is truly unreachable, commands fail immediately rather than
        // hanging silently in a buffer queue.
        bufferCommands: false,
      });
      // Connection successful — return so the server boot continues.
      return;
    } catch (err) {
      console.error(
        `[db] Connection attempt ${attempt}/${MAX_ATTEMPTS} failed: ${err.message}`
      );

      if (attempt === MAX_ATTEMPTS) {
        console.error(
          '[db] FATAL — could not connect to MongoDB after maximum retries. Exiting.'
        );
        process.exit(1);
      }

      // Exponential backoff: 1s, 2s, 4s, 8s … capped implicitly by MAX_ATTEMPTS.
      const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
      console.log(`[db] Retrying in ${delay}ms…`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
};

module.exports = connectDB;
