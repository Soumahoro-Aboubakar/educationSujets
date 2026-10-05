const { body } = require('express-validator');

// Longueurs maximales : un mot de passe de plusieurs Mo coûterait cher à hacher (bcrypt).
const PASSWORD_MAX = 128;
const EMAIL_MAX = 254;

const registerValidator = [
  body('name').isString().trim().notEmpty().withMessage('Le nom est obligatoire')
    .isLength({ max: 100 }).withMessage('Le nom est trop long'),
  body('email').isString().trim().isLength({ max: EMAIL_MAX }).isEmail().withMessage('Un email valide est obligatoire'),
  body('password')
    .isString()
    .isLength({ min: 6 })
    .withMessage('Le mot de passe doit contenir au moins 6 caracteres')
    .isLength({ max: PASSWORD_MAX })
    .withMessage(`Le mot de passe ne doit pas depasser ${PASSWORD_MAX} caracteres`),
];

const loginValidator = [
  body('email').isString().trim().isLength({ max: EMAIL_MAX }).isEmail().withMessage('Un email valide est obligatoire'),
  body('password').isString().notEmpty().withMessage('Le mot de passe est obligatoire')
    .isLength({ max: PASSWORD_MAX }).withMessage('Identifiants invalides'),
  body('captchaToken').optional().isString().isLength({ max: 2048 }),
];

const refreshTokenValidator = [
  body('refreshToken').isString().notEmpty().isLength({ max: 2048 }).withMessage('Le refresh token est obligatoire'),
];

const handoffExchangeValidator = [
  body('code').isString().isLength({ min: 16, max: 128 }).withMessage('Lien invalide'),
];

module.exports = {
  registerValidator,
  loginValidator,
  refreshTokenValidator,
  handoffExchangeValidator,
};
