const mongoose = require('mongoose');

/** Compteur journalier de téléchargements ; se réinitialise naturellement (une clé par jour). */
const DownloadCounterSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  day: { type: String, required: true },
  count: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 * 40 },
});

DownloadCounterSchema.index({ user: 1, day: 1 }, { unique: true });

module.exports = mongoose.model('DownloadCounter', DownloadCounterSchema);
