require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Business = require('../models/Business');

async function migrateBusinessIndustry() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Update existing business from old industry to new industry
    const result = await Business.updateMany(
      { industry: 'clinic_medical' },
      { $set: { industry: 'medical_clinics' } }
    );

    console.log(`Updated ${result.modifiedCount} businesses from clinic_medical to medical_clinics`);

    // Also handle other old industries if they exist
    const salonResult = await Business.updateMany(
      { industry: 'salon_spa' },
      { $set: { industry: 'hair_salons' } }
    );
    console.log(`Updated ${salonResult.modifiedCount} businesses from salon_spa to hair_salons`);

    const legalResult = await Business.updateMany(
      { industry: 'legal_consulting' },
      { $set: { industry: 'lawyers' } }
    );
    console.log(`Updated ${legalResult.modifiedCount} businesses from legal_consulting to lawyers`);

    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrateBusinessIndustry();
