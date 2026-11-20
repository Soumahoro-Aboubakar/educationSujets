const mongoose = require('mongoose');

/*
 * Code à usage unique envoyé par e-mail (vérification d'adresse, mot de passe oublié).
 * Seule une empreinte HMAC est stockée ; le document disparaît seul après expiration.
 */
const EmailCodeSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  purpose: { type: String, enum: ['verify', 'reset'], required: true },
  codeHash: { type: String, required: true },
  attempts: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true },
}, { timestamps: true, versionKey: false });

EmailCodeSchema.index({ user: 1, purpose: 1 }, { unique: true });
EmailCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('EmailCode', EmailCodeSchema);
