const mongoose = require('mongoose');

/**
 * Trace des webhooks reçus. L'index unique sur (provider, eventId) rend la réception
 * idempotente : un événement renvoyé plusieurs fois n'est traité qu'une seule fois.
 * Aucun contenu brut n'est conservé (ni signature, ni données client).
 */
const PaymentWebhookEventSchema = new mongoose.Schema(
  {
    provider: { type: String, required: true },
    eventId: { type: String, required: true },
    event: { type: String },
    reference: { type: String, index: true },
    environment: { type: String },
    payment: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', default: null },
    outcome: { type: String },
  },
  { timestamps: true }
);

PaymentWebhookEventSchema.index({ provider: 1, eventId: 1 }, { unique: true });
// Les traces n'ont plus d'utilité au-delà de 90 jours.
PaymentWebhookEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 3600 });

module.exports = mongoose.model('PaymentWebhookEvent', PaymentWebhookEventSchema);
