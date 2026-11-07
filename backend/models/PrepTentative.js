const mongoose = require('mongoose');

/** Une réponse vérifiée (§ 28 Tentative). Journal immuable : le serveur recalcule à partir d'ici. */
const PrepTentativeSchema = new mongoose.Schema({
  identite: { type: mongoose.Schema.Types.ObjectId, ref: 'PrepIdentite', required: true, index: true },
  programme: { type: String, required: true },
  module: { type: String, required: true },
  exercice: { type: String, required: true, index: true },
  version: { type: Number, default: 1 },
  niveau: { type: Number, min: 1, max: 3 },
  reponse: { type: mongoose.Schema.Types.Mixed },
  correct: Boolean,
  score: Number,
  points: Number,
  essai: { type: Number, enum: [1, 2], default: 1 },
  indices: { type: Number, default: 0 },
  duree: { type: Number, default: 0 },
  contexte: { type: String, enum: ['niveau', 'revision', 'blanc', 'test', 'lecon'], default: 'niveau' },
  session: { type: String, default: null, index: true },
  jour: { type: String, required: true },
  cleClient: { type: String, default: null }, // idempotence des envois hors ligne
}, { timestamps: true });

PrepTentativeSchema.index({ identite: 1, cleClient: 1 }, { unique: true, partialFilterExpression: { cleClient: { $type: 'string' } } });

module.exports = mongoose.model('PrepTentative', PrepTentativeSchema);
