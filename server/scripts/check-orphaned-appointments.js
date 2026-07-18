/**
 * Script to count appointments with missing customer records.
 * Run with: node server/scripts/check-orphaned-appointments.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Appointment = require('../models/Appointment');
const Customer = require('../models/Customer');

async function checkOrphanedAppointments() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get all appointments
    const allAppointments = await Appointment.find({});
    console.log(`Total appointments in database: ${allAppointments.length}`);

    // Get all customer IDs referenced by appointments
    const customerIds = allAppointments.map(a => a.customerId).filter(id => id);
    const uniqueCustomerIds = [...new Set(customerIds.map(id => id.toString()))];
    console.log(`Unique customer IDs referenced by appointments: ${uniqueCustomerIds.length}`);

    // Check how many of these customer IDs actually exist in the customers collection
    const existingCustomers = await Customer.find({ _id: { $in: uniqueCustomerIds } });
    console.log(`Customers found in database: ${existingCustomers.length}`);

    // Calculate orphaned appointments
    const existingCustomerIds = new Set(existingCustomers.map(c => c._id.toString()));
    const orphanedCount = allAppointments.filter(a => 
      a.customerId && !existingCustomerIds.has(a.customerId.toString())
    ).length;

    console.log(`\n=== RESULTS ===`);
    console.log(`Orphaned appointments (customerId not found in customers collection): ${orphanedCount}`);
    console.log(`Valid appointments: ${allAppointments.length - orphanedCount}`);

    // Also check for appointments with null customerId
    const nullCustomerIdCount = allAppointments.filter(a => !a.customerId).length;
    console.log(`Appointments with null customerId: ${nullCustomerIdCount}`);

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkOrphanedAppointments();
