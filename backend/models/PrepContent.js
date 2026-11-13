const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  kind: { type: String, enum: ['programme', 'module'], required: true },
  code: { type: String, required: true },
  revision: { type: Number, required: true, min: 1 },
  schemaVersion: { type: Number, default: 1 },
  status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft' },
  payload: { type: mongoose.Schema.Types.Mixed, required: true },
  hash: { type: String, required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  publishedAt: Date,
}, { timestamps: true });
schema.index({ kind: 1, code: 1, revision: 1 }, { unique: true });
schema.index({ kind: 1, status: 1, updatedAt: -1, _id: 1 });
module.exports = mongoose.model('PrepContent', schema);
