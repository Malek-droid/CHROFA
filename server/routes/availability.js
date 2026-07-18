'use strict';

const { Router } = require('express');
const requireAuth = require('../middleware/requireAuth');
const asyncHandler = require('../utils/asyncHandler');
const availabilityController = require('../controllers/availabilityController');

const router = Router();

// Protect availability endpoints with auth middleware
router.use(requireAuth);

router.get('/', asyncHandler(availabilityController.getAvailability));

module.exports = router;
