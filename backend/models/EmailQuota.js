const mongoose = require('mongoose');

/*
 * Nombre d'e-mails envoyés à une adresse sur une journée (UTC = heure d'Abidjan), tous types
 * confondus. L'adresse n'est pas stockée en clair : empreinte seulement. Purge après 3 jours.
 */
const EmailQuotaSchema = new mongoose.Schema({
  emailHash: { type: String, required: true },
  day: { type: String, required: true },
  count: { type: Number, default: 0, min: 0 },
  expiresAt: { type: Date, required: true },
}, { versionKey: false });

EmailQuotaSchema.index({ emailHash: 1, day: 1 }, { unique: true });
EmailQuotaSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('EmailQuota', EmailQuotaSchema);
