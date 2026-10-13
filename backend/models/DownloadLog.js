const mongoose = require('mongoose');

const DownloadLogSchema = new mongoose.Schema(
  {
    // Compte, ou identifiant visiteur pour un téléchargement sans compte (sujets gratuits ou quota visiteur).
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    visitor: { type: String, default: null },
    document: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true },
    day: { type: String, required: true },
    ip: String,
    userAgent: String,
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

DownloadLogSchema.index({ user: 1, day: 1, document: 1 });
DownloadLogSchema.index({ day: 1, document: 1 });

// Historique « Mes téléchargements » (tri par date).
DownloadLogSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('DownloadLog', DownloadLogSchema);
