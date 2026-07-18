/**
 * Test script for reminder functionality.
 * Creates a test appointment ~24h out and triggers the reminder check.
 * Run with: node server/scripts/test-reminder.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Appointment = require('../models/Appointment');
const Business = require('../models/Business');
const Customer = require('../models/Customer');
const { triggerReminderCheck } = require('../services/reminderScheduler');
const { initializeEmailTransporter } = require('../services/emailService');

async function testReminder() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Initialize email transporter
    initializeEmailTransporter();
    console.log('Email transporter initialized');

    // Get the first business (use existing business)
    const business = await Business.findOne();
    if (!business) {
      console.error('No business found in database');
      process.exit(1);
    }
    
    // Ensure client and provider reminders are enabled for this business
    if (!business.notificationPreferences.clientReminders) {
      business.notificationPreferences.clientReminders = true;
      await business.save();
      console.log('Enabled client reminders for test business');
    }
    
    if (!business.notificationPreferences.providerReminders) {
      business.notificationPreferences.providerReminders = true;
      await business.save();
      console.log('Enabled provider reminders for test business');
    }
    
    console.log(`Using business: ${business.name} (timezone: ${business.timezone})`);

    // Create or get a test customer
    const testEmail = 'reminder-test@example.com';
    let customer = await Customer.findOne({ email: testEmail });
    if (!customer) {
      customer = await Customer.create({
        name: 'Reminder Test User',
        email: testEmail,
        phone: null,
      });
      console.log(`Created test customer: ${customer.email}`);
    } else {
      console.log(`Using existing customer: ${customer.email}`);
    }

    // Create appointment ~24h + 30 minutes from now in business timezone
    const now = new Date();
    const nowInBusinessTz = new Date(now.toLocaleString('en-US', { timeZone: business.timezone }));
    const in24HoursInTz = new Date(nowInBusinessTz.getTime() + 24 * 60 * 60 * 1000 + 30 * 60 * 1000);
    const in24HoursUTC = new Date(in24HoursInTz.toLocaleString('en-US', { timeZone: 'UTC' }));
    
    // Clean up any existing test appointments for this customer
    await Appointment.deleteMany({ customerId: customer._id, service: 'Test Reminder Service' });

    const appointment = await Appointment.create({
      businessId: business._id,
      customerId: customer._id,
      service: 'Test Reminder Service',
      durationMinutes: 30,
      date: in24HoursUTC,
      status: 'confirmed',
      staffName: business.staff[0]?.name || 'Test Staff',
      reminderSent: false,
    });

    console.log(`Created test appointment for: ${in24HoursUTC.toISOString()}`);
    console.log(`Appointment ID: ${appointment._id}`);
    console.log(`Business timezone: ${business.timezone}`);
    console.log(`Current UTC time: ${now.toISOString()}`);

    // Wait a moment for DB to settle
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Trigger reminder check
    console.log('\n=== TRIGGERING REMINDER CHECK ===\n');
    await triggerReminderCheck();

    // Check if reminder was sent
    const updatedAppointment = await Appointment.findById(appointment._id);
    console.log(`\n=== AFTER REMINDER CHECK ===`);
    console.log(`Reminder sent flag: ${updatedAppointment.reminderSent}`);

    // Clean up test data
    await Appointment.findByIdAndDelete(appointment._id);
    console.log('\nCleaned up test appointment');

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testReminder();
