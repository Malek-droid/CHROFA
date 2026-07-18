'use strict';

const Business = require('../models/Business');
const User = require('../models/User');
const QRCode = require('qrcode');

/**
 * POST /api/business
 * Creates the authenticated owner's business after onboarding.
 * Requires: name, industry, services[], staff[], openingHours[], timezone.
 * Rejects if the user already has a businessId (one business per owner).
 */
exports.createBusiness = async (req, res, next) => {
  try {
    const user = req.user;

    // Guard: one business per owner — prevent re-onboarding via this endpoint
    if (user.businessId) {
      const err = new Error('Your account already has a business. Use business settings to make changes.');
      err.statusCode = 409;
      err.code = 'BUSINESS_ALREADY_EXISTS';
      return next(err);
    }

    const { name, industry, services, staff, openingHours, timezone } = req.body;

    // ── Name validation ──────────────────────────────────────────────────────
    if (!name || typeof name !== 'string' || !name.trim()) {
      const err = new Error('Business name is required.');
      err.statusCode = 400;
      err.code = 'VALIDATION_ERROR';
      return next(err);
    }

    // ── Industry validation ──────────────────────────────────────────────────
    const validIndustries = [
      'dentists',
      'medical_clinics',
      'mental_health_therapists',
      'hair_salons',
      'nail_salons',
      'spas',
      'personal_trainers',
      'nutritionists',
      'physiotherapists',
      'chiropractors',
      'lawyers',
      'architects',
      'interior_designers',
      'veterinary_clinics',
    ];
    if (!industry || !validIndustries.includes(industry)) {
      const err = new Error(`industry must be one of the supported industry categories.`);
      err.statusCode = 400;
      err.code = 'VALIDATION_ERROR';
      return next(err);
    }

    // ── Services validation ──────────────────────────────────────────────────
    if (!Array.isArray(services) || services.length === 0) {
      const err = new Error('At least one service is required.');
      err.statusCode = 400;
      err.code = 'VALIDATION_ERROR';
      return next(err);
    }

    for (const svc of services) {
      if (!svc.name || typeof svc.name !== 'string' || !svc.name.trim()) {
        const err = new Error('Each service must have a non-empty name.');
        err.statusCode = 400;
        err.code = 'VALIDATION_ERROR';
        return next(err);
      }
      if (!svc.durationMinutes || typeof svc.durationMinutes !== 'number' || svc.durationMinutes < 1) {
        const err = new Error(`Service "${svc.name}" must have a durationMinutes value of at least 1.`);
        err.statusCode = 400;
        err.code = 'VALIDATION_ERROR';
        return next(err);
      }
    }

    // ── Staff validation ─────────────────────────────────────────────────────
    if (!Array.isArray(staff) || staff.length === 0) {
      const err = new Error('At least one staff member is required.');
      err.statusCode = 400;
      err.code = 'VALIDATION_ERROR';
      return next(err);
    }

    for (const member of staff) {
      if (!member.name || typeof member.name !== 'string' || !member.name.trim()) {
        const err = new Error('Each staff member must have a non-empty name.');
        err.statusCode = 400;
        err.code = 'VALIDATION_ERROR';
        return next(err);
      }
    }

    // ── Opening hours validation ─────────────────────────────────────────────
    if (!Array.isArray(openingHours) || openingHours.length !== 7) {
      const err = new Error('openingHours must contain exactly 7 entries (one per day, Sun=0 to Sat=6).');
      err.statusCode = 400;
      err.code = 'VALIDATION_ERROR';
      return next(err);
    }

    // ── Timezone validation ──────────────────────────────────────────────────
    if (!timezone || typeof timezone !== 'string' || !timezone.trim()) {
      const err = new Error('timezone is required (IANA format, e.g. "America/New_York").');
      err.statusCode = 400;
      err.code = 'VALIDATION_ERROR';
      return next(err);
    }

    // ── Create Business document ─────────────────────────────────────────────
    const business = await Business.create({
      name: name.trim(),
      industry,
      ownerId: user._id,
      services: services.map((s) => ({
        name: s.name.trim(),
        durationMinutes: s.durationMinutes,
        price: (s.price !== undefined && s.price !== null && s.price !== '') ? Number(s.price) : null,
      })),
      staff: staff.map((m) => ({ name: m.name.trim() })),
      openingHours,
      timezone: timezone.trim(),
    });

    // ── Link business to user ────────────────────────────────────────────────
    user.businessId = business._id;
    await user.save();

    return res.status(201).json({
      success: true,
      business: {
        id: business._id,
        name: business.name,
        industry: business.industry,
        timezone: business.timezone,
        services: business.services,
        staff: business.staff,
        openingHours: business.openingHours,
      },
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        businessId: user.businessId,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/business/search?q=query
 * Public endpoint to search businesses by name (no auth required).
 */
exports.searchBusinesses = async (req, res, next) => {
  try {
    const { q } = req.query;

    if (!q || typeof q !== 'string' || !q.trim()) {
      return res.status(200).json({
        success: true,
        businesses: [],
      });
    }

    const businesses = await Business.find({
      name: { $regex: q.trim(), $options: 'i' },
    })
      .select('_id name industry timezone')
      .limit(20);

    return res.status(200).json({
      success: true,
      businesses,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/business/:businessId/qr
 * Generates a QR code for the business's booking page.
 * Returns the QR code as a PNG image.
 */
exports.generateQRCode = async (req, res, next) => {
  try {
    const { businessId } = req.params;

    const business = await Business.findById(businessId);
    if (!business) {
      const err = new Error('Business not found.');
      err.statusCode = 404;
      err.code = 'NOT_FOUND';
      return next(err);
    }

    const bookingUrl = `${process.env.ALLOWED_ORIGINS?.split(',')[0] || 'http://localhost:8080'}/book/${businessId}`;

    const qrCode = await QRCode.toBuffer(bookingUrl, {
      width: 300,
      margin: 2,
    });

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.send(qrCode);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/business/me
 * Returns the authenticated user's own business document.
 */
exports.getMyBusiness = async (req, res, next) => {
  try {
    const user = req.user;

    if (!user.businessId) {
      const err = new Error('No business found for this account. Please complete onboarding.');
      err.statusCode = 404;
      err.code = 'NOT_FOUND';
      return next(err);
    }

    const business = await Business.findById(user.businessId).select('-googleCalendarRefreshToken');
    if (!business) {
      const err = new Error('Business record not found.');
      err.statusCode = 404;
      err.code = 'NOT_FOUND';
      return next(err);
    }

    return res.status(200).json({
      success: true,
      business,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/business
 * Updates the authenticated user's business settings.
 * Allows updating name, phone, timezone, and other profile fields.
 */
exports.updateMyBusiness = async (req, res, next) => {
  try {
    const user = req.user;

    if (!user.businessId) {
      const err = new Error('No business found for this account. Please complete onboarding.');
      err.statusCode = 404;
      err.code = 'NOT_FOUND';
      return next(err);
    }

    const business = await Business.findById(user.businessId);
    if (!business) {
      const err = new Error('Business record not found.');
      err.statusCode = 404;
      err.code = 'NOT_FOUND';
      return next(err);
    }

    const { name, phone, timezone, slug, headerTagline } = req.body;

    // Update only provided fields
    if (name !== undefined && name !== null && name !== '') {
      if (typeof name !== 'string' || !name.trim()) {
        const err = new Error('Business name must be a non-empty string.');
        err.statusCode = 400;
        err.code = 'VALIDATION_ERROR';
        return next(err);
      }
      business.name = name.trim();
    }

    if (phone !== undefined && phone !== null && phone !== '') {
      if (typeof phone !== 'string') {
        const err = new Error('Phone must be a string.');
        err.statusCode = 400;
        err.code = 'VALIDATION_ERROR';
        return next(err);
      }
      business.phone = phone.trim();
    }

    if (timezone !== undefined && timezone !== null && timezone !== '') {
      if (typeof timezone !== 'string' || !timezone.trim()) {
        const err = new Error('Timezone must be a non-empty string.');
        err.statusCode = 400;
        err.code = 'VALIDATION_ERROR';
        return next(err);
      }
      business.timezone = timezone.trim();
    }

    if (slug !== undefined && slug !== null && slug !== '') {
      if (typeof slug !== 'string') {
        const err = new Error('Slug must be a string.');
        err.statusCode = 400;
        err.code = 'VALIDATION_ERROR';
        return next(err);
      }
      business.slug = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
    }

    if (headerTagline !== undefined && headerTagline !== null && headerTagline !== '') {
      if (typeof headerTagline !== 'string') {
        const err = new Error('Header tagline must be a string.');
        err.statusCode = 400;
        err.code = 'VALIDATION_ERROR';
        return next(err);
      }
      business.headerTagline = headerTagline.trim();
    }

    await business.save();

    return res.status(200).json({
      success: true,
      business: {
        id: business._id,
        name: business.name,
        phone: business.phone,
        timezone: business.timezone,
        industry: business.industry,
        services: business.services,
        staff: business.staff,
        openingHours: business.openingHours,
      },
    });
  } catch (err) {
    next(err);
  }
};
