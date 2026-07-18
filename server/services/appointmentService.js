'use strict';

const Appointment = require('../models/Appointment');
const Business = require('../models/Business');
const availabilityService = require('./availabilityService');
const { findOrCreateCustomer } = require('../utils/customerHelper');

/**
 * Shared appointment creation logic used by both manual and AI booking flows.
 * Performs atomic conflict check with staff assignment and persists the appointment.
 *
 * @param {object} params
 * @param {string} params.businessId
 * @param {string} params.customerName
 * @param {string} params.customerEmail
 * @param {string|null} params.customerPhone
 * @param {string} params.service - Service name (matched case-insensitively)
 * @param {string} params.date - ISO-8601 timestamp string
 * @param {string|null} params.staffName - Optional specific staff name
 * @param {string|null} params.notes - Optional notes
 * @param {string} params.status - 'pending' or 'confirmed'
 * @returns {Promise<object>} Created appointment with customer info populated
 * @throws {Error} With statusCode and code properties for structured error handling
 */
async function createAppointment({
  businessId,
  customerName,
  customerEmail,
  customerPhone,
  service,
  date,
  staffName,
  notes,
  status,
}) {
  // ── Basic validation ───────────────────────────────────────────────────────
  const missing = [];
  if (!customerName || !customerName.trim()) missing.push('customerName');
  if (!customerEmail || !customerEmail.trim()) missing.push('customerEmail');
  if (!service || !service.trim()) missing.push('service');
  if (!date) missing.push('date');

  if (missing.length) {
    const err = new Error(`Missing required fields: ${missing.join(', ')}.`);
    err.statusCode = 400;
    err.code = 'VALIDATION_ERROR';
    throw err;
  }

  const parsedDate = new Date(date);
  if (isNaN(parsedDate.getTime())) {
    const err = new Error('date must be a valid ISO-8601 timestamp.');
    err.statusCode = 400;
    err.code = 'VALIDATION_ERROR';
    throw err;
  }

  // ── Look up business & service ─────────────────────────────────────────────
  const business = await Business.findById(businessId);
  if (!business) {
    const err = new Error('Business not found.');
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  const serviceObj = business.services.find(
    (s) => s.name.toLowerCase() === service.trim().toLowerCase()
  );
  if (!serviceObj) {
    const err = new Error(
      `Service "${service}" not found in this business. Available: ${business.services.map((s) => s.name).join(', ') || 'none'}.`
    );
    err.statusCode = 400;
    err.code = 'VALIDATION_ERROR';
    throw err;
  }

  // ── Atomic conflict check with staff assignment ───────────────────────────
  const resolvedStaff = staffName && staffName !== 'none' ? staffName.trim() : null;

  const { available, assignedStaff } = await availabilityService.isSlotAvailable({
    businessId,
    date: parsedDate,
    durationMinutes: serviceObj.durationMinutes,
    staffName: resolvedStaff,
    bufferBeforeMinutes: serviceObj.bufferBeforeMinutes || 0,
    bufferAfterMinutes: serviceObj.bufferAfterMinutes || 0,
    eligibleStaffIds: serviceObj.eligibleStaffIds || [],
  });

  if (!available) {
    const err = new Error('This time slot is no longer available, please choose another.');
    err.statusCode = 409;
    err.code = 'CONFLICT';
    throw err;
  }

  // Use the assigned staff from the availability check (respects staff preference or auto-assigns)
  const finalStaff = assignedStaff || resolvedStaff;

  // ── Find or create Customer ────────────────────────────────────────────────
  let customer;
  try {
    customer = await findOrCreateCustomer({
      name: customerName,
      email: customerEmail,
      phone: customerPhone,
    });
  } catch (customerErr) {
    console.error('[appointmentService] Customer creation failed:', customerErr);
    throw new Error(`Failed to create customer: ${customerErr.message}`);
  }

  // ── Create Appointment ─────────────────────────────────────────────────────
  const appointment = await Appointment.create({
    businessId,
    customerId: customer._id,
    staffName: finalStaff,
    service: serviceObj.name, // canonical name from Business
    durationMinutes: serviceObj.durationMinutes, // server-derived, not client-supplied
    servicePriceSnapshot: serviceObj.price || null,
    bufferBeforeMinutes: serviceObj.bufferBeforeMinutes || 0,
    bufferAfterMinutes: serviceObj.bufferAfterMinutes || 0,
    date: parsedDate,
    status: status || 'pending',
    notes: notes ? notes.trim() : null,
  });

  // Return the appointment with customer info embedded
  const populated = await Appointment.findById(appointment._id).populate('customerId', 'name email phone');

  return {
    id: populated._id.toString(),
    customer: populated.customerId ? populated.customerId.name : customerName,
    customerEmail: populated.customerId ? populated.customerId.email : customerEmail,
    customerPhone: populated.customerId ? populated.customerId.phone : customerPhone,
    customerId: populated.customerId ? populated.customerId._id.toString() : null,
    service: populated.service,
    durationMinutes: populated.durationMinutes,
    date: populated.date.toISOString(),
    status: populated.status,
    staffName: populated.staffName || null,
    notes: populated.notes || null,
    createdAt: populated.createdAt.toISOString(),
    updatedAt: populated.updatedAt.toISOString(),
  };
}

module.exports = { createAppointment };
