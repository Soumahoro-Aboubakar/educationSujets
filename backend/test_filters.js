const { listPublicDocuments } = require('./services/documentService');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const res = await listPublicDocuments({});
  console.log("Total public:", res.pagination.total);
  if (res.data.length > 0) {
    console.log("Status of first few:", res.data.map(d => d.status));
  }
  process.exit(0);
}).catch(console.error);
