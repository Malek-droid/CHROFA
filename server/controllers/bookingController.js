'use strict';

const Business            = require('../models/Business');
const Appointment         = require('../models/Appointment');
const { getAIResponse }   = require('../services/aiBookingService');
const availabilityService = require('../services/availabilityService');
const { findOrCreateCustomer } = require('../utils/customerHelper');
const { addSyncJob }      = require('../queues/calendarSyncQueue');

// ─── Sensitive fields to strip from public responses ─────────────────────────
// These fields must NEVER be returned to unauthenticated callers.
const STRIP_FIELDS = [
  'googleCalendarRefreshToken',
  'googleCalendarConnectedEmail',
  'googleCalendarConnected',
  'ownerId',
  'integrations',
  'notificationPreferences',
  '__v',
];

/**
 * Shape a Mongoose Business document into the safe public projection.
 * Only name, services, staff, openingHours, and timezone are exposed.
 */
function publicBusiness(doc) {
  return {
    id:           doc._id.toString(),
    name:         doc.name,
    phone:        doc.phone || null,
    timezone:     doc.timezone,
    openingHours: doc.openingHours.map((h) => ({
      day:       h.day,
      isOpen:    h.isOpen,
      openTime:  h.openTime,
      closeTime: h.closeTime,
    })),
    services: doc.services.map((s) => ({
      id:              s._id.toString(),
      name:            s.name,
      durationMinutes: s.durationMinutes,
      price:           s.price ?? null,
    })),
    staff: doc.staff.map((s) => ({
      id:   s._id.toString(),
      name: s.name,
    })),
  };
}

/**
 * Merge two extraction objects, prioritizing the new extraction.
 */
function mergeExtractions(newExtracted, oldExtracted) {
  return {
    service:         (newExtracted && newExtracted.service)         || (oldExtracted && oldExtracted.service)         || null,
    date:            (newExtracted && newExtracted.date)            || (oldExtracted && oldExtracted.date)            || null,
    timePreference:  (newExtracted && newExtracted.timePreference)  || (oldExtracted && oldExtracted.timePreference)  || null,
    staffPreference: (newExtracted && newExtracted.staffPreference) || (oldExtracted && oldExtracted.staffPreference) || null,
    customerName:    (newExtracted && newExtracted.customerName)    || (oldExtracted && oldExtracted.customerName)    || null,
    customerEmail:   (newExtracted && newExtracted.customerEmail)   || (oldExtracted && oldExtracted.customerEmail)   || null,
  };
}

// ─── GET /api/book/:businessId ────────────────────────────────────────────────

/**
 * Return public-safe business information so the booking page can display
 * the business name, services, staff options, and opening hours without
 * requiring authentication.
 */
exports.getBusinessPublic = async (req, res, next) => {
  const business = await Business.findById(req.params.businessId);
  if (!business) {
    const err = new Error('This booking link is invalid or expired.');
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    return next(err);
  }

  res.status(200).json({
    success:  true,
    business: publicBusiness(business),
  });
};

// ─── POST /api/book/:businessId/chat ─────────────────────────────────────────

/**
 * Process one conversational turn of the booking flow.
 *
 * Accepts:
 *   messages  {Array}  Full conversation history [{ role, content }]
 *   extracted {object} Already-known fields from previous turns (merged by frontend)
 *
 * Returns the AI's structured response. If the intent is propose_slots or
 * check_availability, this handler queries real availability and either injects
 * the slots into a follow-up LLM call or returns them directly.
 */
