"use strict";

const express = require("express");
const router = express.Router();
const analyticsController = require("../controllers/analyticsController");

// All analytics routes require authentication
router.use(require("../middleware/requireAuth"));

// GET /api/analytics/overview - Dashboard overview stats
router.get("/overview", analyticsController.getOverviewStats);

// GET /api/analytics/trends - Weekly booking trends
router.get("/trends", analyticsController.getWeeklyTrends);

// GET /api/analytics/services - Top services
router.get("/services", analyticsController.getTopServices);

module.exports = router;
