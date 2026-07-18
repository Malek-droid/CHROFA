require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Business = require('../models/Business');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const businesses = await Business.find({}, { industry: 1, name: 1 });
  console.log('Existing businesses:');
  businesses.forEach(b => console.log(`- ${b.name}: ${b.industry}`));
  console.log(`\nTotal: ${businesses.length}`);
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
