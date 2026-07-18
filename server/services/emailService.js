"use strict";

const nodemailer = require("nodemailer");

// ─── Email transporter configuration ────────────────────────────────────────────

let transporter = null;

/**
 * Initialize the email transporter with environment configuration.
 * Call this once at server startup.
 */
function initializeEmailTransporter() {
  const emailProvider = process.env.EMAIL_PROVIDER || "gmail";

  if (emailProvider === "gmail") {
    // Gmail with app-specific password
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      console.warn("[emailService] Gmail credentials not configured. Email sending disabled.");
      return;
    }

    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });
  } else if (emailProvider === "sendgrid") {
    // SendGrid API
    if (!process.env.SENDGRID_API_KEY) {
      console.warn("[emailService] SendGrid API key not configured. Email sending disabled.");
      return;
    }

    transporter = nodemailer.createTransport({
      host: "smtp.sendgrid.net",
      port: 587,
      secure: false,
      auth: {
        user: "apikey",
        pass: process.env.SENDGRID_API_KEY,
      },
    });
  } else {
    console.warn("[emailService] Unknown email provider. Email sending disabled.");
  }

  if (transporter) {
    console.log("[emailService] Email transporter initialized successfully.");
  }
}

// ─── Email templates ───────────────────────────────────────────────────────────

/**
 * Generate booking confirmation email HTML.
 */
