require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Institution = require('../models/Institution');

const institutions = [
  { name: 'ENA', navigationStructure: ['cycle', 'year', 'subject'] },
  { name: 'INP-HB', navigationStructure: ['contest', 'year', 'subject'] },
  { name: 'EAMAC', navigationStructure: ['year', 'subject'] },
];

const seed = async () => {
  await connectDB();
  for (const item of institutions) {
    await Institution.findOneAndUpdate(
      { normalizedName: item.name.toLowerCase() },
      { $set: item, $setOnInsert: { normalizedName: item.name.toLowerCase() } },
      { upsert: true, new: true }
    );
  }
  console.log('Institutions de reference synchronisees.');
  await mongoose.disconnect();
};

seed().catch(async (error) => {
  console.error('Seed echoue:', error);
  await mongoose.disconnect();
  process.exitCode = 1;
});
