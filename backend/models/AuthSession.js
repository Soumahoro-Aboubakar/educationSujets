const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  sid: { type: String, required: true, unique: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  platform: { type: String, enum: ['web', 'mobile', 'unknown'], default: 'unknown' },
  refreshHash: { type: String, required: true, select: false },
  tokenVersion: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true },
  revokedAt: { type: Date, default: null },
}, { timestamps: true });
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
module.exports = mongoose.model('AuthSession', schema);
