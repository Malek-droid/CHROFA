'use strict';

const { Router } = require('express');
const requireAuth = require('../middleware/requireAuth');
const businessController = require('../controllers/businessController');
const { validate } = require('../utils/validation');
const { createBusinessSchema } = require('../utils/validation');

const router = Router();

// ─── Business routes ───────────────────────────────────────────────────────────

/**
 * Middleware that skips schema validation when the request body contains
 * draft: true. This allows POST /api/business to create a minimal draft
 * (name + industry only) during onboarding without requiring the full payload.
 */
function conditionalValidate(schema) {
  const fullValidate = validate(schema);
  return (req, res, next) => {
    if (req.body && req.body.draft === true) return next();
    return fullValidate(req, res, next);
  };
}

/**
 * POST /api/business
 * Create the authenticated owner's business (called once during onboarding).
 * Requires authentication. Rejects if user already has a businessId.
 * When body.draft === true, validation is skipped so partial data can be saved.
 */
router.post('/', conditionalValidate(createBusinessSchema), requireAuth, businessController.createBusiness);

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

/**
 * POST /api/business/test-email
 * Sends a test email to verify the email delivery integration is working.
 * Requires authentication. Sends to the authenticated user's email by default,
 * or to a custom address if provided in the request body as { to: "..." }.
 */
router.post('/test-email', requireAuth, businessController.sendTestEmailHandler);

module.exports = router;
