const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const multer = require('multer');
const { param } = require('express-validator');
const controller = require('../controllers/dynamicCatalogController');
const validate = require('../middleware/validate');
const limits = require('../middleware/rateLimit');
const AppError = require('../utils/errors');
const { MAX_LOGO_BYTES, LOGO_MIME_TYPES } = require('../services/organismeLogoService');

// Image de logo : PNG ou JPEG, 2 Mo au plus, gardée en mémoire le temps de la normaliser.
const logoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_LOGO_BYTES, files: 1 },
  fileFilter: (req, file, callback) => (LOGO_MIME_TYPES.includes(String(file.mimetype).toLowerCase())
    ? callback(null, true)
    : callback(new AppError('Format non pris en charge : envoyez une image PNG ou JPEG.', 400, undefined, 'LOGO_FORMAT'))),
});
const organismeId = param('organismeId').isMongoId().withMessage('Organisme invalide');

const router = express.Router();

router.get('/', controller.listOrganismes);
router.post('/', protect, authorize('admin'), controller.createOrganisme);
router.get('/:organismeId/logo', organismeId, validate, controller.getOrganismeLogo);
router.put('/:organismeId/logo', protect, authorize('admin'), limits.upload, organismeId, validate, logoUpload.single('file'), controller.setOrganismeLogo);
router.delete('/:organismeId/logo', protect, authorize('admin'), organismeId, validate, controller.removeOrganismeLogo);

module.exports = router;