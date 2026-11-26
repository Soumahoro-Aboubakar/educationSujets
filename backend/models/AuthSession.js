const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  sid: { type: String, required: true, unique: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  platform: { type: String, enum: ['web', 'mobile', 'unknown'], default: 'unknown' },
  refreshHash: { type: String, required: true, select: false },
  tokenVersion: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true },
  revokedAt: { type: Date, default: null },
  // Libellé minimal pour la page « Mes appareils » (type d’appareil et navigateur, jamais l’adresse IP).
  appareil: { type: String, trim: true, maxlength: 80, default: '' },
  dernierUsageAt: { type: Date, default: null },
  // Motif de fermeture : déconnexion, limite de sessions, révocation par l’utilisateur…
  revokedReason: { type: String, trim: true, maxlength: 40, default: null },
}, { timestamps: true });
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
schema.index({ user: 1, revokedAt: 1, expiresAt: 1 });
module.exports = mongoose.model('AuthSession', schema);
