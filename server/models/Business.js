'use strict';

const mongoose = require('mongoose');

// ─── Time string validator ────────────────────────────────────────────────────
// Accepts only "HH:mm" 24-hour format. Rejects strings like "25:00", "9:5",
// or "9am". Validation happens at the schema level so malformed times are
// caught on every write without needing a controller-level guard.
const HH_MM_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

const timeStringValidator = {
  validator: (v) => HH_MM_REGEX.test(v),
  message: (props) =>
    `'${props.value}' is not a valid HH:mm time string (24-hour format required, e.g. "09:00" or "18:30").`,
};

// ─── IANA timezone validator ──────────────────────────────────────────────────
// Intl.supportedValuesOf('timeZone') is available in Node 18+. We use a try/catch
// fallback for older environments — the format regex is a reasonable proxy.
const IANA_TZ_REGEX = /^[A-Za-z_]+\/[A-Za-z_\/+\-]+$/;

const ianaTimezoneValidator = {
  validator: (v) => {
    try {
      // Throws a RangeError for invalid timezone identifiers.
      Intl.DateTimeFormat(undefined, { timeZone: v });
      return true;
    } catch {
      return IANA_TZ_REGEX.test(v);
    }
  },
  message: (props) =>
    `'${props.value}' is not a valid IANA timezone identifier (e.g. "America/Los_Angeles").`,
};

// ─── Embedded sub-schemas ─────────────────────────────────────────────────────

// One entry per day of the week. day 0 = Sunday, day 6 = Saturday.
const openingHoursEntrySchema = new mongoose.Schema(
  {
    day: {
      type: Number,
      required: true,
      min: [0, 'day must be 0–6 (Sun–Sat).'],
      max: [6, 'day must be 0–6 (Sun–Sat).'],
    },
    isOpen: {
      type: Boolean,
      required: true,
      default: false,
    },
    openTime: {
      type: String,
      required: false,
      default: null,
      validate: {
        validator: (v) => v === null || HH_MM_REGEX.test(v),
        message: (props) =>
          `openTime '${props.value}' is not a valid HH:mm string.`,
      },
    },
    closeTime: {
      type: String,
      required: false,
      default: null,
      validate: {
        validator: (v) => v === null || HH_MM_REGEX.test(v),
        message: (props) =>
          `closeTime '${props.value}' is not a valid HH:mm string.`,
      },
    },
  },
  { _id: false }
);

// Service definitions stored on the Business. Appointments snapshot from this
// at booking time; changes here do NOT retroactively affect past appointments.
const serviceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    durationMinutes: {
      type: Number,
      required: true,
      min: [1, 'durationMinutes must be at least 1.'],
    },
    price: {
      type: Number,
      required: false,
      default: null,
      min: [0, 'price cannot be negative.'],
    },
    bufferBeforeMinutes: {
      type: Number,
      required: false,
      default: 0,
      min: [0, 'bufferBeforeMinutes cannot be negative.'],
    },
    bufferAfterMinutes: {
      type: Number,
      required: false,
      default: 0,
      min: [0, 'bufferAfterMinutes cannot be negative.'],
    },
    active: {
      type: Boolean,
      required: true,
      default: true,
    },
    eligibleStaffIds: {
      type: [mongoose.Schema.Types.ObjectId],
      required: false,
      default: [],
    },
    depositRequired: {
      type: Boolean,
      required: true,
      default: false,
    },
    depositAmount: {
      type: Number,
      required: false,
      default: null,
      min: [0, 'depositAmount cannot be negative.'],
    },
    category: {
      type: String,
      required: false,
      default: null,
      trim: true,
    },
    clientDescription: {
      type: String,
      required: false,
      default: null,
      trim: true,
    },
    color: {
      type: String,
      required: false,
      default: null,
      trim: true,
    },
  },
  { _id: true } // Keep _id so services can be identified when editing individual entries.
);

// Staff entries are display labels only — not login accounts, not referenced
// from other collections by ObjectId. Per explicit product decision.
const staffSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: true }
);

// ─── Business schema ──────────────────────────────────────────────────────────

const businessSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    slug: {
      type: String,
      required: false,
      default: null,
      trim: true,
      unique: true,
      sparse: true,
    },

    headerTagline: {
      type: String,
      required: false,
      default: null,
      trim: true,
    },

    industry: {
      type: String,
      required: true,
      enum: {
        values: [
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
        ],
        message: "industry must be one of the supported industry categories.",
      },
    },

    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    phone: {
      type: String,
      required: false,
      default: null,
      trim: true,
    },

    timezone: {
      type: String,
      required: true,
      default: 'America/Los_Angeles',
      validate: ianaTimezoneValidator,
    },

    // Stored as a fixed-length array of 7 entries (Sun=0 … Sat=6).
    // Availability-checking logic will query this by day index.
    openingHours: {
      type: [openingHoursEntrySchema],
      required: true,
      default: () =>
        [0, 1, 2, 3, 4, 5, 6].map((day) => ({
          day,
          isOpen: day >= 1 && day <= 5, // Mon–Fri open by default
          openTime: '09:00',
          closeTime: '18:00',
        })),
      validate: {
        validator: (arr) => arr.length === 7,
        message: 'openingHours must contain exactly 7 entries (one per day, Sun=0 to Sat=6).',
      },
    },

    services: {
      type: [serviceSchema],
      required: false,
      default: [],
    },

    staff: {
      type: [staffSchema],
      required: false,
      default: [],
    },

    googleCalendarConnected: {
      type: Boolean,
      required: true,
      default: false,
    },

    googleCalendarRefreshToken: {
      type: String,
      required: false,
      default: null,
    },

    googleCalendarConnectedEmail: {
      type: String,
      required: false,
      default: null,
    },

    integrations: {
      type: {
        emailProvider: {
          configured: { type: Boolean, required: true, default: false },
        },
      },
      required: true,
      default: () => ({
        emailProvider: { configured: false },
      }),
    },

    notificationPreferences: {
      type: {
        emailConfirmation: { type: Boolean, required: true, default: true },
        clientReminders: { type: Boolean, required: true, default: true },
        providerReminders: { type: Boolean, required: true, default: true },
        clientWhatsAppReminders: { type: Boolean, required: true, default: false },
        providerWhatsAppReminders: { type: Boolean, required: true, default: false },
        noShowAlerts: { type: Boolean, required: true, default: false },
        dailyDigest: { type: Boolean, required: true, default: true },
      },
      required: true,
      default: () => ({
        emailConfirmation: true,
        clientReminders: true,
        providerReminders: true,
        clientWhatsAppReminders: false,
        providerWhatsAppReminders: false,
        noShowAlerts: false,
        dailyDigest: true,
      }),
    },

    // WhatsApp session data for this business
    whatsappSession: {
      connected: { type: Boolean, required: true, default: false },
      phoneNumber: { type: String, required: false, default: null },
      sessionData: { type: Object, required: false, default: null }, // Encrypted session data
    },
  },
  {
    timestamps: true,
  }
);

// ─── Pre-save hook: auto-generate slug from name ──────────────────────────────────
// Generates a URL-friendly slug from the business name if not already set.
// Handles collisions by appending a numeric suffix (e.g. "joes-salon-2").
businessSchema.pre('save', async function(next) {
  // Only generate slug if it's null/undefined and name is present
  if (this.slug === undefined || this.slug === null) {
    if (this.name) {
      const baseSlug = this.name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '') // Remove special chars
        .replace(/\s+/g, '-')         // Spaces to hyphens
        .replace(/-+/g, '-')          // Collapse multiple hyphens
        .replace(/^-|-$/g, '');       // Trim leading/trailing hyphens

      let finalSlug = baseSlug;
      let counter = 1;

      // Check for collisions and append suffix if needed
      while (await this.constructor.findOne({ slug: finalSlug, _id: { $ne: this._id } })) {
        finalSlug = `${baseSlug}-${counter}`;
        counter++;
      }

      this.slug = finalSlug || `business-${Date.now()}`; // Fallback if name is all special chars
    }
  }
  next();
});

const Business = mongoose.model('Business', businessSchema);

module.exports = Business;
