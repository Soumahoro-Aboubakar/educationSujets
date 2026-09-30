const express = require('express');
const {
  register,
  login,
  getMe,
  refreshToken,
  createHandoff,
  exchangeHandoff,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  registerValidator,
  loginValidator,
  refreshTokenValidator,
} = require('../validators/authValidators');

const router = express.Router();

router.post('/register', registerValidator, validate, register);
router.post('/login', loginValidator, validate, login);
router.get('/me', protect, getMe);
router.post('/handoff', protect, createHandoff);
router.post('/handoff/exchange', exchangeHandoff);
router.post('/refresh-token', refreshTokenValidator, validate, refreshToken);

module.exports = router;
