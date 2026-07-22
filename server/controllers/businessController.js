'use strict';

const Business = require('../models/Business');
const User = require('../models/User');
const QRCode = require('qrcode');
const { sendTestEmail } = require('../services/emailService');

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

    const { name, industry, services, staff, openingHours, timezone, draft } = req.body;
    const isDraft = !!draft;

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

    if (!isDraft) {
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
    }

    // ── Create Business document ─────────────────────────────────────────────
    const business = await Business.create({
      name: name.trim(),
      industry,
      ownerId: user._id,
      isOnboarded: !isDraft,
      services: isDraft
        ? (services || []).map((s) => ({
            name: s.name.trim(),
            durationMinutes: Number(s.durationMinutes) || 30,
            price: s.price !== '' ? Number(s.price) : null,
          }))
        : services.map((s) => ({
            name: s.name.trim(),
            durationMinutes: s.durationMinutes,
            price: (s.price !== undefined && s.price !== null && s.price !== '') ? Number(s.price) : null,
          })),
      staff: isDraft
        ? (staff || []).filter(m => m.name?.trim()).map((m) => ({ name: m.name.trim() }))
        : staff.map((m) => ({ name: m.name.trim() })),
      openingHours: isDraft
        ? (openingHours || [0, 1, 2, 3, 4, 5, 6].map((day) => ({
            day,
            isOpen: day >= 1 && day <= 5,
            openTime: '09:00',
            closeTime: '18:00',
          })))
        : openingHours,
      timezone: timezone ? timezone.trim() : 'America/New_York',
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
        isOnboarded: business.isOnboarded,
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
 * GET /api/business/me
 * Returns the authenticated owner's business document.
 * Used by the onboarding wizard to detect and resume an existing draft,
 * and by the dashboard to refresh business settings in-context.
 */
exports.getMyBusiness = async (req, res, next) => {
  try {
    const user = req.user;

    if (!user.businessId) {
      return res.status(200).json({ success: true, business: null });
    }

    const business = await Business.findById(user.businessId);
    if (!business) {
      return res.status(200).json({ success: true, business: null });
    }

    return res.status(200).json({
      success: true,
      business: {
        id: business._id,
        _id: business._id,
        name: business.name,
        industry: business.industry,
        phone: business.phone,
        timezone: business.timezone,
        slug: business.slug,
        headerTagline: business.headerTagline,
        services: business.services,
        staff: business.staff,
        openingHours: business.openingHours,
        isOnboarded: business.isOnboarded,
        bookingPreferences: business.bookingPreferences,
        googleCalendarConnected: business.googleCalendarConnected,
        googleCalendarConnectedEmail: business.googleCalendarConnectedEmail,
        notificationPreferences: business.notificationPreferences,
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
      // Accept isOnboarded:true (standard) OR documents where the field is absent
      // (pre-migration businesses). The startup backfill sets isOnboarded:true on
      // all complete existing businesses, but this $or is defence-in-depth.
      $or: [{ isOnboarded: true }, { isOnboarded: { $exists: false } }],
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

    const baseUrl = process.env.ALLOWED_ORIGINS?.split(',')[0]?.trim() || 'http://localhost:8080';
    const bookingSlug = business.slug && business.slug.trim() ? business.slug.trim() : String(businessId);
    const bookingUrl = `${baseUrl}/book/${bookingSlug}`;

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

    const {
      name,
      phone,
      timezone,
      slug,
      headerTagline,
      bookingPreferences,
      openingHours,
      services,
      staff,
      isOnboarded,
    } = req.body;

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

    if (slug !== undefined) {
      if (slug === null || slug.trim() === '') {
        const err = new Error('Public slug cannot be empty.');
        err.statusCode = 400;
        err.code = 'VALIDATION_ERROR';
        return next(err);
      }
      const formattedSlug = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
      if (!formattedSlug) {
        const err = new Error('Invalid public slug format.');
        err.statusCode = 400;
        err.code = 'VALIDATION_ERROR';
        return next(err);
      }
      // Check for uniqueness
      const existing = await Business.findOne({ slug: formattedSlug, _id: { $ne: business._id } });
      if (existing) {
        const err = new Error('This booking page URL slug is already taken. Please choose another one.');
        err.statusCode = 409;
        err.code = 'SLUG_COLLISION';
        return next(err);
      }
      business.slug = formattedSlug;
    }

    if (headerTagline !== undefined) {
      business.headerTagline = headerTagline ? headerTagline.trim() : null;
    }

    if (bookingPreferences !== undefined && bookingPreferences !== null) {
      if (typeof bookingPreferences !== 'object') {
        const err = new Error('bookingPreferences must be an object.');
        err.statusCode = 400;
        err.code = 'VALIDATION_ERROR';
        return next(err);
      }
      if (bookingPreferences.minNoticeHours !== undefined) {
        business.bookingPreferences.minNoticeHours = Number(bookingPreferences.minNoticeHours);
      }
      if (bookingPreferences.defaultBufferMinutes !== undefined) {
        business.bookingPreferences.defaultBufferMinutes = Number(bookingPreferences.defaultBufferMinutes);
      }
    }

    if (services !== undefined && services !== null) {
      if (!Array.isArray(services)) {
        const err = new Error('Services must be an array.');
        err.statusCode = 400;
        err.code = 'VALIDATION_ERROR';
        return next(err);
      }
      for (const s of services) {
        if (!s.name || typeof s.name !== 'string' || !s.name.trim()) {
          const err = new Error('Each service must have a non-empty name.');
          err.statusCode = 400;
          err.code = 'VALIDATION_ERROR';
          return next(err);
        }
        if (s.durationMinutes === undefined || typeof s.durationMinutes !== 'number' || s.durationMinutes < 1) {
          const err = new Error(`Service "${s.name}" must have a durationMinutes value of at least 1.`);
          err.statusCode = 400;
          err.code = 'VALIDATION_ERROR';
          return next(err);
        }
      }
      business.services = services.map((s) => ({
        name: s.name.trim(),
        durationMinutes: s.durationMinutes,
        price: (s.price !== undefined && s.price !== null && s.price !== '') ? Number(s.price) : null,
      }));
    }

    if (staff !== undefined && staff !== null) {
      if (!Array.isArray(staff)) {
        const err = new Error('Staff must be an array.');
        err.statusCode = 400;
        err.code = 'VALIDATION_ERROR';
        return next(err);
      }
      for (const m of staff) {
        if (!m.name || typeof m.name !== 'string' || !m.name.trim()) {
          const err = new Error('Each staff member must have a non-empty name.');
          err.statusCode = 400;
          err.code = 'VALIDATION_ERROR';
          return next(err);
        }
      }
      business.staff = staff.map((m) => ({ name: m.name.trim() }));
    }

    if (openingHours !== undefined && openingHours !== null) {
      if (!Array.isArray(openingHours) || openingHours.length !== 7) {
        const err = new Error('openingHours must be an array of exactly 7 entries.');
        err.statusCode = 400;
        err.code = 'VALIDATION_ERROR';
        return next(err);
      }
      for (const entry of openingHours) {
        if (entry.day === undefined || entry.day < 0 || entry.day > 6) {
          const err = new Error('Each openingHours entry must have a day index (0-6).');
          err.statusCode = 400;
          err.code = 'VALIDATION_ERROR';
          return next(err);
        }
        if (entry.isOpen === undefined) {
          const err = new Error('Each openingHours entry must specify if it isOpen (boolean).');
          err.statusCode = 400;
          err.code = 'VALIDATION_ERROR';
          return next(err);
        }
        if (entry.isOpen) {
          if (!entry.openTime || !entry.closeTime) {
            const err = new Error('Open days must specify openTime and closeTime.');
            err.statusCode = 400;
            err.code = 'VALIDATION_ERROR';
            return next(err);
          }
        }
      }
      business.openingHours = openingHours;
    }

    // Complete onboarding status transition validation
    if (isOnboarded === true) {
      if (!business.name || !business.name.trim()) {
        const err = new Error('Business name is required to complete onboarding.');
        err.statusCode = 400;
        err.code = 'VALIDATION_ERROR';
        return next(err);
      }
      if (!business.services || business.services.length === 0) {
        const err = new Error('At least one service is required to complete onboarding.');
        err.statusCode = 400;
        err.code = 'VALIDATION_ERROR';
        return next(err);
      }
      if (!business.staff || business.staff.length === 0) {
        const err = new Error('At least one staff member is required to complete onboarding.');
        err.statusCode = 400;
        err.code = 'VALIDATION_ERROR';
        return next(err);
      }
      if (!business.openingHours || business.openingHours.length !== 7) {
        const err = new Error('openingHours must be configured to complete onboarding.');
        err.statusCode = 400;
        err.code = 'VALIDATION_ERROR';
        return next(err);
      }
      if (!business.timezone) {
        const err = new Error('Timezone is required to complete onboarding.');
        err.statusCode = 400;
        err.code = 'VALIDATION_ERROR';
        return next(err);
      }
      business.isOnboarded = true;
    } else if (isOnboarded === false) {
      business.isOnboarded = false;
    }

    await business.save();

    return res.status(200).json({
      success: true,
      business: {
        id: business._id,
        name: business.name,
        phone: business.phone,
        timezone: business.timezone,
        slug: business.slug,
        headerTagline: business.headerTagline,
        industry: business.industry,
        services: business.services,
        staff: business.staff,
        openingHours: business.openingHours,
        bookingPreferences: business.bookingPreferences,
        isOnboarded: business.isOnboarded,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/business/test-email
 * Sends a test email to verify email delivery is configured correctly.
 * The email is sent to the authenticated user's email address (or a custom
 * recipient if provided in the request body).
 */
exports.sendTestEmailHandler = async (req, res, next) => {
  try {
    const user = req.user;

    if (!user.businessId) {
      const err = new Error('No business found for this account.');
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

    const recipientEmail = (req.body && req.body.to) ? req.body.to.trim() : user.email;

    if (!recipientEmail || !/\S+@\S+\.\S+/.test(recipientEmail)) {
      const err = new Error('A valid recipient email address is required.');
      err.statusCode = 400;
      err.code = 'VALIDATION_ERROR';
      return next(err);
    }

    await sendTestEmail({ to: recipientEmail, businessName: business.name });

    return res.status(200).json({
      success: true,
      message: `Test email sent to ${recipientEmail}.`,
    });
  } catch (err) {
    next(err);
  }
};
