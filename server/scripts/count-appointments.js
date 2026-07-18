require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Appointment = require('../models/Appointment');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const count = await Appointment.countDocuments();
  const hasServicePrice = await Appointment.countDocuments({ servicePriceSnapshot: { $exists: true } });
  const hasBufferBefore = await Appointment.countDocuments({ bufferBeforeMinutes: { $exists: true } });
  const hasBufferAfter = await Appointment.countDocuments({ bufferAfterMinutes: { $exists: true } });
  
  console.log(`Total appointments: ${count}`);
  console.log(`Appointments with servicePriceSnapshot: ${hasServicePrice}`);
  console.log(`Appointments with bufferBeforeMinutes: ${hasBufferBefore}`);
  console.log(`Appointments with bufferAfterMinutes: ${hasBufferAfter}`);
  console.log(`\nBackfill scope: ${count - hasServicePrice} appointments need price snapshot`);
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
