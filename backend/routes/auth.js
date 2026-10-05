const express = require('express');
const {
  register,
  login,
  logout,
  getMe,
  refreshToken,
  createHandoff,
  exchangeHandoff,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const limits = require('../middleware/rateLimit');
const { restrictSensitive } = require('../middleware/security');
const {
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
router.get('/me', protect, getMe);
router.post('/handoff', protect, restrictSensitive, limits.handoffCreate, createHandoff);
router.post('/handoff/exchange', limits.handoffExchange, handoffExchangeValidator, validate, exchangeHandoff);
router.post('/refresh-token', limits.refreshToken, refreshTokenValidator, validate, refreshToken);

module.exports = router;
