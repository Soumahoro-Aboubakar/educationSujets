const mongoose = require('mongoose');

/**
 * Abonnement aux notifications web (PWA : Android, ordinateur, iPhone avec l'app installée).
 * Un abonnement = un navigateur d'un compte ; supprimé quand le service push le déclare expiré.
 */
const PushSubscriptionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  endpoint: { type: String, required: true, unique: true, maxlength: 1000 },
  keys: {
    p256dh: { type: String, required: true, maxlength: 200 },
    auth: { type: String, required: true, maxlength: 100 },
  },
  programme: { type: String, default: null, maxlength: 60 },
  rappels: { type: Boolean, default: true },
  dernierEnvoi: { type: String, default: null }, // jour (AAAA-MM-JJ) du dernier rappel, contre les doublons
  echecs: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.models.PushSubscription || mongoose.model('PushSubscription', PushSubscriptionSchema);
