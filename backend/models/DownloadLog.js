const mongoose = require('mongoose');

const DownloadLogSchema = new mongoose.Schema(
  {
    // Compte, ou identifiant visiteur pour un téléchargement sans compte (sujets gratuits ou quota visiteur).
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    visitor: { type: String, default: null },
    document: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true },
    // Type d'accès : 'free' (<= 2009), 'free_quota' (quota gratuit 2010-2020), 'subscription', 'staff'.
    // null : journal antérieur à ce suivi.
    access: { type: String, enum: ['free', 'free_quota', 'subscription', 'staff', null], default: null },
    // Ce téléchargement a consommé une unité de quota (false : document déjà accordé, re-téléchargement).
    charged: { type: Boolean, default: false },
    // Année et organisme au moment du téléchargement (filtres de l'administration).
    year: { type: Number, default: null },
    organisme: { type: mongoose.Schema.Types.ObjectId, ref: 'Organisme', default: null },
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

// Administration : téléchargements gratuits par date.
DownloadLogSchema.index({ access: 1, createdAt: -1 });

module.exports = mongoose.model('DownloadLog', DownloadLogSchema);
