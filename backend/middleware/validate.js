const { validationResult } = require('express-validator');
const AppError = require('../utils/errors');

const SENSITIVE_FIELD = /password|token|secret|code|captcha/i;

const validate = (req, res, next) => {
  const result = validationResult(req);

  if (result.isEmpty()) {
    return next();
  }

  return next(
    new AppError('Validation des donnees echouee', 400, result.array().map((error) => ({
      field: error.path,
      message: error.msg,
      // Jamais de renvoi d'une valeur secrète (mot de passe, jeton, code) dans une erreur.
      ...(SENSITIVE_FIELD.test(String(error.path || '')) ? {} : { value: error.value }),
    })))
  );
};

module.exports = validate;
