const mongoose = require('mongoose');

/**
 * Moyen de paiement proposé aux abonnés. Configuration centrale partagée par le web et le
 * mobile : l'administrateur l'active ou la désactive, et le serveur refuse toute initiation
 * avec un moyen désactivé, même si l'interface est contournée.
 */
const PaymentMethodSchema = new mongoose.Schema(
  {
    // Valeur transmise au fournisseur (paramètre `payment_method` de GeniusPay).
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: /^[a-z0-9_]{2,40}$/,
    },
    label: { type: String, required: true, trim: true, maxlength: 60 },
    enabled: { type: Boolean, default: false },
    // Faux pour les moyens sans numéro (carte bancaire) : le client saisit ses informations chez le fournisseur.
    requiresPhone: { type: Boolean, default: true },
    logoUrl: { type: String, trim: true, maxlength: 500, default: null },
    // Routage chez le fournisseur : `payment_method` et code opérateur PawaPay (`mmo_provider`).
    gatewayMethod: { type: String, trim: true, lowercase: true, match: /^[a-z0-9_]{2,40}$/ },
    mmoProvider: { type: String, trim: true, uppercase: true, match: /^[A-Z0-9_]{2,40}$/, default: null },
    // 'redirect' : page de paiement du fournisseur ; 'push' : validation sur le téléphone.
    flow: { type: String, enum: ['redirect', 'push'], default: 'redirect' },
    // Étapes de confirmation montrées après l'initiation (ex. « Composez #120# »).
    confirmSteps: { type: [{ type: String, trim: true, maxlength: 120 }], default: undefined },
    sortOrder: { type: Number, default: 100 },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

PaymentMethodSchema.index({ enabled: 1, sortOrder: 1 });

module.exports = mongoose.model('PaymentMethod', PaymentMethodSchema);
