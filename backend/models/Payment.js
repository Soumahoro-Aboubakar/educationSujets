const mongoose = require('mongoose');

const PAYMENT_STATUSES = ['INITIATED', 'PENDING', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'EXPIRED'];
const OPEN_STATUSES = ['INITIATED', 'PENDING'];

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
    phone: { type: String, select: false },
    channel: { type: String, enum: ['web', 'mobile'], default: 'web' },
    status: { type: String, enum: PAYMENT_STATUSES, default: 'INITIATED', index: true },
    provider: { type: String, required: true },
    providerRef: { type: String, unique: true, sparse: true },
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

PaymentSchema.statics.STATUSES = PAYMENT_STATUSES;
PaymentSchema.statics.OPEN_STATUSES = OPEN_STATUSES;

module.exports = mongoose.model('Payment', PaymentSchema);
