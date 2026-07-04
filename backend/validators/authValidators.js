const { body } = require('express-validator');

const registerValidator = [
  body('name').trim().notEmpty().withMessage('Le nom est obligatoire'),
  body('email').trim().isEmail().withMessage('Un email valide est obligatoire'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Le mot de passe doit contenir au moins 6 caracteres'),
];

const loginValidator = [
  body('email').trim().isEmail().withMessage('Un email valide est obligatoire'),
  body('password').notEmpty().withMessage('Le mot de passe est obligatoire'),
];

const refreshTokenValidator = [
  body('refreshToken').notEmpty().withMessage('Le refresh token est obligatoire'),
];

module.exports = {
  registerValidator,
  loginValidator,
  refreshTokenValidator,
};
