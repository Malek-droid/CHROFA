"use strict";

const cron = require("node-cron");
const Appointment = require("../models/Appointment");
const Business = require("../models/Business");
const User = require("../models/User");
const { sendReminderEmail, sendProviderReminderEmail } = require("./emailService");
const { sendWhatsAppMessage, isSessionActive } = require("./whatsappService");

// ─── Reminder scheduler ───────────────────────────────────────────────────────

let reminderJob = null;

/**
 * Start the reminder scheduler.
 * This runs every hour to check for appointments that need reminders.
 */
function startReminderScheduler() {
  if (reminderJob) {
    console.log("[reminderScheduler] Scheduler already running.");
    return;
  }

  // Run every hour at minute 0
  reminderJob = cron.schedule("0 * * * *", async () => {
    console.log("[reminderScheduler] Running hourly reminder check...");
    await sendReminders();
  });

  console.log("[reminderScheduler] Reminder scheduler started (runs every hour).");
}

/**
 * Stop the reminder scheduler.
 */
function stopReminderScheduler() {
  if (reminderJob) {
    reminderJob.stop();
    reminderJob = null;
    console.log("[reminderScheduler] Reminder scheduler stopped.");
  }
}

/**
 * Check for appointments that need reminders and send them.
 * This function is called by the cron job every hour.
 */
