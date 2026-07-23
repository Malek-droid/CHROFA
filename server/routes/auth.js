'use strict';

const { Router } = require('express');
const passport = require('passport');
const authController = require('../controllers/authController');
const passwordResetController = require('../controllers/passwordResetController');
const requireAuth = require('../middleware/requireAuth');
const asyncHandler = require('../utils/asyncHandler');
const { validate } = require('../utils/validation');
const { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } = require('../utils/validation');

const router = Router();

router.post('/register', validate(registerSchema), asyncHandler(authController.register));
router.post('/login', validate(loginSchema), asyncHandler(authController.login));
router.post('/logout', asyncHandler(authController.logout));
router.post('/refresh', asyncHandler(authController.refresh));
router.post('/forgot-password', validate(forgotPasswordSchema), asyncHandler(passwordResetController.forgotPassword));
router.post('/reset-password', validate(resetPasswordSchema), asyncHandler(passwordResetController.resetPassword));
router.get('/me', requireAuth, asyncHandler(authController.me));

// Google OAuth routes
router.get(
  '/google',
  (req, res, next) => {
    // Save the originating frontend host/port in a cookie so callback redirects back to it dynamically
    const referer = req.headers.referer || 'http://localhost:8080';
    res.cookie('oauth_referer', referer, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 10 * 60 * 1000, // 10 minutes
    });
    next();
  },
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);

router.get(
  '/google/callback',
  (req, res, next) => {
    const referer = req.cookies.oauth_referer || 'http://localhost:8080';
    let targetOrigin = 'http://localhost:8080';
    try {
      targetOrigin = new URL(referer).origin;
    } catch (e) {
      // Fallback if referer is invalid URL
    }

    // Use a custom callback so we can inspect the rejection `info` from the
    // passport strategy and redirect to the correct error param.
    // - done(null, false, { message: 'account_exists_local' }) → ?error=account_exists_local
    // - done(err) or done(null, false, other) → ?error=google_auth_failed
    passport.authenticate('google', { session: false }, (err, user, info) => {
      if (err) {
        return res.redirect(`${targetOrigin}/login?error=google_auth_failed`);
      }
      if (!user) {
        const errorParam =
          info && info.message === 'account_exists_local'
            ? 'account_exists_local'
            : 'google_auth_failed';
        return res.redirect(`${targetOrigin}/login?error=${errorParam}`);
      }
      // Attach user so the next asyncHandler can read req.user
      req.user = user;
      next();
    })(req, res, next);
  },
  asyncHandler(async (req, res) => {
    // Generate JWT tokens
    const accessToken = authController.signAccessToken(req.user._id, req.user.role);
    const refreshToken = authController.signRefreshToken(req.user._id);
    
    // Store the refresh token JWT itself in the database so logout can invalidate it
    await authController.storeRefreshToken(
      req.user._id,
      refreshToken,
      req.get('user-agent'),
      req.ip
    );
    
    // Set httpOnly cookies
    authController.sendAccessTokenCookie(res, accessToken);
    authController.sendRefreshTokenCookie(res, refreshToken);
    
    // Retrieve target redirect origin
    const referer = req.cookies.oauth_referer || 'http://localhost:8080';
    let targetOrigin = 'http://localhost:8080';
    try {
      targetOrigin = new URL(referer).origin;
    } catch (e) {
      // Fallback
    }

    // Clear temporary referer cookie
    res.clearCookie('oauth_referer');

    // Redirect to frontend dashboard
    res.redirect(`${targetOrigin}/dashboard`);
  })
);

module.exports = router;
