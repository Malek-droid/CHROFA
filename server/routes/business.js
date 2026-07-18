'use strict';

const { Router } = require('express');
const requireAuth = require('../middleware/requireAuth');
const businessController = require('../controllers/businessController');
const { validate } = require('../utils/validation');
const { createBusinessSchema } = require('../utils/validation');

const router = Router();

// ─── Business routes ───────────────────────────────────────────────────────────

/**
 * POST /api/business
 * Create the authenticated owner's business (called once during onboarding).
 * Requires authentication. Rejects if user already has a businessId.
 */
router.post('/', validate(createBusinessSchema), requireAuth, businessController.createBusiness);

/**
 * GET /api/business/search?q=query
 * Public endpoint to search businesses by name (no auth required).
 */
router.get('/search', businessController.searchBusinesses);

/**
 * GET /api/business/:businessId/qr
 * Generates a QR code for the business's booking page.
 * Returns the QR code as a PNG image.
 */
router.get('/:businessId/qr', businessController.generateQRCode);

/**
 * GET /api/business/me
 * Return the authenticated owner's business document.
 * Used by the frontend to refresh business state after onboarding.
 */
router.get('/me', requireAuth, businessController.getMyBusiness);

/**
 * PATCH /api/business
 * Update the authenticated owner's business settings.
 * Allows updating name, phone, timezone, and other profile fields.
 */
router.patch('/', requireAuth, businessController.updateMyBusiness);

module.exports = router;
