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
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);

router.get(
  '/google/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: 'http://localhost:8080/login?error=google_auth_failed',
  }),
  asyncHandler(async (req, res) => {
    // Generate JWT tokens
    const accessToken = authController.signAccessToken(req.user._id, req.user.role);
    const refreshToken = authController.signRefreshToken(req.user._id);
    const randomRefreshToken = authController.generateRandomToken();
    
    // Store refresh token in database
    await authController.storeRefreshToken(
      req.user._id,
      randomRefreshToken,
      req.get('user-agent'),
      req.ip
    );
    
    // Set httpOnly cookies
    authController.sendAccessTokenCookie(res, accessToken);
    authController.sendRefreshTokenCookie(res, refreshToken);
    
    // Redirect to frontend dashboard
    res.redirect('http://localhost:8080/dashboard');
  })
);

module.exports = router;
