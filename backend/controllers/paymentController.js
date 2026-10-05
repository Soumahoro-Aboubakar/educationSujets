const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/api');
const paymentService = require('../services/payments/paymentService');

exports.getPlans = asyncHandler(async (req, res) => {
  sendSuccess(res, { data: await paymentService.getPublicPlans() });
});

exports.quote = asyncHandler(async (req, res) => {
  sendSuccess(res, { data: await paymentService.quote(req.user, req.body.promoCode) });
});

// Seuls ces champs sont lus : montant, utilisateur, statut ou référence envoyés par le client
// sont ignorés (le serveur est la seule source de vérité du paiement).
const INITIATE_FIELDS = ['method', 'phone', 'promoCode', 'channel', 'returnUrl', 'attemptId'];

exports.initiate = asyncHandler(async (req, res) => {
  const payload = Object.fromEntries(INITIATE_FIELDS.map((field) => [field, req.body[field]]));
  // En-tête standard Idempotency-Key accepté à la place de attemptId.
  if (!payload.attemptId && req.get('idempotency-key')) payload.attemptId = req.get('idempotency-key');
  const result = await paymentService.initiatePayment(req.user, payload);
  sendSuccess(res, { statusCode: 201, message: 'Paiement initié', data: result });
});

exports.getPayment = asyncHandler(async (req, res) => {
  sendSuccess(res, { data: await paymentService.getMyPayment(req.user, req.params.id) });
});

exports.cancel = asyncHandler(async (req, res) => {
  sendSuccess(res, { data: await paymentService.cancelMyPayment(req.user, req.params.id) });
});

// Réponse volontairement minimale : rien sur l'état interne n'est renvoyé à l'appelant.
exports.webhook = asyncHandler(async (req, res) => {
  await paymentService.handleWebhook(req.params.provider, req);
  res.status(200).json({ received: true });
});
