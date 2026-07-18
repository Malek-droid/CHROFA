'use strict';

/**
 * 404 not-found handler.
 *
 * Registered AFTER all real routes in server.js. Any request that falls
 * through all routes without a match ends up here.
 *
 * We forward a proper Error object to next() so the centralized errorHandler
 * middleware picks it up and returns a consistent JSON shape. We do NOT call
 * res.json() directly here — that would bypass errorHandler.
 */
const notFound = (req, res, next) => {
  const err = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  err.statusCode = 404;
  err.code = 'NOT_FOUND';
  next(err);
};

module.exports = notFound;
