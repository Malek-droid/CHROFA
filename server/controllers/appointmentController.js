'use strict';

const Appointment = require('../models/Appointment');
const Business    = require('../models/Business');
const availabilityService = require('../services/availabilityService');
const { addSyncJob }          = require('../queues/calendarSyncQueue');
const { createAppointment }   = require('../services/appointmentService');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Resolve the businessId from req.user and enforce that it exists.
 * Returns the businessId ObjectId or throws a structured 400 error via next().
 */
function requireBusinessId(req, res, next) {
  const businessId = req.user.businessId;
  if (!businessId) {
    const err = new Error('Complete business setup before managing appointments.');
    err.statusCode = 400;
    err.code = 'BUSINESS_SETUP_REQUIRED';
    return next(err);
  }
  return businessId;
}

// ─── POST /api/appointments ───────────────────────────────────────────────────

/**
 * Create a new appointment.
 *
 * Expected body:
 *   customerName  {string}  required
 *   customerEmail {string}  required  — used to find-or-create the Customer
 *   customerPhone {string}  optional
 *   service       {string}  required  — must match a name in Business.services[]
 *   date          {string}  required  — ISO-8601 timestamp
 *   staffName     {string}  optional
 *   notes         {string}  optional
 *
 * durationMinutes is derived server-side from the matched service; it is NOT
 * accepted from the client to prevent tampering.
 */
