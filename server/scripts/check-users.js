require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const User = require('../models/User');
const Business = require('../models/Business');

async function checkUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const users = await User.find({}, { name: 1, email: 1, businessId: 1, _id: 0 });
    console.log(`\nTotal users: ${users.length}\n`);

    users.forEach(u => {
      console.log(`User: "${u.name}" (${u.email}) -> businessId: ${u.businessId || 'null'}`);
    });

    // Check for users without businessId
    const noBusiness = users.filter(u => !u.businessId);
    console.log(`\nUsers without businessId: ${noBusiness.length}`);

    // Check for orphaned businesses (no user references)
    const businesses = await Business.find({}, { _id: 1, ownerId: 1, name: 1 });
    const orphaned = [];
    for (const b of businesses) {
      const user = await User.findOne({ businessId: b._id });
      if (!user) {
        orphaned.push(b);
      }
    }
    console.log(`\nOrphaned businesses (no user reference): ${orphaned.length}`);
    orphaned.forEach(b => {
      console.log(`  "${b.name}" (ID: ${b._id})`);
    });

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

checkUsers();
