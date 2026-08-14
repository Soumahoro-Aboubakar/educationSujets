const { body, param, query } = require('express-validator');

const objectIdField = (field, label) =>
  body(field)
    .optional({ values: 'falsy' })
    .isMongoId()
    .withMessage(`${label} invalide`);

const uploadDocumentValidator = [
  body('title').custom((value, { req }) => {
    if (req.body.metadataStatus === 'false' || req.body.documentType === 'corrige') return true;
    if (!value || value.trim().length === 0) throw new Error('Le titre est obligatoire');
    return true;
  }),
  body('documentType')
    .optional()
    .isIn(['sujet', 'corrige'])
    .withMessage('Le type de document doit etre sujet ou corrige'),
  body('correctionFor').custom((value, { req }) => {
    if (req.body.documentType !== 'corrige') return true;
    if (!value) throw new Error('Le document principal est obligatoire pour un corrige');
    if (!/^[0-9a-fA-F]{24}$/.test(String(value))) throw new Error('Document principal invalide');
    return true;
  }),
  body('description').optional().isString().withMessage('La description doit etre une chaine de caracteres'),
  objectIdField('university', 'Universite'),
  objectIdField('department', 'Departement'),
  objectIdField('level', 'Niveau'),
  objectIdField('semester', 'Session'),
  objectIdField('category', 'Categorie'),
];

const updateDocumentValidator = [
  param('id').isMongoId().withMessage('Identifiant de document invalide'),
  body('title').optional().trim().notEmpty().withMessage('Le titre ne peut pas etre vide'),
  body('description').optional().isString().withMessage('La description doit etre une chaine de caracteres'),
  objectIdField('university', 'Universite'),
  objectIdField('department', 'Departement'),
  objectIdField('level', 'Niveau'),
  objectIdField('semester', 'Session'),
  objectIdField('category', 'Categorie'),
];

const validateDocumentStatusValidator = [
  param('id').isMongoId().withMessage('Identifiant de document invalide'),
  body('status').isIn(['approved', 'rejected']).withMessage('Le statut doit etre approved ou rejected'),
];

const documentIdParamValidator = [
  param('id').isMongoId().withMessage('Identifiant de document invalide'),
];

const duplicateTitleValidator = [
  query('title')
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Le titre a comparer doit contenir entre 3 et 200 caracteres'),
];

const listDocumentsValidator = [
  query('university').optional().isMongoId().withMessage('Filtre universite invalide'),
  query('department').optional().isMongoId().withMessage('Filtre departement invalide'),
  query('level').optional().isMongoId().withMessage('Filtre niveau invalide'),
  query('semester').optional().isMongoId().withMessage('Filtre session invalide'),
  query('category').optional().isMongoId().withMessage('Filtre categorie invalide'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page invalide'),
  // Allow larger limit for client-side bulk fetch (up to 1000)
  query('limit').optional().isInt({ min: 1, max: 1000 }).withMessage('Limite invalide'),
];

module.exports = {
  uploadDocumentValidator,
  updateDocumentValidator,
  validateDocumentStatusValidator,
  documentIdParamValidator,
  duplicateTitleValidator,
  listDocumentsValidator,
};
