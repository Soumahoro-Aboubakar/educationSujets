const { body, param, query } = require('express-validator');

const objectIdField = (field, label) =>
  body(field)
    .optional({ values: 'falsy' })
    .isMongoId()
    .withMessage(`${label} invalide`);

const uploadDocumentValidator = [
  body('title').trim().notEmpty().withMessage('Le titre est obligatoire'),
  body('description').optional().isString().withMessage('La description doit etre une chaine de caracteres'),
  objectIdField('university', 'Universite'),
  objectIdField('department', 'Departement'),
  objectIdField('level', 'Niveau'),
  objectIdField('semester', 'Semestre'),
  objectIdField('category', 'Categorie'),
];

const updateDocumentValidator = [
  param('id').isMongoId().withMessage('Identifiant de document invalide'),
  body('title').optional().trim().notEmpty().withMessage('Le titre ne peut pas etre vide'),
  body('description').optional().isString().withMessage('La description doit etre une chaine de caracteres'),
  objectIdField('university', 'Universite'),
  objectIdField('department', 'Departement'),
  objectIdField('level', 'Niveau'),
  objectIdField('semester', 'Semestre'),
  objectIdField('category', 'Categorie'),
];

const validateDocumentStatusValidator = [
  param('id').isMongoId().withMessage('Identifiant de document invalide'),
  body('status').isIn(['approved', 'rejected']).withMessage('Le statut doit etre approved ou rejected'),
];

const documentIdParamValidator = [
  param('id').isMongoId().withMessage('Identifiant de document invalide'),
];

const listDocumentsValidator = [
  query('university').optional().isMongoId().withMessage('Filtre universite invalide'),
  query('department').optional().isMongoId().withMessage('Filtre departement invalide'),
  query('level').optional().isMongoId().withMessage('Filtre niveau invalide'),
  query('semester').optional().isMongoId().withMessage('Filtre semestre invalide'),
  query('category').optional().isMongoId().withMessage('Filtre categorie invalide'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page invalide'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limite invalide'),
];

module.exports = {
  uploadDocumentValidator,
  updateDocumentValidator,
  validateDocumentStatusValidator,
  documentIdParamValidator,
  listDocumentsValidator,
};
