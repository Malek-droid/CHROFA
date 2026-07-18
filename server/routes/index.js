'use strict';

const { Router } = require('express');
const authRoutes         = require('./auth');
const appointmentRoutes  = require('./appointments');
const businessRoutes     = require('./business');
const availabilityRoutes = require('./availability');
const calendarRoutes     = require('./calendar');
const bookingRoutes      = require('./booking');
const analyticsRoutes    = require('./analytics');
const whatsappRoutes     = require('./whatsapp');
const testRoutes         = require('./test');
const serviceRoutes      = require('./services');

const router = Router();

// ─── Route aggregator ─────────────────────────────────────────────────────────

// Public booking surface — no authentication required
router.use('/book', bookingRoutes);

// Authenticated routes
router.use('/auth',         authRoutes);
router.use('/appointments', appointmentRoutes);
router.use('/business',     businessRoutes);
router.use('/business/services', serviceRoutes);
router.use('/availability', availabilityRoutes);
router.use('/calendar',     calendarRoutes);
router.use('/analytics',    analyticsRoutes);
router.use('/whatsapp',     whatsappRoutes);

// Test routes (development only)
router.use('/test',         testRoutes);

module.exports = router;