exports.chat = async (req, res, next) => {
  const business = await Business.findById(req.params.businessId);
  if (!business) {
    const err = new Error('Business not found.');
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    return next(err);
  }

  const { messages = [], extracted = {} } = req.body;

  if (!Array.isArray(messages)) {
    const err = new Error('messages must be an array.');
    err.statusCode = 400;
    err.code = 'VALIDATION_ERROR';
    return next(err);
  }

  const businessContext = publicBusiness(business);

  // ── First LLM call — extract intent and info ───────────────────────────────
  let aiResponse = await getAIResponse({ messages, businessContext });

  // Merge any previously extracted fields so context carries over
  const mergedExtracted = mergeExtractions(aiResponse.extracted, extracted);
  aiResponse.extracted = mergedExtracted;

  // ── Availability check — if AI signals it's time to show slots ─────────────
  if (
    (aiResponse.intent === 'check_availability' || aiResponse.intent === 'propose_slots') &&
    mergedExtracted.date &&
    mergedExtracted.service
  ) {
    const serviceObj = business.services.find(
      (s) => s.name.toLowerCase() === mergedExtracted.service.toLowerCase()
    );

    if (serviceObj) {
      try {
        const availableSlots = await availabilityService.getAvailableSlots({
          businessId: business._id.toString(),
          dateStr:    mergedExtracted.date,  // YYYY-MM-DD — exact format getAvailableSlots expects
          serviceId:  serviceObj._id.toString(),
          staffName:  mergedExtracted.staffPreference || undefined,
        });

        if (availableSlots.length === 0) {
          // No slots — ask the AI to suggest alternatives
          const noSlotsMessage = [
            ...messages,
            {
              role:    'assistant',
              content: JSON.stringify(aiResponse),
            },
            {
              role:    'system',
              content: `AVAILABILITY CHECK RESULT: No available slots found on ${mergedExtracted.date} for "${serviceObj.name}". Please suggest the customer tries a different date, mention the business hours, and ask what other day might work.`,
            },
          ];

          aiResponse = await getAIResponse({
            messages:        noSlotsMessage,
            businessContext,
          });
          aiResponse.extracted   = mergeExtractions(aiResponse.extracted, mergedExtracted);
          aiResponse.proposedSlots = null;
        } else {
          // Filter by time preference if provided
          let filteredSlots = availableSlots;
          const pref = (mergedExtracted.timePreference || '').toLowerCase();

          if (pref === 'morning') {
            filteredSlots = availableSlots.filter((t) => {
              const [h] = t.split(':').map(Number);
              return h < 12;
            });
          } else if (pref === 'afternoon') {
            filteredSlots = availableSlots.filter((t) => {
              const [h] = t.split(':').map(Number);
              return h >= 12 && h < 17;
            });
          } else if (pref === 'evening') {
            filteredSlots = availableSlots.filter((t) => {
              const [h] = t.split(':').map(Number);
              return h >= 17;
            });
          }

          const slotsToShow = (filteredSlots.length ? filteredSlots : availableSlots).slice(0, 8);

          // Second LLM call — tell the model about real available slots so it can phrase the response naturally
          const slotsMessage = [
            ...messages,
            {
              role:    'system',
              content: `AVAILABILITY CHECK RESULT: The following slots are available on ${mergedExtracted.date} for "${serviceObj.name}": ${slotsToShow.join(', ')}. Present these times to the customer in a friendly way and ask them to choose one. Populate proposedSlots with exactly these values: ${JSON.stringify(slotsToShow)}.`,
            },
          ];

          aiResponse = await getAIResponse({
            messages:        slotsMessage,
            businessContext,
          });
          aiResponse.extracted    = mergeExtractions(aiResponse.extracted, mergedExtracted);
          aiResponse.proposedSlots = slotsToShow;
          aiResponse.intent        = 'propose_slots';
        }
      } catch (availErr) {
        console.error('[bookingController/chat] Availability check failed:', availErr.message);
        // Don't crash — let the AI continue without real slot data
      }
    }
  }

  return res.status(200).json({
    success:  true,
    response: aiResponse,
  });
};

// ─── POST /api/book/:businessId/confirm ──────────────────────────────────────

/**
 * Create a real appointment from the confirmed booking details.
 *
 * This endpoint is PUBLIC — no requireAuth. Customer-initiated bookings
 * are always created with status: 'pending' (not 'confirmed') so the
 * business owner reviews them before they are locked in.
 *
 * Expected body:
 *   customerName    {string} required
 *   customerEmail   {string} required
 *   service         {string} required — matched case-insensitively against business services
 *   date            {string} required — YYYY-MM-DD
 *   time            {string} required — HH:mm (specific slot chosen by customer)
 *   staffPreference {string} optional
 */
