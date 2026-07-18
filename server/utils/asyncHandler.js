'use strict';

/**
 * asyncHandler — wraps an async Express route handler and forwards any
 * rejected promise or thrown error to Express's next(err) so the centralized
 * errorHandler middleware catches it.
 *
 * Without this wrapper every async controller function would need its own
 * try/catch block. With it, controllers can throw or return rejected promises
 * naturally:
 *
 *   router.get('/example', asyncHandler(async (req, res) => {
 *     const data = await someDbCall(); // throws → goes to errorHandler
 *     res.json({ success: true, data });
 *   }));
 *
 * Uses the Promise.resolve().catch(next) pattern which is idiomatic and
 * avoids the need for any third-party library.
 */
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;
