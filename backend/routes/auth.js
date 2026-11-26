const express = require('express');
const { param } = require('express-validator');
const {
  register,
  login,
  logout,
  revokeSessions,
  listSessions,
  revokeOneSession,
  getMe,
  refreshToken,
  createHandoff,
  exchangeHandoff,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const limits = require('../middleware/rateLimit');
const { restrictSensitive } = require('../middleware/security');
const emailAuth = require('../controllers/emailAuthController');
const {
  verifyEmailValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
  registerValidator,
  loginValidator,
  refreshTokenValidator,
  handoffExchangeValidator,
} = require('../validators/authValidators');

const router = express.Router();

// Création de comptes : par IP, très réduite pour un client scripté.
router.post('/register', limits.register, registerValidator, validate, register);
// Seuls les échecs (401) sont comptés : par IP + email, par IP, et par email (attaque distribuée).
router.post('/login', limits.loginIp, limits.loginEmail, limits.loginIpEmail, loginValidator, validate, login);
router.post('/logout', logout);
router.post('/sessions/revoke', protect, revokeSessions);
// « Mes appareils » : sessions actives du titulaire et déconnexion à distance d’un seul appareil.
router.get('/sessions', protect, listSessions);
router.delete('/sessions/:sid', protect, limits.publicWrite, param('sid').isString().isLength({ min: 8, max: 120 }), validate, revokeOneSession);
router.get('/me', protect, getMe);
router.post('/handoff', protect, restrictSensitive, limits.handoffCreate, createHandoff);
router.post('/handoff/exchange', limits.handoffExchange, handoffExchangeValidator, validate, exchangeHandoff);
// Vérification d'adresse et mot de passe oublié (codes par e-mail, 3 par adresse et par jour).
router.post('/email/send-verification', protect, limits.emailSend, emailAuth.sendVerification);
router.post('/email/verify', protect, limits.emailCode, verifyEmailValidator, validate, emailAuth.verifyEmail);
router.get('/email/quota', protect, emailAuth.quota);
router.post('/password/forgot', limits.emailSend, forgotPasswordValidator, validate, emailAuth.forgotPassword);
router.post('/password/reset', limits.emailCode, resetPasswordValidator, validate, emailAuth.resetPassword);
router.post('/refresh-token', limits.refreshToken, refreshTokenValidator, validate, refreshToken);

module.exports = router;
