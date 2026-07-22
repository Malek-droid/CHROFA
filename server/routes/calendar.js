'use strict';

const { Router } = require('express');
const { google } = require('googleapis');
const requireAuth = require('../middleware/requireAuth');
const asyncHandler = require('../utils/asyncHandler');
const Business = require('../models/Business');

const router = Router();

/**
 * Helper to get a configured OAuth2 client.
 */
function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'http://localhost:5000/api/calendar/callback'
  );
}

// ─── GET /api/calendar/connect ────────────────────────────────────────────────
// Redirects to Google consent screen requesting calendar and profile scopes.
router.get(
  '/connect',
  requireAuth,
  asyncHandler(async (req, res, next) => {
    const businessId = req.user.businessId;
    if (!businessId) {
      const err = new Error('Complete business setup before connecting Google Calendar.');
      err.statusCode = 400;
      err.code = 'BUSINESS_SETUP_REQUIRED';
      return next(err);
    }

    // Save referer origin for callback redirection
    const referer = req.headers.referer || 'http://localhost:8080';
    let origin = 'http://localhost:8080';
    try {
      origin = new URL(referer).origin;
    } catch (e) {
      // Fallback
    }

    res.cookie('calendar_oauth_referer', referer, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 10 * 60 * 1000,
    });

    const statePayload = Buffer.from(JSON.stringify({ businessId: String(businessId), origin })).toString('base64url');

    const oauth2Client = getOAuth2Client();

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline', // Requests refresh_token
      prompt: 'consent',      // Force consent screen to guarantee refresh token delivery
      scope: [
        'https://www.googleapis.com/auth/calendar.events',
        'https://www.googleapis.com/auth/userinfo.email'
      ],
      state: statePayload
    });

    res.redirect(authUrl);
  })
);

// ─── GET /api/calendar/callback ───────────────────────────────────────────────
// Handles the redirect callback from Google, exchanging code for tokens and saving.
router.get(
  '/callback',
  asyncHandler(async (req, res, next) => {
    const { code, state } = req.query;

    let businessId = null;
    let targetOrigin = 'http://localhost:8080';

    if (state) {
      try {
        const decoded = JSON.parse(Buffer.from(state, 'base64url').toString('utf8'));
        if (decoded.businessId) businessId = decoded.businessId;
        if (decoded.origin) targetOrigin = decoded.origin;
      } catch (e) {
        businessId = state; // Fallback if state is raw ObjectId
      }
    }

    if (!targetOrigin || targetOrigin === 'http://localhost:8080') {
      const referer = req.cookies.calendar_oauth_referer;
      if (referer) {
        try {
          targetOrigin = new URL(referer).origin;
        } catch (e) {
          // Fallback
        }
      }
    }

    // Clear the referrer cookie
    res.clearCookie('calendar_oauth_referer');

    if (!code) {
      return res.redirect(`${targetOrigin}/dashboard/settings?error=calendar_auth_failed`);
    }

    if (!businessId) {
      const err = new Error('Missing business state in callback.');
      err.statusCode = 400;
      return next(err);
    }

    try {
      const oauth2Client = getOAuth2Client();
      const { tokens } = await oauth2Client.getToken(code);
      
      if (!tokens.refresh_token) {
        console.warn('[calendar-oauth] Warning: No refresh token returned. Prompting user for consent.');
        return res.redirect(`${targetOrigin}/dashboard/settings?error=no_refresh_token`);
      }

      oauth2Client.setCredentials(tokens);

      const oauth2 = google.oauth2({
        auth: oauth2Client,
        version: 'v2'
      });
      const userInfo = await oauth2.userinfo.get();
      const email = userInfo.data.email;

      const business = await Business.findById(businessId);
      if (!business) {
        const err = new Error('Associated Business not found.');
        err.statusCode = 404;
        return next(err);
      }

      business.googleCalendarConnected = true;
      business.googleCalendarRefreshToken = tokens.refresh_token;
      business.googleCalendarConnectedEmail = email || 'Unknown Email';
      await business.save();

      console.log(`[calendar-oauth] Google Calendar connected successfully for business ${businessId} (${email}).`);

      res.redirect(`${targetOrigin}/dashboard/settings?success=calendar_connected`);
    } catch (err) {
      console.error('[calendar-oauth] Error during exchange:', err);
      res.redirect(`${targetOrigin}/dashboard/settings?error=calendar_auth_failed`);
    }
  })
);

// ─── POST /api/calendar/disconnect ────────────────────────────────────────────
// Clears integration tokens and connected status.
router.post(
  '/disconnect',
  requireAuth,
  asyncHandler(async (req, res, next) => {
    const businessId = req.user.businessId;
    if (!businessId) {
      const err = new Error('Business setup not completed.');
      err.statusCode = 400;
      return next(err);
    }

    const business = await Business.findById(businessId);
    if (!business) {
      const err = new Error('Business not found.');
      err.statusCode = 404;
      return next(err);
    }

    business.googleCalendarConnected = false;
    business.googleCalendarRefreshToken = null;
    business.googleCalendarConnectedEmail = null;
    await business.save();

    console.log(`[calendar-oauth] Google Calendar disconnected for business ${businessId}.`);

    res.status(200).json({
      success: true,
      message: 'Google Calendar disconnected.'
    });
  })
);

module.exports = router;
