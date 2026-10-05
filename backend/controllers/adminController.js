const asyncHandler = require('../utils/asyncHandler');
const abuseTracker = require('../services/security/abuseTracker');
const securityLog = require('../services/security/securityLogger');
const { sendSuccess } = require('../utils/api');
const admin = require('../services/admin/adminService');
const paymentMethods = require('../services/payments/paymentMethodService');

exports.getStats = asyncHandler(async (req, res) => sendSuccess(res, { data: await admin.getStats() }));

exports.listUsers = asyncHandler(async (req, res) => {
  const result = await admin.listUsers(req.query);
  sendSuccess(res, { data: result.data, meta: { pagination: result.pagination } });
});

exports.getUser = asyncHandler(async (req, res) => sendSuccess(res, { data: await admin.getUserDetails(req.params.id) }));

exports.createUser = asyncHandler(async (req, res) => {
  sendSuccess(res, { statusCode: 201, message: 'Utilisateur créé', data: await admin.createUser(req.body, req.user) });
});

exports.updateUser = asyncHandler(async (req, res) => {
  sendSuccess(res, { message: 'Utilisateur mis à jour', data: await admin.updateUser(req.params.id, req.body, req.user) });
});

exports.resetPassword = asyncHandler(async (req, res) => {
  sendSuccess(res, { message: 'Mot de passe réinitialisé', data: await admin.resetPassword(req.params.id, req.user) });
});

exports.overridePromoCode = asyncHandler(async (req, res) => {
  const override = req.body.override || null;
  sendSuccess(res, { message: 'Code mis à jour', data: await admin.overridePromoCode(req.params.id, override, req.body.note, req.user) });
});

exports.listPayments = asyncHandler(async (req, res) => {
  const result = await admin.listPayments(req.query);
  sendSuccess(res, { data: result.data, meta: { pagination: result.pagination } });
});

exports.listCommissions = asyncHandler(async (req, res) => {
  const result = await admin.listCommissions(req.query);
  sendSuccess(res, { data: result.data, meta: { pagination: result.pagination } });
});

exports.listWithdrawals = asyncHandler(async (req, res) => {
  const result = await admin.listWithdrawals(req.query);
  sendSuccess(res, { data: result.data, meta: { pagination: result.pagination } });
});

exports.processWithdrawal = asyncHandler(async (req, res) => {
  sendSuccess(res, { message: 'Retrait mis à jour', data: await admin.processWithdrawal(req.params.id, req.body, req.user) });
});

exports.listPaymentMethods = asyncHandler(async (req, res) => sendSuccess(res, { data: await paymentMethods.adminList() }));

exports.createPaymentMethod = asyncHandler(async (req, res) => {
  sendSuccess(res, { statusCode: 201, message: 'Moyen de paiement ajouté', data: await paymentMethods.adminCreate(req.body, req.user) });
});

exports.updatePaymentMethod = asyncHandler(async (req, res) => {
  sendSuccess(res, { message: 'Moyen de paiement mis à jour', data: await paymentMethods.adminUpdate(req.params.code, req.body, req.user) });
});

exports.getSecurityOverview = asyncHandler(async (req, res) => sendSuccess(res, { data: abuseTracker.snapshot() }));

// Levée manuelle d'un blocage (faux positif : IP d'école, réseau d'entreprise…).
exports.liftSecurityBlock = asyncHandler(async (req, res) => {
  const removed = abuseTracker.unblock(req.params.type, req.params.value);
  securityLog.info('abuse.unblocked', { userId: req.user._id, reason: `${req.params.type}:${removed ? 'lifted' : 'none'}` });
  sendSuccess(res, { message: removed ? 'Blocage levé' : 'Aucun blocage actif', data: { removed } });
});
