const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/api');
const sessions = require('../services/auth/sessionService');
const codes = require('../services/auth/emailCodeService');
const securityLog = require('../services/security/securityLogger');
const loginGuard = require('../services/security/loginGuard');
const { clientIp } = require('../utils/request');

/*
 * Vérification d'adresse e-mail et mot de passe oublié, par code à 6 chiffres (site web).
 * Au plus 3 e-mails par adresse et par jour ; au-delà, réponse 429 EMAIL_DAILY_LIMIT.
 */

// POST /api/auth/email/send-verification (connecté)
exports.sendVerification = asyncHandler(async (req, res) => {
  res.set('Cache-Control', 'private, no-store');
  if (req.user.isVerified) return sendSuccess(res, { data: { alreadyVerified: true } });
  const quota = await codes.issueCode({ email: req.user.email, user: req.user, purpose: 'verify' });
  return sendSuccess(res, { message: 'Code envoyé', data: { sent: true, remaining: quota.remaining, limit: quota.limit } });
});

// POST /api/auth/email/verify { code } (connecté)
exports.verifyEmail = asyncHandler(async (req, res) => {
  res.set('Cache-Control', 'private, no-store');
  if (!req.user.isVerified) {
    await codes.consumeCode({ user: req.user, purpose: 'verify', code: req.body.code });
    await User.updateOne({ _id: req.user._id }, { $set: { isVerified: true } });
    securityLog.info('auth.email_verified', { requestId: req.id, userId: req.user._id });
  }
  return sendSuccess(res, { message: 'Adresse e-mail vérifiée', data: { verified: true } });
});

// GET /api/auth/email/quota (connecté) : envois restants aujourd'hui.
exports.quota = asyncHandler(async (req, res) => {
  res.set('Cache-Control', 'private, no-store');
  sendSuccess(res, { data: { remaining: await codes.remainingToday(req.user.email), verified: Boolean(req.user.isVerified) } });
});

// POST /api/auth/password/forgot { email } — même réponse que le compte existe ou non.
exports.forgotPassword = asyncHandler(async (req, res) => {
  res.set('Cache-Control', 'private, no-store');
  const email = codes.normalize(req.body.email);
  const user = await User.findOne({ email }).select('_id name email accountStatus');
  const usable = user && (!user.accountStatus || user.accountStatus === 'ACTIVE');
  const quota = await codes.issueCode({ email, user: usable ? user : null, purpose: 'reset' });
  securityLog.info('auth.password_reset_requested', { requestId: req.id, ip: clientIp(req), emailHash: securityLog.hashEmail(email), known: Boolean(usable) });
  sendSuccess(res, {
    message: 'Si un compte existe avec cette adresse, un code vient d’y être envoyé.',
    data: { remaining: quota.remaining, limit: quota.limit },
  });
});

// POST /api/auth/password/reset { email, code, password }
exports.resetPassword = asyncHandler(async (req, res) => {
  res.set('Cache-Control', 'private, no-store');
  const email = codes.normalize(req.body.email);
  const user = await User.findOne({ email }).select('+password');
  await codes.consumeCode({ user, purpose: 'reset', code: req.body.code });
  user.password = req.body.password;
  user.mustChangePassword = false;
  // Le code reçu par e-mail prouve aussi la possession de l'adresse.
  user.isVerified = true;
  await user.save();
  // Toutes les sessions ouvertes (autres appareils, éventuel intrus) sont fermées.
  await sessions.revokeAll(user._id);
  // Le titulaire a prouvé la possession de l'adresse : le verrouillage éventuel est levé.
  await loginGuard.clear(email);
  securityLog.info('auth.password_reset', { requestId: req.id, ip: clientIp(req), userId: user._id });
  sendSuccess(res, { message: 'Mot de passe modifié. Connectez-vous avec le nouveau.', data: { reset: true } });
});
