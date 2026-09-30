const mongoose = require('mongoose');

/**
 * Code de passage mobile → web, à usage unique et de courte durée. Il permet d'ouvrir la
 * souscription web depuis l'application sans ressaisir ses identifiants. Seul le hash est stocké.
 */
const AuthHandoffSchema = new mongoose.Schema({
  codeHash: { type: String, required: true, unique: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  expiresAt: { type: Date, required: true, expires: 0 },
});

module.exports = mongoose.model('AuthHandoff', AuthHandoffSchema);
