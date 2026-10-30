"use strict";

const { Worker } = require("bullmq");
const { google } = require("googleapis");
const { getRedisClient } = require("../config/redis");
const Appointment = require("../models/Appointment");
const Business = require("../models/Business");

let worker = null;

/**
 * Configure Google OAuth2 Client using the business's stored refresh token.
 */
function getOAuth2Client(refreshToken) {
  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    "http://localhost:5000/api/calendar/callback",
  );
  client.setCredentials({ refresh_token: refreshToken });
  return client;
}

/**
 * Builds the resource object expected by the Google Calendar events API.
 */
function buildEventBody(appointment, business) {
  const start = new Date(appointment.date);
  const end = new Date(start.getTime() + appointment.durationMinutes * 60 * 1000);

  const staffText = appointment.staffName
    ? `with ${appointment.staffName}`
    : "(No Staff Preference)";
  const notesText = appointment.notes ? `\nNotes: ${appointment.notes}` : "";

  return {
    summary: `${appointment.service} - ${appointment.customer} ${staffText}`,
    description: `Service: ${appointment.service}\nStaff: ${appointment.staffName || "None"}${notesText}\nBooked via Cadence`,
    start: {
      dateTime: start.toISOString(),
      timeZone: business.timezone,
    },
    end: {
      dateTime: end.toISOString(),
      timeZone: business.timezone,
    },
  };
}

/**
 * Asynchronously processes enqueued calendar sync jobs.
 */
