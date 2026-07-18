'use strict';

const { Router } = require('express');
const serviceController = require('../controllers/serviceController');
const asyncHandler = require('../middleware/asyncHandler');

const router = Router();

// PATCH /api/business/services/:serviceId - Update a service
router.patch('/:serviceId', asyncHandler(serviceController.updateService));

// DELETE /api/business/services/:serviceId - Delete/archive a service
router.delete('/:serviceId', asyncHandler(serviceController.deleteService));

module.exports = router;
