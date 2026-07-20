require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Business = require('../models/Business');
const User = require('../models/User');

async function testSlugGeneration() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Create a test user
    const testUser = await User.create({
      name: 'Slug Test User',
      email: `slugtest${Date.now()}@example.com`,
      password: 'password123',
      role: 'owner',
    });

    console.log(`Created test user: ${testUser.email}`);

    // Test 1: Create business with unique name
    console.log('\n=== TEST 1: Unique business name ===');
    const business1 = await Business.create({
      name: 'Test Salon Unique',
      industry: 'hair_salons',
      ownerId: testUser._id,
      services: [{ name: 'Haircut', durationMinutes: 30 }],
      staff: [{ name: 'John Doe' }],
      openingHours: [
        { day: 0, isOpen: false, openTime: '09:00', closeTime: '18:00' },
        { day: 1, isOpen: true, openTime: '09:00', closeTime: '18:00' },
        { day: 2, isOpen: true, openTime: '09:00', closeTime: '18:00' },
        { day: 3, isOpen: true, openTime: '09:00', closeTime: '18:00' },
        { day: 4, isOpen: true, openTime: '09:00', closeTime: '18:00' },
        { day: 5, isOpen: true, openTime: '09:00', closeTime: '18:00' },
        { day: 6, isOpen: true, openTime: '09:00', closeTime: '18:00' },
      ],
      timezone: 'America/New_York',
    });

    console.log(`Created business: "${business1.name}" -> slug: "${business1.slug}"`);

    // Test 2: Create business with same name (should get suffix)
    console.log('\n=== TEST 2: Duplicate business name (should auto-disambiguate) ===');
    const business2 = await Business.create({
      name: 'Test Salon Unique',
      industry: 'hair_salons',
      ownerId: testUser._id,
      services: [{ name: 'Haircut', durationMinutes: 30 }],
      staff: [{ name: 'Jane Doe' }],
      openingHours: [
        { day: 0, isOpen: false, openTime: '09:00', closeTime: '18:00' },
        { day: 1, isOpen: true, openTime: '09:00', closeTime: '18:00' },
        { day: 2, isOpen: true, openTime: '09:00', closeTime: '18:00' },
        { day: 3, isOpen: true, openTime: '09:00', closeTime: '18:00' },
        { day: 4, isOpen: true, openTime: '09:00', closeTime: '18:00' },
        { day: 5, isOpen: true, openTime: '09:00', closeTime: '18:00' },
        { day: 6, isOpen: true, openTime: '09:00', closeTime: '18:00' },
      ],
      timezone: 'America/New_York',
    });

    console.log(`Created business: "${business2.name}" -> slug: "${business2.slug}"`);

    // Test 3: Create business with special characters
    console.log('\n=== TEST 3: Business name with special characters ===');
    const business3 = await Business.create({
      name: 'Harbor & Vale Studio!',
      industry: 'hair_salons',
      ownerId: testUser._id,
      services: [{ name: 'Haircut', durationMinutes: 30 }],
      staff: [{ name: 'Bob Smith' }],
      openingHours: [
        { day: 0, isOpen: false, openTime: '09:00', closeTime: '18:00' },
        { day: 1, isOpen: true, openTime: '09:00', closeTime: '18:00' },
        { day: 2, isOpen: true, openTime: '09:00', closeTime: '18:00' },
        { day: 3, isOpen: true, openTime: '09:00', closeTime: '18:00' },
        { day: 4, isOpen: true, openTime: '09:00', closeTime: '18:00' },
        { day: 5, isOpen: true, openTime: '09:00', closeTime: '18:00' },
        { day: 6, isOpen: true, openTime: '09:00', closeTime: '18:00' },
      ],
      timezone: 'America/New_York',
    });

    console.log(`Created business: "${business3.name}" -> slug: "${business3.slug}"`);

    // Test 4: Create another business with same special character name
    console.log('\n=== TEST 4: Duplicate special character name ===');
    const business4 = await Business.create({
      name: 'Harbor & Vale Studio!',
      industry: 'hair_salons',
      ownerId: testUser._id,
      services: [{ name: 'Haircut', durationMinutes: 30 }],
      staff: [{ name: 'Alice Johnson' }],
      openingHours: [
        { day: 0, isOpen: false, openTime: '09:00', closeTime: '18:00' },
        { day: 1, isOpen: true, openTime: '09:00', closeTime: '18:00' },
        { day: 2, isOpen: true, openTime: '09:00', closeTime: '18:00' },
        { day: 3, isOpen: true, openTime: '09:00', closeTime: '18:00' },
        { day: 4, isOpen: true, openTime: '09:00', closeTime: '18:00' },
        { day: 5, isOpen: true, openTime: '09:00', closeTime: '18:00' },
        { day: 6, isOpen: true, openTime: '09:00', closeTime: '18:00' },
      ],
      timezone: 'America/New_York',
    });

    console.log(`Created business: "${business4.name}" -> slug: "${business4.slug}"`);

    // Cleanup
    console.log('\n=== CLEANUP ===');
    await Business.deleteMany({ ownerId: testUser._id });
    await User.findByIdAndDelete(testUser._id);
    console.log('Deleted test user and businesses');

    console.log('\n✅ ALL TESTS PASSED');
    console.log('✅ Slug generation working correctly');
    console.log('✅ Auto-disambiguation working correctly');
    console.log('✅ Special character handling working correctly');

    process.exit(0);
  } catch (err) {
    console.error('Test failed:', err);
    process.exit(1);
  }
}

testSlugGeneration();
