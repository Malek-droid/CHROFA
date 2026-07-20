require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Business = require('../models/Business');

async function checkSlugs() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const businesses = await Business.find({}, { name: 1, slug: 1, _id: 0 });
    console.log(`\nTotal businesses: ${businesses.length}\n`);

    businesses.forEach(b => {
      console.log(`Name: "${b.name}" -> Slug: ${b.slug || 'null'}`);
    });

    // Check for any null slugs
    const nullSlugs = businesses.filter(b => !b.slug);
    console.log(`\nBusinesses with null slug: ${nullSlugs.length}`);

    // Check for duplicate slugs
    const slugCounts = {};
    businesses.forEach(b => {
      if (b.slug) {
        slugCounts[b.slug] = (slugCounts[b.slug] || 0) + 1;
      }
    });

    const duplicates = Object.entries(slugCounts).filter(([slug, count]) => count > 1);
    if (duplicates.length > 0) {
      console.log('\nDuplicate slugs found:');
      duplicates.forEach(([slug, count]) => {
        console.log(`  "${slug}": ${count} occurrences`);
      });
    } else {
      console.log('\nNo duplicate slugs found');
    }

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

checkSlugs();
