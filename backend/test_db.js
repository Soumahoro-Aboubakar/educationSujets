const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/fatafalta').then(async () => {
  const db = mongoose.connection.db;
  const docs = await db.collection('documents').find({}).toArray();
  console.log(`Total documents: ${docs.length}`);
  const approvedDocs = docs.filter(d => d.status === 'approved');
  console.log(`Approved documents: ${approvedDocs.length}`);
  console.log(`Approved without documentType: ${approvedDocs.filter(d => !d.documentType).length}`);
  console.log(`Approved with documentType='sujet': ${approvedDocs.filter(d => d.documentType === 'sujet').length}`);
  process.exit(0);
}).catch(console.error);
