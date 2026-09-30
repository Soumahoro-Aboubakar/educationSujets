const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/api');
const admin = require('../services/admin/adminService');

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
