require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Business = require('../models/Business');

async function checkIndexes() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const businessCollection = mongoose.connection.db.collection('businesses');
    const indexes = await businessCollection.indexes();
    
    console.log('\n=== BUSINESS COLLECTION INDEXES ===\n');
    indexes.forEach((idx, i) => {
      console.log(`Index ${i + 1}:`);
      console.log(`  Name: ${idx.name}`);
      console.log(`  Keys: ${JSON.stringify(idx.key)}`);
      console.log(`  Unique: ${idx.unique || false}`);
      console.log(`  Sparse: ${idx.sparse || false}`);
      console.log('');
    });

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

checkIndexes();
