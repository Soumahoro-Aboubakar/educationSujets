const mongoose = require('mongoose');

// PROCESSING : le fournisseur traite la transaction (statut `processing` de GeniusPay).
const PAYMENT_STATUSES = ['INITIATED', 'PENDING', 'PROCESSING', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'EXPIRED'];
const OPEN_STATUSES = ['INITIATED', 'PENDING', 'PROCESSING'];

const PaymentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    kind: { type: String, enum: ['initial', 'monthly'], required: true },
    currency: { type: String, default: 'XOF' },
    // Montants calculés exclusivement par le serveur (pricing.quoteNextPayment).
    baseAmount: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    amount: { type: Number, required: true, min: 0 },
    method: { type: String, required: true },
    // Libellé figé à l'initiation : l'historique reste lisible même si le moyen est renommé ou supprimé.
    methodLabel: { type: String },
    phone: { type: String, select: false },
    channel: { type: String, enum: ['web', 'mobile'], default: 'web' },
    status: { type: String, enum: PAYMENT_STATUSES, default: 'INITIATED', index: true },
    provider: { type: String, required: true },
    providerRef: { type: String, unique: true, sparse: true },
    // Dernier statut brut connu chez le fournisseur et environnement de la transaction (sandbox/live).
    providerStatus: { type: String },
    providerEnvironment: { type: String },
    // Page de paiement du fournisseur, pour reprendre un paiement interrompu.
    redirectUrl: { type: String },
    // Parcours présenté à l'abonné ('redirect' ou 'push') et numéro masqué (ex. 07 •• •• •• 04).
    flow: { type: String, enum: ['redirect', 'push'] },
    phoneHint: { type: String },
    // Étapes de confirmation propres à l'opérateur de CETTE tentative (copiées à l'initiation).
    confirmSteps: { type: [String], default: undefined },
    // Identifiant de tentative fourni par le client : rejouer la même requête (double clic,
    // réseau) renvoie la même transaction au lieu d'en créer une seconde.
    attemptId: { type: String },
    promoCode: { type: mongoose.Schema.Types.ObjectId, ref: 'PromoCode', default: null },
    referrer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    // Renseigné tant que le paiement est ouvert : l'index unique empêche deux paiements
    // simultanés pour un même utilisateur (double clic, double onglet, mobile + web).
    openFor: { type: mongoose.Schema.Types.ObjectId, default: undefined },
    expiresAt: { type: Date },
    failureReason: { type: String },
    fulfilledAt: { type: Date, default: null },
    periodStart: { type: Date },
    periodEnd: { type: Date },
    statusHistory: [{ status: String, at: { type: Date, default: Date.now }, note: String }],
  },
  { timestamps: true }
);

PaymentSchema.index({ openFor: 1 }, { unique: true, sparse: true });
PaymentSchema.index({ createdAt: -1 });
// Historique et plafonds de tentatives par utilisateur ; rejeu d'une même tentative.
PaymentSchema.index({ user: 1, createdAt: -1 });
PaymentSchema.index({ user: 1, attemptId: 1, createdAt: -1 }, { partialFilterExpression: { attemptId: { $type: 'string' } } });
// Réconciliation des paiements ouverts.
PaymentSchema.index({ status: 1, createdAt: 1 });

PaymentSchema.statics.STATUSES = PAYMENT_STATUSES;
PaymentSchema.statics.OPEN_STATUSES = OPEN_STATUSES;

module.exports = mongoose.model('Payment', PaymentSchema);
