"use strict";

const Business = require("../models/Business");
const Appointment = require("../models/Appointment");
const { getAIResponse } = require("../services/aiBookingService");
const availabilityService = require("../services/availabilityService");
const { createAppointment } = require("../services/appointmentService");
const { addSyncJob } = require("../queues/calendarSyncQueue");
const { sendConfirmationEmail } = require("../services/emailService");

// ─── Sensitive fields to strip from public responses ─────────────────────────
// These fields must NEVER be returned to unauthenticated callers.
const STRIP_FIELDS = [
  "googleCalendarRefreshToken",
  "googleCalendarConnectedEmail",
  "googleCalendarConnected",
  "ownerId",
  "integrations",
  "notificationPreferences",
  "__v",
];

/**
 * Shape a Mongoose Business document into the safe public projection.
 * Only name, services, staff, openingHours, and timezone are exposed.
 */
function publicBusiness(doc) {
  return {
    id: doc._id.toString(),
    name: doc.name,
    phone: doc.phone || null,
    timezone: doc.timezone,
    slug: doc.slug || null,
    headerTagline: doc.headerTagline || null,
    industry: doc.industry || null,
    openingHours: doc.openingHours.map((h) => ({
      day: h.day,
      isOpen: h.isOpen,
      openTime: h.openTime,
      closeTime: h.closeTime,
    })),
    services: doc.services.filter(s => s.active !== false).map((s) => ({
      id: s._id.toString(),
      name: s.name,
      durationMinutes: s.durationMinutes,
      price: s.price ?? null,
    })),
    staff: doc.staff.map((s) => ({
      id: s._id.toString(),
      name: s.name,
    })),
  };
}

/**
 * Merge two extraction objects, prioritizing the new extraction.
 */
