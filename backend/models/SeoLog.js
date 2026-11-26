const mongoose = require('mongoose');

/*
 * Journal du service d'indexation : événements de contenu, versions détectées, reconstructions,
 * envois IndexNow, appels Google et erreurs. Purgé automatiquement après 180 jours.
 * Aucune donnée personnelle : seulement des URL publiques, des compteurs et des codes HTTP.
 */
const SeoLogSchema = new mongoose.Schema({
  at: { type: Date, default: Date.now },
  type: {
    type: String,
    required: true,
    enum: ['evenement', 'reconstruction', 'version', 'indexnow', 'google', 'erreur', 'action'],
  },
  source: { type: String, default: null, maxlength: 80 },
  message: { type: String, default: null, maxlength: 500 },
  status: { type: Number, default: null },
  ok: { type: Boolean, default: null },
  count: { type: Number, default: null },
  urls: { type: [String], default: undefined },
  durationMs: { type: Number, default: null },
  expiresAt: { type: Date, default: () => new Date(Date.now() + 180 * 86400000) },
}, { versionKey: false });

SeoLogSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
SeoLogSchema.index({ type: 1, at: -1 });
SeoLogSchema.index({ at: -1 });

module.exports = mongoose.model('SeoLog', SeoLogSchema);
