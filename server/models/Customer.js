'use strict';

const mongoose = require('mongoose');

// ─── Customer schema ──────────────────────────────────────────────────────────
// Customer is a GLOBAL entity — not scoped to any single Business.
// A customer can book with multiple businesses, and their ML no-show risk score
// accumulates across all businesses in the marketplace. Any future riskScore
// field will live here, on the canonical Customer document, not on a per-
// business junction record.

const customerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address.'],
    },

    phone: {
      type: String,
      required: false,
      default: null,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const Customer = mongoose.model('Customer', customerSchema);

module.exports = Customer;