exports.confirm = async (req, res, next) => {
  const business = await Business.findById(req.params.businessId);
  if (!business) {
    const err = new Error('This booking link is invalid or expired.');
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    return next(err);
  }

  const { customerName, customerEmail, service, date, time, staffPreference } = req.body;

  // ── Validate required fields ───────────────────────────────────────────────
  const missing = [];
  if (!customerName  || !String(customerName).trim())  missing.push('customerName');
  if (!customerEmail || !String(customerEmail).trim())  missing.push('customerEmail');
  if (!service       || !String(service).trim())        missing.push('service');
  if (!date          || !String(date).trim())           missing.push('date');
  if (!time          || !String(time).trim())           missing.push('time');

  if (missing.length) {
    const err = new Error(`Missing required fields: ${missing.join(', ')}.`);
    err.statusCode = 400;
    err.code = 'VALIDATION_ERROR';
    return next(err);
  }

  // ── Validate date format ───────────────────────────────────────────────────
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
    const err = new Error('date must be in YYYY-MM-DD format.');
    err.statusCode = 400;
    err.code = 'VALIDATION_ERROR';
    return next(err);
  }

  // ── Validate time format ───────────────────────────────────────────────────
  if (!/^\d{2}:\d{2}$/.test(time.trim())) {
    const err = new Error('time must be in HH:mm format.');
    err.statusCode = 400;
    err.code = 'VALIDATION_ERROR';
    return next(err);
  }

  // ── Look up service ────────────────────────────────────────────────────────
  const serviceObj = business.services.find(
    (s) => s.name.toLowerCase() === service.trim().toLowerCase()
  );
  if (!serviceObj) {
    const err = new Error(
      `Service "${service}" is not available at this business. ` +
      `Available services: ${business.services.map((s) => s.name).join(', ') || 'none'}.`
    );
    err.statusCode = 400;
    err.code = 'VALIDATION_ERROR';
    return next(err);
  }

  // ── Convert local date+time to a UTC Date object ───────────────────────────
  // Uses the same helper that the availability service uses internally — ensures
  // the slot comparison is done in the correct timezone.
  const slotDate = availabilityService.getLocalDateInTimezone(
    date.trim(),
    time.trim(),
    business.timezone
  );

  // ── Race-condition guard — re-check availability immediately before insert ─
  const resolvedStaff = staffPreference && staffPreference.trim() !== 'none'
    ? staffPreference.trim()
    : null;

  const isAvailable = await availabilityService.isSlotAvailable({
    businessId:      business._id.toString(),
    date:            slotDate,
    durationMinutes: serviceObj.durationMinutes,
    staffName:       resolvedStaff,
  });

  if (!isAvailable) {
    const err = new Error('That slot was just taken — please choose another time.');
    err.statusCode = 409;
    err.code = 'CONFLICT';
    return next(err);
  }

  // ── Find or create customer ────────────────────────────────────────────────
  const customer = await findOrCreateCustomer({
    name:  customerName,
    email: customerEmail,
    phone: null, // phone not collected in conversational flow
  });

  // ── Create appointment ─────────────────────────────────────────────────────
  // Public/customer-initiated bookings are ALWAYS 'pending'.
  // Staff-entered bookings (via the owner dashboard) default to 'confirmed'.
  const appointment = await Appointment.create({
    businessId:      business._id,
    customerId:      customer._id,
    staffName:       resolvedStaff,
    service:         serviceObj.name,           // canonical name from Business
    durationMinutes: serviceObj.durationMinutes, // server-derived, not client-supplied
    date:            slotDate,
    status:          'pending',
    notes:           null,
  });

  const populated = await Appointment
    .findById(appointment._id)
    .populate('customerId', 'name email phone');

  const cust = populated.customerId;

  res.status(201).json({
    success: true,
    appointment: {
      id:              populated._id.toString(),
      customer:        cust ? cust.name  : customerName,
      customerEmail:   cust ? cust.email : customerEmail,
      service:         populated.service,
      durationMinutes: populated.durationMinutes,
      date:            populated.date.toISOString(),
      time,
      status:          populated.status,
      staffName:       populated.staffName || null,
      createdAt:       populated.createdAt.toISOString(),
    },
  });

  // ── Async Google Calendar sync (fires after response is sent) ──────────────
  // Sync fires for pending bookings too so the slot is immediately blocked on
  // the owner's calendar. If you prefer to sync only on confirmation, move this
  // to the PATCH /appointments/:id handler when status changes to 'confirmed'.
  if (business.googleCalendarConnected) {
    addSyncJob('create-event', { appointmentId: appointment._id }).catch((err) =>
      console.error('[calendar-sync] Failed to enqueue create job:', err.message)
    );
  }
};
