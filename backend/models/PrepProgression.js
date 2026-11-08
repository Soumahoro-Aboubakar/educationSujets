const mongoose = require('mongoose');

/**
 * Progression d'une identité dans un programme (§ 28 Progression, CarteRevision, ResultatBlanc,
 * StatsClassement). L'état complet (`etat`) a la forme produite par les réducteurs partagés de
 * services/prep/shared/prepCore.js, identiques sur le mobile : le serveur recalcule, il fait foi.
 * Les champs dénormalisés (score, compteurs publics) servent au classement et sont indexés.
 */
const PrepProgressionSchema = new mongoose.Schema({
  identite: { type: mongoose.Schema.Types.ObjectId, ref: 'PrepIdentite', required: true },
  programme: { type: String, required: true },
  etat: { type: mongoose.Schema.Types.Mixed, default: {} },
  score: { type: Number, default: 0 },
  scoreSemainePrecedente: { type: Number, default: null },
  rangSemainePrecedente: { type: Number, default: null },
  semaineReference: { type: String, default: null },
  stats: { type: mongoose.Schema.Types.Mixed, default: {} },
  matieresFortes: { type: [String], default: [] },
  derniereActivite: { type: Date, default: null },
}, { timestamps: true, minimize: false });

PrepProgressionSchema.index({ identite: 1, programme: 1 }, { unique: true });
// L'ordre de curseur est couvert ; derniereActivite en suffixe permet de filtrer les périodes
// tout en conservant l'ordre. L'index de date sert aux totaux des périodes sélectives.
PrepProgressionSchema.index({ programme: 1, score: -1, _id: 1, derniereActivite: 1 });
PrepProgressionSchema.index({ programme: 1, derniereActivite: 1, score: -1 });

module.exports = mongoose.model('PrepProgression', PrepProgressionSchema);
