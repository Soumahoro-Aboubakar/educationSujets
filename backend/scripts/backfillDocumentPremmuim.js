const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const connectDB = require('../config/db');
const Document = require('../models/Document');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const run = async () => {
  await connectDB();

  const result = await Document.updateMany(
    { isPremmuim: { $exists: false } },
    { $set: { isPremmuim: false } }
  );

  console.log(`Documents mis a jour: ${result.modifiedCount || 0}`);
  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
