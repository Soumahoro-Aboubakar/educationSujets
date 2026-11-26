const mongoose = require('mongoose');

/*
 * Échecs de connexion par adresse e-mail, toutes IP confondues, conservés en base : ils survivent
 * aux redémarrages et sont partagés entre instances. L'adresse n'est pas stockée en clair
 * (empreinte seulement) et une adresse inconnue est suivie comme une autre : un verrouillage ne
 * révèle donc pas l'existence d'un compte. Purge automatique 24 h après la dernière activité.
 */
const LoginGuardSchema = new mongoose.Schema({
  emailHash: { type: String, required: true, unique: true },
  // Échecs consécutifs depuis le dernier verrouillage (remis à zéro par une connexion réussie).
  failures: { type: Number, default: 0, min: 0 },
  // Nombre de verrouillages déjà subis : chaque récidive double la durée.
  lockCount: { type: Number, default: 0, min: 0 },
  lockedUntil: { type: Date, default: null },
  expiresAt: { type: Date, required: true },
}, { versionKey: false });

LoginGuardSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('LoginGuard', LoginGuardSchema);