function mergeExtractions(newExtracted, oldExtracted) {
  return {
    service:
      (newExtracted && newExtracted.service) || (oldExtracted && oldExtracted.service) || null,
    date: (newExtracted && newExtracted.date) || (oldExtracted && oldExtracted.date) || null,
    timePreference:
      (newExtracted && newExtracted.timePreference) ||
      (oldExtracted && oldExtracted.timePreference) ||
      null,
    staffPreference:
      (newExtracted && newExtracted.staffPreference) ||
      (oldExtracted && oldExtracted.staffPreference) ||
      null,
    customerName:
      (newExtracted && newExtracted.customerName) ||
      (oldExtracted && oldExtracted.customerName) ||
      null,
    customerEmail:
      (newExtracted && newExtracted.customerEmail) ||
      (oldExtracted && oldExtracted.customerEmail) ||
      null,
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
    const err = new Error("This booking link is invalid or expired.");
    err.statusCode = 404;
    err.code = "NOT_FOUND";
    return next(err);
  }

  res.status(200).json({
    success: true,
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
    const err = new Error("Business not found.");
    err.statusCode = 404;
    err.code = "NOT_FOUND";
    return next(err);
  }

  const { messages = [], extracted = {} } = req.body;
  console.log("[chat] messages received:", JSON.stringify(messages));
  console.log("[chat] extracted received:", JSON.stringify(extracted));

  if (!Array.isArray(messages)) {
    const err = new Error("messages must be an array.");
    err.statusCode = 400;
    err.code = "VALIDATION_ERROR";
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
    (aiResponse.intent === "check_availability" || aiResponse.intent === "propose_slots") &&
    mergedExtracted.date &&
    mergedExtracted.service
  ) {
    const serviceObj = business.services.find(
      (s) => s.name.toLowerCase() === mergedExtracted.service.toLowerCase(),
    );

    if (serviceObj) {
      try {
        const availableSlots = await availabilityService.getAvailableSlots({
          businessId: business._id.toString(),
          dateStr: mergedExtracted.date, // YYYY-MM-DD — exact format getAvailableSlots expects
          serviceId: serviceObj._id.toString(),
          staffName: mergedExtracted.staffPreference || undefined,
        });

        if (availableSlots.length === 0) {
          // No slots — ask the AI to suggest alternatives
          const noSlotsMessage = [
            ...messages,
            {
              role: "assistant",
              content: JSON.stringify(aiResponse),
            },
            {
              role: "system",
              content: `AVAILABILITY CHECK RESULT: No available slots found on ${mergedExtracted.date} for "${serviceObj.name}". Please suggest the customer tries a different date, mention the business hours, and ask what other day might work.`,
            },
          ];

          aiResponse = await getAIResponse({
            messages: noSlotsMessage,
            businessContext,
          });
          aiResponse.extracted = mergeExtractions(aiResponse.extracted, mergedExtracted);
          aiResponse.proposedSlots = null;
        } else {
          // Filter by time preference if provided
          let filteredSlots = availableSlots;
          const pref = (mergedExtracted.timePreference || "").toLowerCase();

          if (pref === "morning") {
            filteredSlots = availableSlots.filter((t) => {
              const [h] = t.split(":").map(Number);
              return h < 12;
            });
          } else if (pref === "afternoon") {
            filteredSlots = availableSlots.filter((t) => {
              const [h] = t.split(":").map(Number);
              return h >= 12 && h < 17;
            });
          } else if (pref === "evening") {
            filteredSlots = availableSlots.filter((t) => {
              const [h] = t.split(":").map(Number);
              return h >= 17;
            });
          }

          const slotsToShow = (filteredSlots.length ? filteredSlots : availableSlots).slice(0, 8);

          // Second LLM call — tell the model about real available slots so it can phrase the response naturally
          const slotsMessage = [
            ...messages,
            {
              role: "system",
              content: `AVAILABILITY CHECK RESULT: The following slots are available on ${mergedExtracted.date} for "${serviceObj.name}": ${slotsToShow.join(", ")}. Present these times to the customer in a friendly way and ask them to choose one. Populate proposedSlots with exactly these values: ${JSON.stringify(slotsToShow)}.`,
            },
          ];

          aiResponse = await getAIResponse({
            messages: slotsMessage,
            businessContext,
          });
          aiResponse.extracted = mergeExtractions(aiResponse.extracted, mergedExtracted);
          aiResponse.proposedSlots = slotsToShow;
          aiResponse.intent = "propose_slots";
        }
      } catch (availErr) {
        console.error("[bookingController/chat] Availability check failed:", availErr.message);
        // Don't crash — let the AI continue without real slot data
      }
    }
  }

  // ── Booking execution — if AI signals ready to book, execute the actual creation ─
  if (aiResponse.intent === "confirm_booking" && aiResponse.readyToBook) {
    const serviceObj = business.services.find(
      (s) => s.name.toLowerCase() === mergedExtracted.service.toLowerCase(),
    );

    if (serviceObj && mergedExtracted.date && mergedExtracted.timePreference) {
      try {
        // Convert local date+time to UTC
        const slotDate = availabilityService.getLocalDateInTimezone(
          mergedExtracted.date,
          mergedExtracted.timePreference,
          business.timezone,
        );

        // Execute the shared appointment creation logic
        const appointment = await createAppointment({
          businessId: business._id.toString(),
          customerName: mergedExtracted.customerName,
          customerEmail: mergedExtracted.customerEmail,
          customerPhone: null,
          service: mergedExtracted.service,
          date: slotDate.toISOString(),
          staffName: mergedExtracted.staffPreference,
          notes: null,
          status: "pending",
        });

        // Send confirmation email
        sendConfirmationEmail({
          to: mergedExtracted.customerEmail,
          customerName: mergedExtracted.customerName,
          businessName: business.name,
          serviceName: mergedExtracted.service,
          date: mergedExtracted.date,
          time: mergedExtracted.timePreference,
          staffName: appointment.staffName,
        }).catch((err) => console.error("[bookingController/chat] Failed to send confirmation email:", err));

        // Async Google Calendar sync
        if (business.googleCalendarConnected) {
          addSyncJob("create-event", { appointmentId: appointment.id }).catch((err) =>
            console.error("[calendar-sync] Failed to enqueue create job:", err.message),
          );
        }

        // Return success with the AI's message (which should be confirmation)
        return res.status(200).json({
          success: true,
          response: aiResponse,
          appointment,
        });
      } catch (bookingErr) {
        console.error("[bookingController/chat] Booking failed:", bookingErr.message);

        // If the slot was taken, try to get alternative slots
        if (bookingErr.code === "CONFLICT") {
          try {
            const alternativeSlots = await availabilityService.getAvailableSlots({
              businessId: business._id.toString(),
              dateStr: mergedExtracted.date,
              serviceId: serviceObj._id.toString(),
              staffName: mergedExtracted.staffPreference || undefined,
            });

            const failureMessage = [
              ...messages,
              {
                role: "assistant",
                content: JSON.stringify(aiResponse),
              },
              {
                role: "system",
                content: `BOOKING FAILED: That time slot was just taken by another customer. Available alternative times on ${mergedExtracted.date}: ${alternativeSlots.slice(0, 5).join(", ") || "none"}. Please apologize to the customer and offer these alternative times, or suggest a different date.`,
              },
            ];

            const fallbackResponse = await getAIResponse({
              messages: failureMessage,
              businessContext,
            });
            fallbackResponse.extracted = mergeExtractions(fallbackResponse.extracted, mergedExtracted);

            return res.status(200).json({
              success: false,
              response: fallbackResponse,
            });
          } catch (availErr) {
            console.error("[bookingController/chat] Failed to get alternatives:", availErr.message);
          }
        }

        // Generic failure response
        const failureMessage = [
          ...messages,
          {
            role: "assistant",
            content: JSON.stringify(aiResponse),
          },
          {
            role: "system",
            content: `BOOKING FAILED: ${bookingErr.message}. Please apologize to the customer and ask them to try again or contact us directly.`,
          },
        ];

        const fallbackResponse = await getAIResponse({
          messages: failureMessage,
          businessContext,
        });
        fallbackResponse.extracted = mergeExtractions(fallbackResponse.extracted, mergedExtracted);

        return res.status(200).json({
          success: false,
          response: fallbackResponse,
        });
      }
    }
  }

  return res.status(200).json({
    success: true,
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
    const err = new Error("This booking link is invalid or expired.");
    err.statusCode = 404;
    err.code = "NOT_FOUND";
    return next(err);
  }

  const { customerName, customerEmail, service, date, time, staffPreference } = req.body;

  // ── Validate required fields ───────────────────────────────────────────────
  const missing = [];
  if (!customerName || !String(customerName).trim()) missing.push("customerName");
  if (!customerEmail || !String(customerEmail).trim()) missing.push("customerEmail");
  if (!service || !String(service).trim()) missing.push("service");
  if (!date || !String(date).trim()) missing.push("date");
  if (!time || !String(time).trim()) missing.push("time");

  if (missing.length) {
    const err = new Error(`Missing required fields: ${missing.join(", ")}.`);
    err.statusCode = 400;
    err.code = "VALIDATION_ERROR";
    return next(err);
  }

  // ── Validate date format ───────────────────────────────────────────────────
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
    const err = new Error("date must be in YYYY-MM-DD format.");
    err.statusCode = 400;
    err.code = "VALIDATION_ERROR";
    return next(err);
  }

  // ── Validate time format ───────────────────────────────────────────────────
  if (!/^\d{2}:\d{2}$/.test(time.trim())) {
    const err = new Error("time must be in HH:mm format.");
    err.statusCode = 400;
    err.code = "VALIDATION_ERROR";
    return next(err);
  }

  // ── Convert local date+time to a UTC Date object ───────────────────────────
  const slotDate = availabilityService.getLocalDateInTimezone(
    date.trim(),
    time.trim(),
    business.timezone,
  );

  try {
    const appointment = await createAppointment({
      businessId: business._id.toString(),
      customerName,
      customerEmail,
      customerPhone: null,
      service,
      date: slotDate.toISOString(),
      staffName: staffPreference,
      notes: null,
      status: "pending",
    });

    res.status(201).json({
      success: true,
      appointment: {
        ...appointment,
        time,
      },
    });

    // ── Send confirmation email ───────────────────────────────────────────────────
    sendConfirmationEmail({
      to: customerEmail,
      customerName,
      businessName: business.name,
      serviceName: service,
      date: date,
      time: time,
      staffName: appointment.staffName,
    }).catch((err) => console.error("[bookingController] Failed to send confirmation email:", err));

    // ── Async Google Calendar sync (fires after response is sent) ──────────────
    if (business.googleCalendarConnected) {
      addSyncJob("create-event", { appointmentId: appointment.id }).catch((err) =>
        console.error("[calendar-sync] Failed to enqueue create job:", err.message),
      );
    }
  } catch (err) {
    next(err);
  }
};