async function processJob(job) {
  const { type, appointmentId, googleEventId, businessId } = job.data;
  console.log(`[calendar-worker] Processing job ${job.id} (${type})`);

  let activeBusinessId = businessId;
  let activeGoogleEventId = googleEventId;
  let appointment = null;

  // Resolve businessId and googleEventId from database if not explicitly provided
  if (appointmentId) {
    appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      console.warn(`[calendar-worker] Appointment ${appointmentId} not found. Skipping.`);
      return;
    }
    activeBusinessId = appointment.businessId;
    activeGoogleEventId = appointment.googleEventId;
  }

  if (!activeBusinessId) {
    console.warn(`[calendar-worker] No businessId found for job. Skipping.`);
    return;
  }

  const business = await Business.findById(activeBusinessId);
  if (!business) {
    console.warn(`[calendar-worker] Business ${activeBusinessId} not found. Skipping.`);
    return;
  }

  if (!business.googleCalendarConnected || !business.googleCalendarRefreshToken) {
    console.log(
      `[calendar-worker] Business ${activeBusinessId} Google Calendar not connected. Skipping job.`,
    );
    return;
  }

  const oauth2Client = getOAuth2Client(business.googleCalendarRefreshToken);
  const calendar = google.calendar({ version: "v3", auth: oauth2Client });

  try {
    if (type === "create-event") {
      if (!appointment) throw new Error("Appointment object required for create-event");
      if (appointment.googleEventId) {
        console.log(
          `[calendar-worker] Appointment ${appointmentId} already has eventId. Re-routing to update.`,
        );
        return await calendar.events.update({
          calendarId: "primary",
          eventId: appointment.googleEventId,
          resource: buildEventBody(appointment, business),
        });
      }

      console.log(
        `[calendar-worker] DIAG: Raw appointment.date=${appointment.date} (ISO=${appointment.date ? new Date(appointment.date).toISOString() : "N/A"})`,
      );
      console.log(`[calendar-worker] DIAG: appointment.customer field=${appointment.customer}`);
      console.log(
        `[calendar-worker] DIAG: appointment.customerId populated?=${appointment.customerId ? (typeof appointment.customerId === "object" ? appointment.customerId.name : appointment.customerId) : "no"}`,
      );
      console.log(`[calendar-worker] DIAG: business.timezone=${business.timezone}`);
      const eventBody = buildEventBody(appointment, business);
      console.log(`[calendar-worker] DIAG: Inserting into calendarId="primary"`);
      console.log(`[calendar-worker] DIAG: Request body summary=${eventBody.summary}`);
      console.log(`[calendar-worker] DIAG: Request body start=`, JSON.stringify(eventBody.start));
      console.log(`[calendar-worker] DIAG: Request body end=`, JSON.stringify(eventBody.end));

      const response = await calendar.events.insert({
        calendarId: "primary",
        resource: eventBody,
      });

      console.log(
        `[calendar-worker] DIAG: Response status=${response.status} ${response.statusText}`,
      );
      console.log(`[calendar-worker] DIAG: Response data=`, JSON.stringify(response.data, null, 2));

      appointment.googleEventId = response.data && response.data.id ? response.data.id : null;
      await appointment.save();
      console.log(
        `[calendar-worker] Event created: ${appointment.googleEventId || "ID MISSING"} for appointment ${appointmentId}`,
      );
      console.log(
        `[calendar-worker] DIAG: googleEventId saved on doc=${appointment.googleEventId}`,
      );
    } else if (type === "update-event") {
      if (!appointment) throw new Error("Appointment object required for update-event");
      if (!activeGoogleEventId) {
        console.log(
          `[calendar-worker] Update job triggered but no eventId exists. Re-routing to create.`,
        );
        const response = await calendar.events.insert({
          calendarId: "primary",
          resource: buildEventBody(appointment, business),
        });
        appointment.googleEventId = response.data.id;
        await appointment.save();
        return;
      }

      await calendar.events.update({
        calendarId: "primary",
        eventId: activeGoogleEventId,
        resource: buildEventBody(appointment, business),
      });
      console.log(
        `[calendar-worker] Event updated: ${activeGoogleEventId} for appointment ${appointmentId}`,
      );
    } else if (type === "delete-event") {
      if (!activeGoogleEventId) {
        console.log(`[calendar-worker] Delete job triggered but no eventId exists. Skipping.`);
        return;
      }

      await calendar.events.delete({
        calendarId: "primary",
        eventId: activeGoogleEventId,
      });

      if (appointment) {
        appointment.googleEventId = null;
        await appointment.save();
      }
      console.log(`[calendar-worker] Event deleted: ${activeGoogleEventId}`);
    }
  } catch (err) {
    console.error(`[calendar-worker] Error executing Google Calendar sync:`, err.message);
    if (err.response && err.response.data) {
      console.error(
        `[calendar-worker] Detailed API response error:`,
        JSON.stringify(err.response.data),
      );
    }

    // Detect OAuth invalid grant (token revoked/expired) or explicit 401 Unauthorized.
    //
    // We only disconnect when the user's token/grant itself is invalid (invalid_grant or 401).
    // We MUST NOT disconnect for other errors, such as 403 (e.g. Google Calendar API not enabled,
    // rate limits, or calendar access rights) or client configuration errors ('invalid_client').
    // These are developer or configuration issues, and the user's token/grant remains valid.
    // Triggering disconnection on 403 errors causes correct integrations to be marked disconnected
    // because of project configuration issues.
    const isTokenRevokedOrInvalid =
      err.message.includes("invalid_grant") ||
      (err.response &&
        err.response.data &&
        (err.response.data.error === "invalid_grant" ||
          (err.response.data.error &&
            err.response.data.error.message &&
            err.response.data.error.message.includes("invalid_grant")))) ||
      err.status === 401 ||
      (err.response && err.response.status === 401);

    if (isTokenRevokedOrInvalid) {
      console.warn(
        `[calendar-worker] Revoking calendar connection for business ${activeBusinessId} due to auth failure.`,
      );
      business.googleCalendarConnected = false;
      business.googleCalendarRefreshToken = null;
      business.googleCalendarConnectedEmail = null;
      await business.save();
      return; // Do not fail job (retrying invalid credentials is futile)
    }

    throw err; // Throw to trigger BullMQ retry logic
  }
}

/**
 * Initializes the worker listening to the 'calendar-sync' queue.
 */
function initWorker() {
  if (!worker) {
    worker = new Worker("calendar-sync", processJob, {
      connection: getRedisClient(),
      concurrency: 1, // Single concurrency guarantees serialized appointment writes
    });

    worker.on("error", (err) => {
      console.error("[calendar-worker] BullMQ Worker error:", err.message);
    });

    worker.on("completed", (job) => {
      console.log(`[calendar-worker] Job completed: ${job.id}`);
    });

    worker.on("failed", (job, err) => {
      console.error(
        `[calendar-worker] Job failed: ${job ? job.id : "unknown"}, error:`,
        err.message,
      );
    });

    console.log("[calendar-worker] BullMQ Worker initialized.");
  }
}

module.exports = { initWorker };
