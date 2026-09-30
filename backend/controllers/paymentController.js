const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/api');
const paymentService = require('../services/payments/paymentService');

exports.getPlans = asyncHandler(async (req, res) => {
  sendSuccess(res, { data: paymentService.getPublicPlans() });
});

exports.quote = asyncHandler(async (req, res) => {
  sendSuccess(res, { data: await paymentService.quote(req.user, req.body.promoCode) });
});

exports.initiate = asyncHandler(async (req, res) => {
  const result = await paymentService.initiatePayment(req.user, req.body);
  sendSuccess(res, { statusCode: 201, message: 'Paiement initié', data: result });
});

exports.getPayment = asyncHandler(async (req, res) => {
  sendSuccess(res, { data: await paymentService.getMyPayment(req.user, req.params.id) });
});

exports.cancel = asyncHandler(async (req, res) => {
  sendSuccess(res, { data: await paymentService.cancelMyPayment(req.user, req.params.id) });
});

exports.webhook = asyncHandler(async (req, res) => {
  await paymentService.handleWebhook(req.params.provider, req);
  res.status(200).json({ received: true });
});
