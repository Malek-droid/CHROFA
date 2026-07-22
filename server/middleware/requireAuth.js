'use strict';

const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * requireAuth middleware
 * Verifies JWT access token stored in cookies and attaches the user object to req.user.
 * Responds with a structured 401 error if authentication fails.
 */
const requireAuth = async (req, res, next) => {
  try {
    const token = req.cookies.accessToken;

    if (!token) {
      const error = new Error('Authentication required. Please sign in.');
      error.statusCode = 401;
      error.code = 'UNAUTHORIZED';
      return next(error);
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      const error = new Error('Invalid or expired session. Please sign in again.');
      error.statusCode = 401;
      error.code = 'UNAUTHORIZED';
      return next(error);
    }

    // Check if it's actually an access token
    if (decoded.type !== 'access') {
      const error = new Error('Invalid token type.');
      error.statusCode = 401;
      error.code = 'UNAUTHORIZED';
      return next(error);
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      const error = new Error('User no longer exists.');
      error.statusCode = 401;
      error.code = 'UNAUTHORIZED';
      return next(error);
    }

    // Reject token if it was issued at or before the user's last logout
    // decoded.iat is Unix seconds; lastLogoutAt is a Date
    if (user.lastLogoutAt && decoded.iat <= Math.floor(user.lastLogoutAt.getTime() / 1000)) {
      const error = new Error('Session has been invalidated. Please sign in again.');
      error.statusCode = 401;
      error.code = 'UNAUTHORIZED';
      return next(error);
    }

    // Attach user to the request object
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = requireAuth;
