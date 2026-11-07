const mongoose = require('mongoose');

/** Signalement d'un contenu ou d'un verdict IA → file de relecture (§ 11.11, § 13.2, § 26.2 étape 8). */
const PrepSignalementSchema = new mongoose.Schema({
  identite: { type: mongoose.Schema.Types.ObjectId, ref: 'PrepIdentite', required: true },
  element: { type: String, required: true, trim: true, maxlength: 80 },
  motif: { type: String, enum: ['enonce', 'reponse', 'verdict', 'pseudonyme', 'autre'], required: true },
  texte: { type: String, trim: true, maxlength: 1000, default: '' },
  statut: { type: String, enum: ['ouvert', 'traite', 'rejete'], default: 'ouvert', index: true },
}, { timestamps: true });

module.exports = mongoose.model('PrepSignalement', PrepSignalementSchema);
