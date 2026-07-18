'use strict';

const { Router } = require('express');
const mongoose = require('mongoose');

const router = Router();

/**
 * GET /api/health
 *
 * Returns the current status of the server and its dependencies.
 * Reads the real Mongoose connection state — does NOT do a live ping —
 * so it is fast and will never timeout waiting for a DB response.
 *
 * Mongoose connection states:
 *   0 = disconnected
 *   1 = connected
 *   2 = connecting
 *   3 = disconnecting
 *
 * HTTP 200 means the server is reachable.
 * The `db` field in the body reflects the actual DB connectivity.
 * Consumers should treat db !== 'connected' as a degraded state.
 */
router.get('/', (req, res) => {
  const dbState = mongoose.connection.readyState;

  const dbStatusMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  const dbStatus = dbStatusMap[dbState] || 'unknown';

  return res.status(200).json({
    status: 'ok',
    db: dbStatus,
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
