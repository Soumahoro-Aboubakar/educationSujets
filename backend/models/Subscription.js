const mongoose = require('mongoose');

/**
 * Une souscription par utilisateur. Le statut (ACTIVE/EXPIRED…) n'est pas stocké :
 * il est dérivé de `currentPeriodEnd` par services/billing/pricing.js.
 */
const SubscriptionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    accessState: { type: String, enum: ['enabled', 'suspended', 'revoked'], default: 'enabled' },
    accessVersion: { type: Number, default: 0 },
    accessChangedAt: { type: Date, default: null },
    accessReason: { type: String, maxlength: 500 },
    accessChangedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    // Date du dernier paiement initial : ouvre le cycle annuel en cours.
    cycleStart: { type: Date, default: null },
    // Fin de l'accès payé.
    currentPeriodEnd: { type: Date, default: null },
    firstActivatedAt: { type: Date, default: null },
    // Paiements déjà appliqués : garantit qu'un paiement ne prolonge jamais l'accès deux fois.
    appliedPayments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Payment' }],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Subscription', SubscriptionSchema);
