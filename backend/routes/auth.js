const express = require('express');
const {
  register,
  login,
  getMe,
  refreshToken,
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
router.post('/refresh-token', refreshTokenValidator, validate, refreshToken);

module.exports = router;
