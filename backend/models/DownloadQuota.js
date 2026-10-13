const mongoose = require('mongoose');

/**
 * Quota glissant de téléchargements de sujets récents, un document par « sujet » de quota :
 *   u:<userId> (compte), v:<visitorId> (visiteur anonyme), ip:<adresse> (garde-fou anonyme).
 *
 * Chaque téléchargement récent est un « droit » daté ; il sort du calcul `windowHours` heures
 * après avoir été accordé (fenêtre glissante, dates serveur en UTC). Un droit `reserved` (archive
 * en préparation) compte jusqu'à `reservedUntil`, puis disparaît s'il n'a pas été confirmé.
 * Toute écriture passe par un filtre sur `version` (concurrence optimiste) : deux requêtes
 * simultanées ne peuvent pas dépasser la limite.
 */
const GrantSchema = new mongoose.Schema(
  {
    document: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true },
    grantedAt: { type: Date, required: true },
    status: { type: String, enum: ['reserved', 'consumed'], default: 'consumed' },
    reservedUntil: { type: Date, default: null },
    // Opération qui a accordé le droit (archive, téléchargement unitaire) : annulation ciblée.
    op: { type: String, default: null },
  },
  { _id: false }
);

const DownloadQuotaSchema = new mongoose.Schema(
  {
    subject: { type: String, required: true, unique: true },
    grants: { type: [GrantSchema], default: [] },
    version: { type: Number, default: 0 },
    // Purge automatique des quotas inactifs (TTL), bien après la fin de la fenêtre.
    expiresAt: { type: Date, default: null },
  },
  { timestamps: true }
);

DownloadQuotaSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('DownloadQuota', DownloadQuotaSchema);