exports.create = async (req, res, next) => {
  const businessId = requireBusinessId(req, res, next);
  if (!businessId) return; // next() already called with 400

  const { customerName, customerEmail, customerPhone, service, date, staffName, notes } = req.body;

  try {
    const appointment = await createAppointment({
      businessId,
      customerName,
      customerEmail,
      customerPhone,
      service,
      date,
      staffName,
      notes,
      status: 'pending',
    });

    res.status(201).json({
      success: true,
      appointment,
    });

    // Asynchronous Calendar Sync (enqueued after response)
    const business = await Business.findById(businessId);
    if (business && business.googleCalendarConnected) {
      addSyncJob('create-event', { appointmentId: appointment.id }).catch((err) =>
        console.error('[calendar-sync] Failed to enqueue create job:', err.message)
      );
    }
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/appointments ────────────────────────────────────────────────────

/**
 * List all appointments for the authenticated user's business.
 * Optional query params:
 *   status  — filter by status (pending | confirmed | cancelled)
 *   from    — ISO date lower bound (inclusive)
 *   to      — ISO date upper bound (exclusive)
 */
exports.list = async (req, res, next) => {
  const businessId = requireBusinessId(req, res, next);
  if (!businessId) return;

  const filter = { businessId };

  if (req.query.status) {
    const allowed = ['pending', 'confirmed', 'cancelled'];
    if (!allowed.includes(req.query.status)) {
      const err = new Error(`status must be one of: ${allowed.join(', ')}.`);
      err.statusCode = 400;
      err.code = 'VALIDATION_ERROR';
      return next(err);
    }
    filter.status = req.query.status;
  }

  if (req.query.from || req.query.to) {
    filter.date = {};
    if (req.query.from) filter.date.$gte = new Date(req.query.from);
    if (req.query.to)   filter.date.$lt  = new Date(req.query.to);
  }

  const appointments = await Appointment
    .find(filter)
    .populate('customerId', 'name email phone')
    .sort({ date: 1 });

  res.status(200).json({
    success:      true,
    appointments: appointments.map(_format),
  });
};

// ─── GET /api/appointments/:id ────────────────────────────────────────────────

exports.getOne = async (req, res, next) => {
  const businessId = requireBusinessId(req, res, next);
  if (!businessId) return;

  const appointment = await Appointment
    .findOne({ _id: req.params.id, businessId })
    .populate('customerId', 'name email phone');

  if (!appointment) {
    const err = new Error('Appointment not found.');
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    return next(err);
  }

  res.status(200).json({
    success:     true,
    appointment: _format(appointment),
  });
};

// ─── PUT /api/appointments/:id ────────────────────────────────────────────────

/**
 * Update an appointment. Only these fields are writable by the client:
 *   status    — pending | confirmed | cancelled
 *   staffName
 *   notes
 *   date
 *
 * service and durationMinutes are intentionally NOT updatable here to keep
 * the snapshot integrity. A reschedule flow (future) would cancel + re-create.
 */
exports.update = async (req, res, next) => {
  const businessId = requireBusinessId(req, res, next);
  if (!businessId) return;

  const appointment = await Appointment
    .findOne({ _id: req.params.id, businessId });

  if (!appointment) {
    const err = new Error('Appointment not found.');
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    return next(err);
  }

  const { status, staffName, notes, date } = req.body;

  let targetDate = appointment.date;
  let targetStaff = appointment.staffName;
  let dateChanged = false;
  let staffChanged = false;

  if (date !== undefined) {
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      const err = new Error('date must be a valid ISO-8601 timestamp.');
      err.statusCode = 400;
      err.code = 'VALIDATION_ERROR';
      return next(err);
    }
    if (parsedDate.getTime() !== appointment.date.getTime()) {
      targetDate = parsedDate;
      dateChanged = true;
    }
  }

  if (staffName !== undefined) {
    const normStaff = staffName ? staffName.trim() : null;
    if (normStaff !== appointment.staffName) {
      targetStaff = normStaff;
      staffChanged = true;
    }
  }

  if (dateChanged || staffChanged) {
    const targetStatus = status !== undefined ? status : appointment.status;
    if (targetStatus !== 'cancelled') {
      const { available } = await availabilityService.isSlotAvailable({
        businessId,
        date:            targetDate,
        durationMinutes: appointment.durationMinutes,
        staffName:       targetStaff,
        excludeAppointmentId: appointment._id
      });

      if (!available) {
        const err = new Error('This time slot is no longer available, please choose another.');
        err.statusCode = 409;
        err.code = 'CONFLICT';
        return next(err);
      }
    }
  }

  if (status !== undefined) {
    const allowed = ['pending', 'confirmed', 'cancelled'];
    if (!allowed.includes(status)) {
      const err = new Error(`status must be one of: ${allowed.join(', ')}.`);
      err.statusCode = 400;
      err.code = 'VALIDATION_ERROR';
      return next(err);
    }
    appointment.status = status;
  }

  if (staffName !== undefined) appointment.staffName = staffName ? staffName.trim() : null;
  if (notes     !== undefined) appointment.notes     = notes     ? notes.trim()     : null;
  if (date      !== undefined) appointment.date      = targetDate;

  await appointment.save();

  const populated = await Appointment
    .findById(appointment._id)
    .populate('customerId', 'name email phone');

  res.status(200).json({
    success:     true,
    appointment: _format(populated),
  });

  // Asynchronous Calendar Sync (enqueued after response)
  const businessObj = await Business.findById(businessId);
  if (businessObj && businessObj.googleCalendarConnected) {
    if (appointment.status === 'cancelled') {
      if (appointment.googleEventId) {
        addSyncJob('delete-event', {
          googleEventId: appointment.googleEventId,
          businessId: businessId
        }).catch((err) =>
          console.error('[calendar-sync] Failed to enqueue delete job:', err.message)
        );
      }
    } else {
      const jobType = appointment.googleEventId ? 'update-event' : 'create-event';
      addSyncJob(jobType, { appointmentId: appointment._id }).catch((err) =>
        console.error(`[calendar-sync] Failed to enqueue ${jobType} job:`, err.message)
      );
    }
  }
};

// ─── DELETE /api/appointments/:id ─────────────────────────────────────────────

/**
 * Soft-delete: sets status to 'cancelled'.
 * Hard deletes are not supported — cancelled appointments are kept for audit
 * trail and future no-show risk scoring.
 */
exports.cancel = async (req, res, next) => {
  const businessId = requireBusinessId(req, res, next);
  if (!businessId) return;

  const appointment = await Appointment
    .findOne({ _id: req.params.id, businessId });

  if (!appointment) {
    const err = new Error('Appointment not found.');
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    return next(err);
  }

  if (appointment.status === 'cancelled') {
    const err = new Error('Appointment is already cancelled.');
    err.statusCode = 409;
    err.code = 'CONFLICT';
    return next(err);
  }

  appointment.status = 'cancelled';
  await appointment.save();

  const populated = await Appointment
    .findById(appointment._id)
    .populate('customerId', 'name email phone');

  res.status(200).json({
    success:     true,
    appointment: _format(populated),
  });

  // Asynchronous Calendar Sync (enqueued after response)
  if (appointment.googleEventId) {
    addSyncJob('delete-event', {
      googleEventId: appointment.googleEventId,
      businessId: businessId
    }).catch((err) =>
      console.error('[calendar-sync] Failed to enqueue delete job:', err.message)
    );
  }
};

// ─── Private formatter ────────────────────────────────────────────────────────

/**
 * Serialize a Mongoose Appointment document into the shape the frontend expects.
 * Flattens the populated customerId into top-level customer fields so consumers
 * can use `appointment.customer` (name) in the same way the old mock data did.
 */
function _format(doc) {
  const cust = doc.customerId;
  return {
    id:              doc._id.toString(),
    customer:        cust ? cust.name  : 'Unknown',
    customerEmail:   cust ? cust.email : null,
    customerPhone:   cust ? cust.phone : null,
    customerId:      cust ? cust._id.toString() : null,
    service:         doc.service,
    durationMinutes: doc.durationMinutes,
    servicePriceSnapshot: doc.servicePriceSnapshot,
    bufferBeforeMinutes: doc.bufferBeforeMinutes,
    bufferAfterMinutes: doc.bufferAfterMinutes,
    date:            doc.date.toISOString(),
    status:          doc.status,
    staffName:       doc.staffName || null,
    notes:           doc.notes     || null,
    riskScore:       doc.riskScore,
    createdAt:       doc.createdAt.toISOString(),
    updatedAt:       doc.updatedAt.toISOString(),
  };
}