function getConfirmationEmailTemplate({
  customerName,
  businessName,
  serviceName,
  date,
  time,
  staffName,
}) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Booking Confirmation</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
    .detail-label { color: #666; font-weight: 500; }
    .detail-value { font-weight: 600; color: #333; }
    .footer { text-align: center; margin-top: 30px; color: #999; font-size: 12px; }
    .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">Booking Confirmed! 🎉</h1>
      <p style="margin: 10px 0 0 0; opacity: 0.9;">Your appointment has been scheduled.</p>
    </div>
    <div class="content">
      <p>Hi ${customerName},</p>
      <p>Your appointment at <strong>${businessName}</strong> has been confirmed. Here are the details:</p>
      
      <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <div class="detail-row">
          <span class="detail-label">Service</span>
          <span class="detail-value">${serviceName}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Date</span>
          <span class="detail-value">${date}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Time</span>
          <span class="detail-value">${time}</span>
        </div>
        ${staffName ? `
        <div class="detail-row">
          <span class="detail-label">Staff</span>
          <span class="detail-value">${staffName}</span>
        </div>
        ` : ''}
      </div>
      
      <p>Please arrive 5-10 minutes early. If you need to reschedule, please contact the business directly.</p>
      
      <div style="text-align: center;">
        <a href="#" class="button">Add to Calendar</a>
      </div>
    </div>
    <div class="footer">
      <p>Powered by Cadence</p>
      <p>This is an automated email. Please do not reply.</p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Generate reminder email HTML (24h before appointment).
 */
function getReminderEmailTemplate({
  customerName,
  businessName,
  serviceName,
  date,
  time,
  staffName,
}) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Appointment Reminder</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
    .detail-label { color: #666; font-weight: 500; }
    .detail-value { font-weight: 600; color: #333; }
    .footer { text-align: center; margin-top: 30px; color: #999; font-size: 12px; }
    .alert { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">Reminder 🔔</h1>
      <p style="margin: 10px 0 0 0; opacity: 0.9;">Your appointment is tomorrow!</p>
    </div>
    <div class="content">
      <p>Hi ${customerName},</p>
      <p>This is a friendly reminder that you have an appointment at <strong>${businessName}</strong> tomorrow:</p>
      
      <div class="alert">
        <strong>⏰ Don't forget!</strong>
      </div>
      
      <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <div class="detail-row">
          <span class="detail-label">Service</span>
          <span class="detail-value">${serviceName}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Date</span>
          <span class="detail-value">${date}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Time</span>
          <span class="detail-value">${time}</span>
        </div>
        ${staffName ? `
        <div class="detail-row">
          <span class="detail-label">Staff</span>
          <span class="detail-value">${staffName}</span>
        </div>
        ` : ''}
      </div>
      
      <p>Please arrive 5-10 minutes early. If you need to reschedule or cancel, please contact the business as soon as possible.</p>
    </div>
    <div class="footer">
      <p>Powered by Cadence</p>
      <p>This is an automated email. Please do not reply.</p>
    </div>
  </div>
</body>
</html>
  `;
}

// ─── Send email functions ─────────────────────────────────────────────────────

/**
 * Send a booking confirmation email.
 */
async function sendConfirmationEmail({ to, customerName, businessName, serviceName, date, time, staffName }) {
  if (!transporter) {
    console.warn("[emailService] Email transporter not initialized. Skipping confirmation email.");
    return;
  }

  const html = getConfirmationEmailTemplate({
    customerName,
    businessName,
    serviceName,
    date,
    time,
    staffName,
  });

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.GMAIL_USER,
      to,
      subject: `Booking Confirmed: ${serviceName} at ${businessName}`,
      html,
    });
    console.log("[emailService] Confirmation email sent to:", to);
  } catch (error) {
    console.error("[emailService] Failed to send confirmation email:", error);
  }
}

/**
 * Send a reminder email (24h before appointment).
 */
async function sendReminderEmail({ to, customerName, businessName, serviceName, date, time, staffName }) {
  if (!transporter) {
    console.warn("[emailService] Email transporter not initialized. Skipping reminder email.");
    return;
  }

  const html = getReminderEmailTemplate({
    customerName,
    businessName,
    serviceName,
    date,
    time,
    staffName,
  });

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.GMAIL_USER,
      to,
      subject: `Reminder: ${serviceName} at ${businessName} on ${date} at ${time}`,
      html,
    });
    console.log("[emailService] Reminder email sent to:", to);
  } catch (error) {
    console.error("[emailService] Failed to send reminder email:", error);
  }
}

/**
 * Send a provider reminder email (24h before appointment).
 */
async function sendProviderReminderEmail({ to, providerName, businessName, customerName, serviceName, date, time, staffName }) {
  if (!transporter) {
    console.warn("[emailService] Email transporter not initialized. Skipping provider reminder email.");
    return;
  }

  const html = getProviderReminderEmailTemplate({
    providerName,
    businessName,
    customerName,
    serviceName,
    date,
    time,
    staffName,
  });

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.GMAIL_USER,
      to,
      subject: `Upcoming Appointment: ${customerName} - ${serviceName} on ${date} at ${time}`,
      html,
    });
    console.log("[emailService] Provider reminder email sent to:", to);
  } catch (error) {
    console.error("[emailService] Failed to send provider reminder email:", error);
  }
}

/**
 * Generate provider reminder email HTML.
 */
function getProviderReminderEmailTemplate({
  providerName,
  businessName,
  customerName,
  serviceName,
  date,
  time,
  staffName,
}) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Provider Reminder</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
    .detail-label { color: #666; font-weight: 500; }
    .detail-value { font-weight: 600; color: #333; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">Upcoming Appointment Reminder</h1>
      <p style="margin: 10px 0 0 0; opacity: 0.9;">You have an appointment coming up at ${businessName}</p>
    </div>
    <div class="content">
      <div class="details">
        <h2 style="margin-top: 0;">Appointment Details</h2>
        <div class="detail-row">
          <span class="detail-label">Customer:</span>
          <span class="detail-value">${customerName}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Service:</span>
          <span class="detail-value">${serviceName}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Date:</span>
          <span class="detail-value">${date}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Time:</span>
          <span class="detail-value">${time}</span>
        </div>
        ${staffName ? `
        <div class="detail-row">
          <span class="detail-label">Staff:</span>
          <span class="detail-value">${staffName}</span>
        </div>
        ` : ''}
      </div>
      <p style="text-align: center; color: #666; margin-top: 30px;">
        This is an automated reminder from ${businessName}.
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Generate weekly digest email HTML.
 */
function getWeeklyDigestEmailTemplate({
  businessName,
  pastWeek,
  upcomingWeek,
}) {
  const hasActivity = pastWeek.totalBooked > 0 || pastWeek.cancelledCount > 0 || pastWeek.noShowCount > 0;
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Weekly Digest</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .section { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .stat-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
    .stat-label { color: #666; font-weight: 500; }
    .stat-value { font-weight: 600; color: #333; }
    .footer { text-align: center; margin-top: 30px; color: #999; font-size: 12px; }
    .highlight { color: #667eea; font-weight: 600; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">Weekly Digest 📊</h1>
      <p style="margin: 10px 0 0 0; opacity: 0.9;">Here's what happened at ${businessName} this week.</p>
    </div>
    <div class="content">
      ${hasActivity ? `
      <div class="section">
        <h2 style="margin-top: 0;">Past 7 Days</h2>
        <div class="stat-row">
          <span class="stat-label">Total bookings</span>
          <span class="stat-value highlight">${pastWeek.totalBooked}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Cancelled</span>
          <span class="stat-value">${pastWeek.cancelledCount}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">No-shows</span>
          <span class="stat-value">${pastWeek.noShowCount}</span>
        </div>
        ${pastWeek.mostBookedService ? `
        <div class="stat-row">
          <span class="stat-label">Top service</span>
          <span class="stat-value">${pastWeek.mostBookedService} (${pastWeek.mostBookedServiceCount})</span>
        </div>
        ` : ''}
      </div>
      ` : `
      <div class="section">
        <h2 style="margin-top: 0;">Past 7 Days</h2>
        <p style="color: #666;">No bookings this week.</p>
      </div>
      `}
      
      ${upcomingWeek.totalScheduled > 0 ? `
      <div class="section">
        <h2 style="margin-top: 0;">Upcoming 7 Days</h2>
        <div class="stat-row">
          <span class="stat-label">Scheduled appointments</span>
          <span class="stat-value highlight">${upcomingWeek.totalScheduled}</span>
        </div>
        ${upcomingWeek.busiestDay ? `
        <div class="stat-row">
          <span class="stat-label">Busiest day</span>
          <span class="stat-value">${upcomingWeek.busiestDay} (${upcomingWeek.busiestDayCount} appointments)</span>
        </div>
        ` : ''}
      </div>
      ` : `
      <div class="section">
        <h2 style="margin-top: 0;">Upcoming 7 Days</h2>
        <p style="color: #666;">No appointments scheduled.</p>
      </div>
      `}
    </div>
    <div class="footer">
      <p>Powered by Cadence</p>
      <p>This is an automated email. Please do not reply.</p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Send a weekly digest email.
 */
async function sendWeeklyDigestEmail({ to, businessName, pastWeek, upcomingWeek }) {
  if (!transporter) {
    console.warn("[emailService] Email transporter not initialized. Skipping weekly digest email.");
    return;
  }

  const html = getWeeklyDigestEmailTemplate({
    businessName,
    pastWeek,
    upcomingWeek,
  });

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.GMAIL_USER,
      to,
      subject: `Weekly Digest: ${businessName}`,
      html,
    });
    console.log("[emailService] Weekly digest email sent to:", to);
  } catch (error) {
    console.error("[emailService] Failed to send weekly digest email:", error);
  }
}

module.exports = {
  initializeEmailTransporter,
  sendConfirmationEmail,
  sendReminderEmail,
  sendProviderReminderEmail,
  sendWeeklyDigestEmail,
};
