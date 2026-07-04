const { validationResult } = require('express-validator');
const AppError = require('../utils/errors');

const validate = (req, res, next) => {
  const result = validationResult(req);

  if (result.isEmpty()) {
    return next();
  }

  return next(
    new AppError('Validation des donnees echouee', 400, result.array().map((error) => ({
      field: error.path,
      message: error.msg,
      value: error.value,
    })))
  );
};

module.exports = validate;
