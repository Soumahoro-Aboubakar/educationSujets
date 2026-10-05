const express = require('express');
const { getDocuments } = require('../controllers/documentController');
const { optionalAuth } = require('../middleware/auth');
const limits = require('../middleware/rateLimit');
const { limitConcurrency } = require('../middleware/security');
const validate = require('../middleware/validate');
const { listDocumentsValidator } = require('../validators/documentValidators');

const router = express.Router();
// Recherche plein texte : plusieurs requêtes de catalogue par mot ; débit et parallélisme bornés.
router.get('/', limits.search, limitConcurrency({ name: 'search', max: 3 }), optionalAuth, listDocumentsValidator, validate, getDocuments);

module.exports = router;