'use strict';

const { Router } = require('express');
const asyncHandler       = require('../utils/asyncHandler');
const bookingController  = require('../controllers/bookingController');

const router = Router();

// ─── Public booking routes — NO requireAuth ────────────────────────────────────
// These routes are intentionally unauthenticated. They are the customer-facing
// booking surface. businessId is validated inside each controller handler.

// Return safe public info for a business (name, services, staff, hours, timezone)
router.get('/:businessId', asyncHandler(bookingController.getBusinessPublic));

// Multi-turn AI conversation — accepts history + extracted info, returns AI response
router.post('/:businessId/chat', asyncHandler(bookingController.chat));

// Finalise a booking — validates availability and creates a real Appointment
router.post('/:businessId/confirm', asyncHandler(bookingController.confirm));

module.exports = router;
