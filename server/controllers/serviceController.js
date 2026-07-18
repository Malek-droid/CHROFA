'use strict';

const Business = require('../models/Business');
const Appointment = require('../models/Appointment');

/**
 * PATCH /api/business/services/:serviceId
 * Update a service by its _id (embedded in Business.services array)
 */
exports.updateService = async (req, res, next) => {
  const businessId = req.user.businessId;
  if (!businessId) {
    const err = new Error('Complete business setup before managing services.');
    err.statusCode = 400;
    err.code = 'BUSINESS_SETUP_REQUIRED';
    return next(err);
  }

  const { serviceId } = req.params;
  const {
    name,
    durationMinutes,
    price,
    bufferBeforeMinutes,
    bufferAfterMinutes,
    active,
    eligibleStaffIds,
    depositRequired,
    depositAmount,
    category,
    clientDescription,
    color,
  } = req.body;

  try {
    const business = await Business.findById(businessId);
    if (!business) {
      const err = new Error('Business not found.');
      err.statusCode = 404;
      err.code = 'NOT_FOUND';
      return next(err);
    }

    const serviceIndex = business.services.findIndex(s => String(s._id) === serviceId);
    if (serviceIndex === -1) {
      const err = new Error('Service not found.');
      err.statusCode = 404;
      err.code = 'NOT_FOUND';
      return next(err);
    }

    const service = business.services[serviceIndex];

    // Update provided fields
    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        const err = new Error('Service name must be a non-empty string.');
        err.statusCode = 400;
        err.code = 'VALIDATION_ERROR';
        return next(err);
      }
      service.name = name.trim();
    }

    if (durationMinutes !== undefined) {
      if (typeof durationMinutes !== 'number' || durationMinutes < 1) {
        const err = new Error('Duration must be at least 1 minute.');
        err.statusCode = 400;
        err.code = 'VALIDATION_ERROR';
        return next(err);
      }
      service.durationMinutes = durationMinutes;
    }

    if (price !== undefined) {
      if (price !== null && (typeof price !== 'number' || price < 0)) {
        const err = new Error('Price must be a non-negative number or null.');
        err.statusCode = 400;
        err.code = 'VALIDATION_ERROR';
        return next(err);
      }
      service.price = price;
    }

    if (bufferBeforeMinutes !== undefined) {
      if (typeof bufferBeforeMinutes !== 'number' || bufferBeforeMinutes < 0) {
        const err = new Error('bufferBeforeMinutes must be a non-negative number.');
        err.statusCode = 400;
        err.code = 'VALIDATION_ERROR';
        return next(err);
      }
      service.bufferBeforeMinutes = bufferBeforeMinutes;
    }

    if (bufferAfterMinutes !== undefined) {
      if (typeof bufferAfterMinutes !== 'number' || bufferAfterMinutes < 0) {
        const err = new Error('bufferAfterMinutes must be a non-negative number.');
        err.statusCode = 400;
        err.code = 'VALIDATION_ERROR';
        return next(err);
      }
      service.bufferAfterMinutes = bufferAfterMinutes;
    }

    if (active !== undefined) {
      if (typeof active !== 'boolean') {
        const err = new Error('active must be a boolean.');
        err.statusCode = 400;
        err.code = 'VALIDATION_ERROR';
        return next(err);
      }
      service.active = active;
    }

    if (eligibleStaffIds !== undefined) {
      if (!Array.isArray(eligibleStaffIds)) {
        const err = new Error('eligibleStaffIds must be an array.');
        err.statusCode = 400;
        err.code = 'VALIDATION_ERROR';
        return next(err);
      }
      // Validate that all IDs are valid staff indices
      const validIds = eligibleStaffIds.filter(id => 
        typeof id === 'number' && id >= 0 && id < business.staff.length
      );
      service.eligibleStaffIds = validIds;
    }

    if (depositRequired !== undefined) {
      if (typeof depositRequired !== 'boolean') {
        const err = new Error('depositRequired must be a boolean.');
        err.statusCode = 400;
        err.code = 'VALIDATION_ERROR';
        return next(err);
      }
      service.depositRequired = depositRequired;
    }

    if (depositAmount !== undefined) {
      if (depositAmount !== null && (typeof depositAmount !== 'number' || depositAmount < 0)) {
        const err = new Error('depositAmount must be a non-negative number or null.');
        err.statusCode = 400;
        err.code = 'VALIDATION_ERROR';
        return next(err);
      }
      service.depositAmount = depositAmount;
    }

    if (category !== undefined) {
      if (category !== null && (typeof category !== 'string' || !category.trim())) {
        const err = new Error('category must be a non-empty string or null.');
        err.statusCode = 400;
        err.code = 'VALIDATION_ERROR';
        return next(err);
      }
      service.category = category ? category.trim() : null;
    }

    if (clientDescription !== undefined) {
      if (clientDescription !== null && (typeof clientDescription !== 'string' || !clientDescription.trim())) {
        const err = new Error('clientDescription must be a non-empty string or null.');
        err.statusCode = 400;
        err.code = 'VALIDATION_ERROR';
        return next(err);
      }
      service.clientDescription = clientDescription ? clientDescription.trim() : null;
    }

    if (color !== undefined) {
      if (color !== null && (typeof color !== 'string' || !color.trim())) {
        const err = new Error('color must be a non-empty string or null.');
        err.statusCode = 400;
        err.code = 'VALIDATION_ERROR';
        return next(err);
      }
      service.color = color ? color.trim() : null;
    }

    await business.save();

    res.status(200).json({
      success: true,
      service: business.services[serviceIndex],
    });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/business/services/:serviceId
 * Delete or archive a service by its _id
 * - If service has appointment history: archive (set active: false)
 * - If service has no history: hard delete
 */
exports.deleteService = async (req, res, next) => {
  const businessId = req.user.businessId;
  if (!businessId) {
    const err = new Error('Complete business setup before managing services.');
    err.statusCode = 400;
    err.code = 'BUSINESS_SETUP_REQUIRED';
    return next(err);
  }

  const { serviceId } = req.params;

  try {
    const business = await Business.findById(businessId);
    if (!business) {
      const err = new Error('Business not found.');
      err.statusCode = 404;
      err.code = 'NOT_FOUND';
      return next(err);
    }

    const serviceIndex = business.services.findIndex(s => String(s._id) === serviceId);
    if (serviceIndex === -1) {
      const err = new Error('Service not found.');
      err.statusCode = 404;
      err.code = 'NOT_FOUND';
      return next(err);
    }

    const service = business.services[serviceIndex];

    // Check if service has any appointment history
    const appointmentCount = await Appointment.countDocuments({
      businessId,
      service: service.name,
    });

    if (appointmentCount > 0) {
      // Archive the service (soft delete)
      service.active = false;
      await business.save();

      return res.status(200).json({
        success: true,
        archived: true,
        message: 'Service archived due to existing appointment history.',
        service: business.services[serviceIndex],
      });
    }

    // Hard delete - remove from services array
    business.services.splice(serviceIndex, 1);
    await business.save();

    res.status(200).json({
      success: true,
      archived: false,
      message: 'Service deleted successfully.',
    });
  } catch (err) {
    next(err);
  }
};
