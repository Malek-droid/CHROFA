'use strict';

const { z } = require('zod');

// ─── Auth validation schemas ─────────────────────────────────────────────────────

/**
 * POST /api/auth/register
 */
const registerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128, 'Password must be less than 128 characters'),
});

/**
 * POST /api/auth/login
 */
const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

/**
 * POST /api/auth/forgot-password
 */
const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

/**
 * POST /api/auth/reset-password
 */
const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128, 'Password must be less than 128 characters'),
});

// ─── Appointment validation schemas ─────────────────────────────────────────────

/**
 * POST /api/appointments
 */
const createAppointmentSchema = z.object({
  customerName: z.string().min(1, 'Customer name is required').max(100, 'Customer name must be less than 100 characters'),
  customerEmail: z.string().email('Invalid email address'),
  customerPhone: z.string().optional(),
  service: z.string().min(1, 'Service name is required'),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid date format'),
  staffName: z.string().optional(),
  notes: z.string().max(500, 'Notes must be less than 500 characters').optional(),
});

/**
 * PUT /api/appointments/:id
 */
const updateAppointmentSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'cancelled']).optional(),
  staffName: z.string().optional(),
  notes: z.string().max(500, 'Notes must be less than 500 characters').optional(),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), 'Invalid date format').optional(),
}).refine((data) => {
  // At least one field must be provided
  return Object.keys(data).length > 0;
}, 'At least one field must be provided for update');

// ─── Business validation schemas ──────────────────────────────────────────────────

/**
 * POST /api/business
 */
const createBusinessSchema = z.object({
  name: z.string().min(1, 'Business name is required').max(100, 'Business name must be less than 100 characters'),
  industry: z.enum([
    'dentists',
    'medical_clinics',
    'mental_health_therapists',
    'hair_salons',
    'nail_salons',
    'spas',
    'personal_trainers',
    'nutritionists',
    'physiotherapists',
    'chiropractors',
    'lawyers',
    'architects',
    'interior_designers',
    'veterinary_clinics',
  ]),
  services: z.array(z.object({
    name: z.string().min(1, 'Service name is required').max(100, 'Service name must be less than 100 characters'),
    durationMinutes: z.number().min(1, 'Duration must be at least 1 minute').max(480, 'Duration must be less than 8 hours'),
    price: z.number().min(0, 'Price cannot be negative').optional().nullable(),
  })).min(1, 'At least one service is required'),
  staff: z.array(z.object({
    name: z.string().min(1, 'Staff name is required').max(100, 'Staff name must be less than 100 characters'),
  })).min(1, 'At least one staff member is required'),
  openingHours: z.array(z.object({
    day: z.number().min(0).max(6),
    isOpen: z.boolean(),
    openTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:mm)').optional().nullable(),
    closeTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:mm)').optional().nullable(),
  })).length(7, 'Opening hours must contain exactly 7 entries'),
  timezone: z.string().min(1, 'Timezone is required'),
});

/**
 * PATCH /api/business
 */
const updateBusinessSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  phone: z.string().optional(),
  timezone: z.string().min(1).optional(),
  notificationPreferences: z.object({
    emailConfirmation: z.boolean().optional(),
    noShowAlerts: z.boolean().optional(),
    dailyDigest: z.boolean().optional(),
  }).optional(),
}).refine((data) => {
  return Object.keys(data).length > 0;
}, 'At least one field must be provided for update');

// ─── Validation middleware helper ───────────────────────────────────────────────

/**
 * Middleware factory to validate request body against a zod schema
 */
const validate = (schema) => {
  return (req, res, next) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        return res.status(400).json({
          success: false,
          error: {
            message: 'Validation failed',
            code: 'VALIDATION_ERROR',
            details: errors,
          },
        });
      }
      next(error);
    }
  };
};

/**
 * Middleware factory to validate request query parameters against a zod schema
 */
const validateQuery = (schema) => {
  return (req, res, next) => {
    try {
      schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        return res.status(400).json({
          success: false,
          error: {
            message: 'Validation failed',
            code: 'VALIDATION_ERROR',
            details: errors,
          },
        });
      }
      next(error);
    }
  };
};

module.exports = {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  createAppointmentSchema,
  updateAppointmentSchema,
  createBusinessSchema,
  updateBusinessSchema,
  validate,
  validateQuery,
};
