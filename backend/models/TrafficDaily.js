const mongoose = require('mongoose');

/*
 * Provenance des visites, agrégée par jour (UTC = heure d'Abidjan) : seulement des compteurs.
 * Aucune adresse IP, aucun identifiant, aucune adresse de page complète n'est enregistré.
 */
const TrafficDailySchema = new mongoose.Schema({
  day: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  source: { type: String, required: true, maxlength: 60 },
  category: { type: String, required: true, maxlength: 20 },
  section: { type: String, required: true, enum: ['accueil', 'sujets', 'preparation', 'abonnement', 'autre'] },
  visits: { type: Number, default: 0, min: 0 },
  signups: { type: Number, default: 0, min: 0 },
}, { versionKey: false });

TrafficDailySchema.index({ day: 1, source: 1, section: 1 }, { unique: true });

module.exports = mongoose.model('TrafficDaily', TrafficDailySchema);
