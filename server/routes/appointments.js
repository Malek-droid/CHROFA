'use strict';

const { Router } = require('express');
const requireAuth             = require('../middleware/requireAuth');
const asyncHandler            = require('../utils/asyncHandler');
const appointmentController   = require('../controllers/appointmentController');
const { validate }            = require('../utils/validation');
const { createAppointmentSchema, updateAppointmentSchema } = require('../utils/validation');

const router = Router();

// All appointment routes require authentication.
// The controller derives businessId from req.user.businessId — no
// businessId in the token, and no businessId on the user document, means
// the controller returns a 400 before touching the database.
router.use(requireAuth);

router.post(  '/',    validate(createAppointmentSchema), asyncHandler(appointmentController.create));
router.get(   '/',    asyncHandler(appointmentController.list));
router.get(   '/:id', asyncHandler(appointmentController.getOne));
router.put(   '/:id', validate(updateAppointmentSchema), asyncHandler(appointmentController.update));
router.delete('/:id', asyncHandler(appointmentController.cancel));

module.exports = router;
