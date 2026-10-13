const mongoose = require('mongoose');

/**
 * Téléchargement groupé préparé : sélection validée, quota réservé, lien à usage unique.
 * Le jeton n'est stocké que haché. Expiration automatique (TTL) ; une réservation non servie
 * sort d'elle-même du quota (voir models/DownloadQuota.js).
 */
const DownloadBundleSchema = new mongoose.Schema(
  {
    tokenHash: { type: String, required: true, unique: true },
    op: { type: String, required: true },
    // Quotas sur lesquels les sujets récents ont été réservés (confirmés ou rendus à la fin).
    subjects: [{ type: String }],
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    visitor: { type: String, default: null },
    documents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Document' }],
    recentDocuments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Document' }],
    label: { type: String, default: 'sujets' },
    delivery: { type: String, enum: ['zip', 'files'], default: 'zip' },
    status: { type: String, enum: ['ready', 'streaming', 'done', 'failed'], default: 'ready' },
    delivered: { type: Number, default: 0 },
    missing: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Document' }],
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

// Conservé une journée après expiration (diagnostic), puis supprimé.
DownloadBundleSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 24 * 60 * 60 });

module.exports = mongoose.model('DownloadBundle', DownloadBundleSchema);
