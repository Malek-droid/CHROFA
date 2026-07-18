require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Business = require('../models/Business');
const Appointment = require('../models/Appointment');
const { createAppointment } = require('../services/appointmentService');

async function testSnapshotImmutability() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get a test business
    const business = await Business.findOne({ name: 'Claro' });
    if (!business) {
      console.error('Test business not found');
      process.exit(1);
    }

    console.log(`Using business: ${business.name}`);

    // Create a test appointment
    const appointment = await createAppointment({
      businessId: business._id.toString(),
      customerName: 'Snapshot Test Customer',
      customerEmail: 'snapshot-test@example.com',
      customerPhone: null,
      service: 'Initial Consultation', // Use existing service
      date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24h from now
      staffName: null,
      notes: null,
      status: 'pending',
    });

    console.log('\n=== APPOINTMENT CREATED ===');
    console.log(`Service: ${appointment.service}`);
    console.log(`Duration: ${appointment.durationMinutes}m`);
    console.log(`Price Snapshot: ${appointment.servicePriceSnapshot}`);
    console.log(`Buffer Before: ${appointment.bufferBeforeMinutes}m`);
    console.log(`Buffer After: ${appointment.bufferAfterMinutes}m`);

    // Now edit the service price
    const service = business.services.find(s => s.name === 'Initial Consultation');
    if (service) {
      const originalPrice = service.price;
      service.price = 999; // Change to a different price
      await business.save();
      console.log('\n=== SERVICE PRICE EDITED ===');
      console.log(`Original price: ${originalPrice}`);
      console.log(`New price: ${service.price}`);

      // Check the appointment again
      const updatedAppointment = await Appointment.findById(appointment.id);
      console.log('\n=== APPOINTMENT AFTER SERVICE EDIT ===');
      console.log(`Service: ${updatedAppointment.service}`);
      console.log(`Duration: ${updatedAppointment.durationMinutes}m`);
      console.log(`Price Snapshot: ${updatedAppointment.servicePriceSnapshot} (should still be ${originalPrice})`);
      console.log(`Buffer Before: ${updatedAppointment.bufferBeforeMinutes}m`);
      console.log(`Buffer After: ${updatedAppointment.bufferAfterMinutes}m`);

      // Verify immutability
      if (updatedAppointment.servicePriceSnapshot === originalPrice) {
        console.log('\n✅ SNAPSHOT IMMUTABILITY VERIFIED: Price snapshot unchanged after service edit');
      } else {
        console.log('\n❌ SNAPSHOT IMMUTABILITY FAILED: Price snapshot changed after service edit');
      }

      // Restore original price
      service.price = originalPrice;
      await business.save();
      console.log('\n=== SERVICE PRICE RESTORED ===');
    }

    // Clean up test appointment
    await Appointment.findByIdAndDelete(appointment.id);
    console.log('\n=== CLEANUP COMPLETE ===');

    process.exit(0);
  } catch (err) {
    console.error('Test failed:', err);
    process.exit(1);
  }
}

testSnapshotImmutability();
