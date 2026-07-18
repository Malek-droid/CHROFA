'use strict';

const Customer = require('../models/Customer');

/**
 * Find an existing Customer by email or create a new one.
 *
 * Email lookup is always case-insensitive (stored lower-cased). If a customer
 * already exists, their name is updated to the current booking's name (if non-empty)
 * and phone is updated only if a non-empty phone is provided. This ensures customer
 * records stay current with the latest booking information.
 *
 * @param {object} params
 * @param {string} params.name   - Customer's display name (trimmed before use)
 * @param {string} params.email  - Email address (lowercased + trimmed)
 * @param {string} [params.phone] - Optional phone number
 * @returns {Promise<import('mongoose').Document>} Mongoose Customer document
 */
async function findOrCreateCustomer({ name, email, phone }) {
  const normalizedEmail = email.trim().toLowerCase();
  const trimmedName = name.trim();

  let customer = await Customer.findOne({ email: normalizedEmail });

  if (!customer) {
    // Create new customer
    customer = await Customer.create({
      name: trimmedName,
      email: normalizedEmail,
      phone: phone ? phone.trim() : null,
    });
  } else {
    // Update existing customer with current booking info
    let needsUpdate = false;

    // Always update name if new name is non-empty
    if (trimmedName && customer.name !== trimmedName) {
      customer.name = trimmedName;
      needsUpdate = true;
    }

    // Update phone only if new phone is non-empty (preserve existing phone if not provided)
    if (phone && phone.trim() && customer.phone !== phone.trim()) {
      customer.phone = phone.trim();
      needsUpdate = true;
    }

    if (needsUpdate) {
      await customer.save();
    }
  }

  return customer;
}

module.exports = { findOrCreateCustomer };
