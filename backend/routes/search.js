const express = require('express');
const { getDocuments } = require('../controllers/documentController');
const { optionalAuth } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { listDocumentsValidator } = require('../validators/documentValidators');

const router = express.Router();
router.get('/', optionalAuth, listDocumentsValidator, validate, getDocuments);

module.exports = router;