'use strict';

const mongoose = require('mongoose');

// ─── Appointment schema ───────────────────────────────────────────────────────

const appointmentSchema = new mongoose.Schema(
  {
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      required: true,
      index: true,
    },

    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
      index: true,
    },

    // Denormalized string snapshot — NOT a ref into Business.staff[].
    // Staff are embedded subdocuments without stable standalone IDs worth
    // referencing across collections. Storing the name as a string here
    // preserves the historical record even if the business later renames or
    // removes that staff member.
    staffName: {
      type: String,
      required: false,
      default: null,
      trim: true,
    },

    // Snapshot of the service name at booking time. Decoupled from
    // Business.services so future edits to service definitions do not
    // silently alter what was actually booked.
    service: {
      type: String,
      required: true,
      trim: true,
    },

    // Snapshot of duration at booking time for the same reason as `service`.
    // Availability-checking and calendar rendering should use this value,
    // not look up the current Business.services entry.
    durationMinutes: {
      type: Number,
      required: true,
      min: [1, 'durationMinutes must be at least 1.'],
    },

    // Snapshot of service price at booking time.
    servicePriceSnapshot: {
      type: Number,
      required: false,
      default: null,
      min: [0, 'servicePriceSnapshot cannot be negative.'],
    },

    // Snapshot of buffer times at booking time.
    bufferBeforeMinutes: {
      type: Number,
      required: false,
      default: 0,
      min: [0, 'bufferBeforeMinutes cannot be negative.'],
    },

    bufferAfterMinutes: {
      type: Number,
      required: false,
      default: 0,
      min: [0, 'bufferAfterMinutes cannot be negative.'],
    },

    // Full timestamp — NOT separate date/time strings.
    // Storing as a Date object makes range queries for calendar views and
    // double-booking checks straightforward: { date: { $gte: start, $lt: end } }.
    date: {
      type: Date,
      required: true,
    },

    status: {
      type: String,
      enum: {
        values: ['pending', 'confirmed', 'cancelled'],
        message: "status must be one of: 'pending', 'confirmed', 'cancelled'.",
      },
      default: 'pending',
      required: true,
      index: true,
    },

    // Null until the ML scoring service populates it.
    // Deliberately NOT defaulted to 0 — null means "not yet scored", which is
    // semantically different from "scored and found to be zero risk".
    riskScore: {
      type: Number,
      required: false,
      default: null,
      min: [0, 'riskScore must be between 0 and 1.'],
      max: [1, 'riskScore must be between 0 and 1.'],
    },

    googleEventId: {
      type: String,
      required: false,
      default: null,
      index: true,
    },

    notes: {
      type: String,
      required: false,
      default: null,
      trim: true,
    },

    // Flag to track if reminder email has been sent
    reminderSent: {
      type: Boolean,
      required: false,
      default: false,
    },

    // Flag to track if provider reminder email has been sent
    providerReminderSent: {
      type: Boolean,
      required: false,
      default: false,
    },

    // Flag to track if client WhatsApp reminder has been sent
    whatsappReminderSent: {
      type: Boolean,
      required: false,
      default: false,
    },

    // Flag to track if provider WhatsApp reminder has been sent
    providerWhatsappReminderSent: {
      type: Boolean,
      required: false,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// ─── Compound index ────────────────────────────────────────────────────────────
// Hot query path for:
//   - Calendar views: find all appointments for a business on a given day/range.
//   - Double-booking checks: scan appointments within a time window for a business.
// This index makes both queries an index scan rather than a full collection scan.
appointmentSchema.index({ businessId: 1, date: 1 });

// ─── Unique index to prevent double-booking for same staff at same time ─────────
// This is a last-resort safeguard at the DB level. The application-level conflict
// check in availabilityService.isSlotAvailable should prevent this, but this index
// ensures data integrity even if there's a race condition or bug.
// Note: staffName can be null (auto-assigned), so we use a partial index.
appointmentSchema.index(
  { staffName: 1, date: 1 },
  { 
    partialFilterExpression: { staffName: { $ne: null }, status: { $ne: 'cancelled' } },
    unique: true 
  }
);

const Appointment = mongoose.model('Appointment', appointmentSchema);

module.exports = Appointment;
