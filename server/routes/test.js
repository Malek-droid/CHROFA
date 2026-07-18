'use strict';

const { Router } = require('express');
const { triggerReminderCheck } = require('../services/reminderScheduler');

const router = Router();

/**
 * POST /api/test/trigger-reminder
 * Manually trigger the reminder check for testing purposes.
 * This endpoint is only available in development environment.
 */
router.post('/trigger-reminder', async (req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    const err = new Error('Test endpoints are not available in production');
    err.statusCode = 403;
    return next(err);
  }

  try {
    await triggerReminderCheck();
    res.status(200).json({
      success: true,
      message: 'Reminder check triggered manually',
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