async function sendReminders() {
  try {
    // Get all businesses that have either client or provider reminders enabled
    const businesses = await Business.find({
      $or: [
        { 'notificationPreferences.clientReminders': { $ne: false } },
        { 'notificationPreferences.providerReminders': { $ne: false } }
      ]
    });

    console.log(`[reminderScheduler] Checking reminders for ${businesses.length} businesses with reminders enabled`);

    for (const business of businesses) {
      try {
        // Calculate the time window in the business's timezone
        const now = new Date();
        
        // Convert current UTC time to business timezone
        const nowInBusinessTz = new Date(now.toLocaleString('en-US', { timeZone: business.timezone }));
        
        // Calculate 24h and 25h from now in business timezone
        const in24Hours = new Date(nowInBusinessTz.getTime() + 24 * 60 * 60 * 1000);
        const in25Hours = new Date(nowInBusinessTz.getTime() + 25 * 60 * 60 * 1000);
        
        // Convert back to UTC for database query
        const in24HoursUTC = new Date(in24Hours.toLocaleString('en-US', { timeZone: 'UTC' }));
        const in25HoursUTC = new Date(in25Hours.toLocaleString('en-US', { timeZone: 'UTC' }));

        console.log(`[reminderScheduler] Business: ${business.name} (${business.timezone})`);
        console.log(`[reminderScheduler] Current UTC time: ${now.toISOString()}`);
        console.log(`[reminderScheduler] 24h window (UTC): ${in24HoursUTC.toISOString()} to ${in25HoursUTC.toISOString()}`);

        // Find appointments in the next 24-25 hours that:
        // - Belong to this business
        // - Have status 'confirmed' or 'pending'
        const appointments = await Appointment.find({
          businessId: business._id,
          date: {
            $gte: in24HoursUTC,
            $lt: in25HoursUTC,
          },
          status: { $in: ["confirmed", "pending"] },
        }).populate("customerId", "name email");

        console.log(`[reminderScheduler] Found ${appointments.length} appointments in reminder window for ${business.name}`);

        // Get business owner for provider reminders
        const businessOwner = await User.findOne({ businessId: business._id });

        for (const appointment of appointments) {
          try {
            // Format date/time in business timezone for emails
            const appointmentDateInTz = new Date(appointment.date.toLocaleString('en-US', { timeZone: business.timezone }));
            const dateStr = appointmentDateInTz.toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            });
            const timeStr = appointmentDateInTz.toLocaleTimeString('en-US', { 
              hour: '2-digit', 
              minute: '2-digit',
              hour12: true 
            });

            // Send client reminder if enabled and not yet sent
            if (business.notificationPreferences.clientReminders && !appointment.reminderSent) {
              const customer = appointment.customerId;
              await sendReminderEmail({
                to: customer.email,
                customerName: customer.name,
                businessName: business.name,
                serviceName: appointment.service,
                date: dateStr,
                time: timeStr,
                staffName: appointment.staffName,
              });

              // Mark client reminder as sent
              await Appointment.findByIdAndUpdate(appointment._id, { reminderSent: true });
              console.log(`[reminderScheduler] Client reminder sent for appointment ${appointment._id}`);
            }

            // Send client WhatsApp reminder if enabled and session is active
            if (business.notificationPreferences.clientWhatsAppReminders && !appointment.whatsappReminderSent && isSessionActive(business._id.toString())) {
              try {
                const customer = appointment.customerId;
                if (customer.phone) {
                  const whatsappMessage = `Reminder: You have an appointment for ${appointment.service} at ${business.name} on ${dateStr} at ${timeStr}. Staff: ${appointment.staffName || 'TBD'}.`;
                  await sendWhatsAppMessage(business._id.toString(), customer.phone, whatsappMessage);
                  await Appointment.findByIdAndUpdate(appointment._id, { whatsappReminderSent: true });
                  console.log(`[reminderScheduler] Client WhatsApp reminder sent for appointment ${appointment._id}`);
                }
              } catch (whatsappError) {
                console.error(`[reminderScheduler] Failed to send WhatsApp reminder for appointment ${appointment._id}:`, whatsappError);
                // Don't fail the entire reminder process if WhatsApp fails
              }
            }

            // Send provider reminder if enabled and not yet sent
            if (business.notificationPreferences.providerReminders && !appointment.providerReminderSent && businessOwner) {
              await sendProviderReminderEmail({
                to: businessOwner.email,
                providerName: businessOwner.name,
                businessName: business.name,
                customerName: appointment.customerId.name,
                serviceName: appointment.service,
                date: dateStr,
                time: timeStr,
                staffName: appointment.staffName,
              });

              // Mark provider reminder as sent
              await Appointment.findByIdAndUpdate(appointment._id, { providerReminderSent: true });
              console.log(`[reminderScheduler] Provider reminder sent for appointment ${appointment._id}`);
            }

            // Send provider WhatsApp reminder if enabled and session is active
            if (business.notificationPreferences.providerWhatsAppReminders && !appointment.providerWhatsappReminderSent && isSessionActive(business._id.toString())) {
              try {
                if (businessOwner.phone) {
                  const whatsappMessage = `Upcoming Appointment: ${appointment.customerId.name} - ${appointment.service} on ${dateStr} at ${timeStr}. Staff: ${appointment.staffName || 'TBD'}.`;
                  await sendWhatsAppMessage(business._id.toString(), businessOwner.phone, whatsappMessage);
                  await Appointment.findByIdAndUpdate(appointment._id, { providerWhatsappReminderSent: true });
                  console.log(`[reminderScheduler] Provider WhatsApp reminder sent for appointment ${appointment._id}`);
                }
              } catch (whatsappError) {
                console.error(`[reminderScheduler] Failed to send provider WhatsApp reminder for appointment ${appointment._id}:`, whatsappError);
                // Don't fail the entire reminder process if WhatsApp fails
              }
            }
          } catch (error) {
            console.error(`[reminderScheduler] Failed to send reminder for appointment ${appointment._id}:`, error);
          }
        }
      } catch (error) {
        console.error(`[reminderScheduler] Error processing reminders for business ${business._id}:`, error);
      }
    }
  } catch (error) {
    console.error("[reminderScheduler] Error in reminder check:", error);
  }
}

/**
 * Manually trigger a reminder check (useful for testing).
 */
async function triggerReminderCheck() {
  console.log("[reminderScheduler] Manually triggering reminder check...");
  await sendReminders();
}

module.exports = {
  startReminderScheduler,
  stopReminderScheduler,
  triggerReminderCheck,
};
