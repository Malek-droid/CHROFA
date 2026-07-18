'use strict';

const availabilityService = require('../services/availabilityService');

/**
 * GET /api/availability
 * Query params:
 *   date      {string}  required (format: YYYY-MM-DD)
 *   serviceId {string}  required
 *   staffName {string}  optional
 */
exports.getAvailability = async (req, res, next) => {
  const businessId = req.user.businessId;
  if (!businessId) {
    const err = new Error('Complete business setup before checking availability.');
    err.statusCode = 400;
    err.code = 'BUSINESS_SETUP_REQUIRED';
    return next(err);
  }

  const { date, serviceId, staffName } = req.query;

  // Validate date parameter
  if (!date) {
    const err = new Error('date query parameter is required.');
    err.statusCode = 400;
    err.code = 'VALIDATION_ERROR';
    return next(err);
  }

  const YYYY_MM_DD_REGEX = /^\d{4}-\d{2}-\d{2}$/;
  if (!YYYY_MM_DD_REGEX.test(date)) {
    const err = new Error('date must be in YYYY-MM-DD format (e.g. 2026-06-20).');
    err.statusCode = 400;
    err.code = 'VALIDATION_ERROR';
    return next(err);
  }

  // Validate serviceId parameter
  if (!serviceId) {
    const err = new Error('serviceId query parameter is required.');
    err.statusCode = 400;
    err.code = 'VALIDATION_ERROR';
    return next(err);
  }

  try {
    const slots = await availabilityService.getAvailableSlots({
      businessId,
      dateStr: date,
      serviceId,
      staffName: staffName && staffName !== 'none' ? staffName : null
    });

    res.status(200).json({
      success: true,
      slots
    });
  } catch (err) {
    if (err.message === 'Business not found.' || err.message === 'Service not found.') {
      err.statusCode = 400;
      err.code = 'VALIDATION_ERROR';
    }
    next(err);
  }
};
