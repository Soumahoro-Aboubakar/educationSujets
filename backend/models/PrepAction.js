const mongoose = require('mongoose');

/**
 * Journal des actions de préparation reçues (lot 5) : déduplication de TOUTES les actions
 * (tentatives, leçons, minutes, sessions, blancs, reprise…) et reprise d'un traitement interrompu.
 * Ce n'est pas une seconde source de vérité : l'apprentissage reste dans PrepProgression.
 *
 * Cycle : « reserve » (reçue, en cours) → « applique » ou « rejete » (résultat conservé, renvoyé
 * tel quel en cas de rejeu). Une action restée « reserve » après un crash est retraitée ; le
 * marqueur `appliquees` de la progression, écrit dans la même écriture que l'état, évite toute
 * double application. Les entrées ne sont pas purgées : une file cliente peut encore les rejouer.
 */
const PrepActionSchema = new mongoose.Schema({
  identite: { type: mongoose.Schema.Types.ObjectId, ref: 'PrepIdentite', required: true },
  cle: { type: String, required: true, maxlength: 80 },
  programme: { type: String, default: null },
  type: { type: String, required: true, maxlength: 20 },
  appareil: { type: String, default: null, maxlength: 80 },
  sequence: { type: Number, default: null },
  contentRevision: { type: Number, default: null },
  statut: { type: String, enum: ['reserve', 'applique', 'rejete'], default: 'reserve' },
  resultat: { type: mongoose.Schema.Types.Mixed, default: null },
}, { timestamps: true });

PrepActionSchema.index({ identite: 1, cle: 1 }, { unique: true });
PrepActionSchema.index({ identite: 1, statut: 1, createdAt: 1 });

module.exports = mongoose.model('PrepAction', PrepActionSchema);
