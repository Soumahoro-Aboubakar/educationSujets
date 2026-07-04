const { body, param } = require('express-validator');

const createNameValidator = [
  body('name').trim().notEmpty().withMessage('Le nom est obligatoire'),
  body('abbreviation').optional().isString().withMessage("L'abreviation doit etre une chaine de caracteres"),
  body('icon').optional().isString().withMessage("L'icone doit etre une chaine de caracteres"),
  body('order').optional().isInt({ min: 0 }).withMessage("L'ordre doit etre un entier positif"),
  body('university').optional({ values: 'falsy' }).isMongoId().withMessage('Universite invalide'),
];

const entityIdValidator = [
  param('id').isMongoId().withMessage('Identifiant invalide'),
];

module.exports = {
  createNameValidator,
  entityIdValidator,
};
