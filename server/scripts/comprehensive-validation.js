require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Business = require('../models/Business');
const Appointment = require('../models/Appointment');
const { INDUSTRIES, getIndustryIds } = require('../config/industries');

async function runValidation() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('=== COMPREHENSIVE VALIDATION ===\n');

    // 1. Validate industry config
    console.log('1. INDUSTRY CONFIG VALIDATION');
    console.log(`   Total industries configured: ${INDUSTRIES.length}`);
    console.log(`   Industry IDs: ${getIndustryIds().join(', ')}`);
    const expectedIndustries = [
      'dentists', 'medical_clinics', 'mental_health_therapists', 'hair_salons', 'nail_salons', 'spas',
      'personal_trainers', 'nutritionists', 'physiotherapists', 'chiropractors',
      'lawyers', 'architects', 'interior_designers', 'veterinary_clinics'
    ];
    const actualIndustries = getIndustryIds();
    const missing = expectedIndustries.filter(i => !actualIndustries.includes(i));
    const extra = actualIndustries.filter(i => !expectedIndustries.includes(i));
    if (missing.length === 0 && extra.length === 0) {
      console.log('   ✅ All 13 industries configured correctly');
    } else {
      console.log(`   ❌ Missing: ${missing.join(', ')}`);
      console.log(`   ❌ Extra: ${extra.join(', ')}`);
    }

    // 2. Validate business industry migration
    console.log('\n2. BUSINESS INDUSTRY MIGRATION');
    const businesses = await Business.find({}, { industry: 1, name: 1 });
    console.log(`   Total businesses: ${businesses.length}`);
    let invalidIndustries = 0;
    businesses.forEach(b => {
      if (!actualIndustries.includes(b.industry)) {
        console.log(`   ❌ ${b.name} has invalid industry: ${b.industry}`);
        invalidIndustries++;
      }
    });
    if (invalidIndustries === 0) {
      console.log('   ✅ All businesses have valid industry values');
    }

    // 3. Validate service schema fields
    console.log('\n3. SERVICE SCHEMA FIELDS');
    const testBusiness = businesses[0];
    if (testBusiness && testBusiness.services && testBusiness.services.length > 0) {
      const service = testBusiness.services[0];
      const requiredFields = ['name', 'durationMinutes', 'price', 'bufferBeforeMinutes', 'bufferAfterMinutes', 'active', 'eligibleStaffIds', 'depositRequired', 'depositAmount', 'category', 'clientDescription', 'color'];
      const missingFields = requiredFields.filter(f => service[f] === undefined);
      if (missingFields.length === 0) {
        console.log('   ✅ All new service fields present');
      } else {
        console.log(`   ❌ Missing fields: ${missingFields.join(', ')}`);
      }
    } else {
      console.log('   ⚠️  No services found to validate');
    }

    // 4. Validate appointment snapshot fields
    console.log('\n4. APPOINTMENT SNAPSHOT FIELDS');
    const appointments = await Appointment.find({}, { service: 1, durationMinutes: 1, servicePriceSnapshot: 1, bufferBeforeMinutes: 1, bufferAfterMinutes: 1 }).limit(1);
    if (appointments.length > 0) {
      const appt = appointments[0];
      const snapshotFields = ['service', 'durationMinutes', 'servicePriceSnapshot', 'bufferBeforeMinutes', 'bufferAfterMinutes'];
      const missingSnapshots = snapshotFields.filter(f => appt[f] === undefined);
      if (missingSnapshots.length === 0) {
        console.log('   ✅ All snapshot fields present');
      } else {
        console.log(`   ⚠️  Missing snapshot fields (expected for old appointments): ${missingSnapshots.join(', ')}`);
      }
    } else {
      console.log('   ⚠️  No appointments found to validate');
    }

    // 5. Count appointments needing backfill
    console.log('\n5. APPOINTMENT BACKFILL SCOPE');
    const totalCount = await Appointment.countDocuments();
    const withPriceSnapshot = await Appointment.countDocuments({ servicePriceSnapshot: { $exists: true } });
    const withoutPriceSnapshot = totalCount - withPriceSnapshot;
    console.log(`   Total appointments: ${totalCount}`);
    console.log(`   With price snapshot: ${withPriceSnapshot}`);
    console.log(`   Without price snapshot: ${withoutPriceSnapshot}`);
    console.log('   ℹ️  Backfill not performed per user instructions');

    // 6. Validate archived services exclusion
    console.log('\n6. ARCHIVED SERVICES EXCLUSION');
    let archivedCount = 0;
    businesses.forEach(b => {
      if (b.services && b.services.length > 0) {
        const archived = b.services.filter(s => s.active === false).length;
        if (archived > 0) {
          archivedCount += archived;
          console.log(`   ${b.name}: ${archived} archived services`);
        }
      }
    });
    if (archivedCount === 0) {
      console.log('   ✅ No archived services (or exclusion logic not yet tested)');
    } else {
      console.log(`   ℹ️  ${archivedCount} archived services found`);
    }

    console.log('\n=== VALIDATION COMPLETE ===');
    process.exit(0);
  } catch (err) {
    console.error('Validation failed:', err);
    process.exit(1);
  }
}

runValidation();
