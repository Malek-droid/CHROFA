'use strict';

/**
 * Centralized error-handling middleware.
 *
 * Express identifies this as an error handler because it accepts four arguments
 * (err, req, res, next). It MUST be registered LAST in server.js, after all
 * routes and other middleware.
 *
 * Handles:
 *   - Mongoose ValidationError  → 400 with field-level detail
 *   - MongoDB duplicate key (E11000) → 409 with a clean message
 *   - Mongoose CastError (bad ObjectId) → 400
 *   - Generic Error → 500 (message hidden in production)
 *
 * Never leaks a stack trace unless NODE_ENV === 'development'.
 */

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Log every error server-side so it's visible in logs regardless of what
  // we return to the client.
  console.error('[errorHandler]', err);

  // ── Mongoose ValidationError ───────────────────────────────────────────────
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({
      success: false,
      error: {
        message: messages.join(' '),
        code: 'VALIDATION_ERROR',
        ...(isDevelopment && { stack: err.stack }),
      },
    });
  }

  // ── MongoDB duplicate key error ────────────────────────────────────────────
  // Code 11000 = unique index violation. We convert the raw MongoDB message
  // into a user-friendly message so clients never see "E11000 duplicate key
  // error collection…" strings.
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return res.status(409).json({
      success: false,
      error: {
        message: `A record with that ${field} already exists.`,
        code: 'DUPLICATE_KEY',
        ...(isDevelopment && { stack: err.stack }),
      },
    });
  }

  // ── Mongoose CastError (e.g. invalid ObjectId in URL param) ───────────────
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      error: {
        message: `Invalid value for field '${err.path}': ${err.value}`,
        code: 'INVALID_ID',
        ...(isDevelopment && { stack: err.stack }),
      },
    });
  }

  // ── Application-level errors with an explicit statusCode ──────────────────
  // Controllers can attach err.statusCode before throwing to control the
  // HTTP response status without needing per-route try/catch.
  if (err.statusCode) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        message: err.message,
        code: err.code || 'APPLICATION_ERROR',
        ...(isDevelopment && { stack: err.stack }),
      },
    });
  }

  // ── Fallback: unexpected server error ─────────────────────────────────────
  // In production, hide the actual message — it may contain sensitive details.
  const message = isDevelopment
    ? err.message
    : 'An unexpected error occurred. Please try again.';

  return res.status(500).json({
    success: false,
    error: {
      message,
      code: 'INTERNAL_SERVER_ERROR',
      ...(isDevelopment && { stack: err.stack }),
    },
  });
};

module.exports = errorHandler;
