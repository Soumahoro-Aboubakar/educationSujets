const express = require('express');
const {
  getDocuments,
  checkDuplicateTitle,
  getDocument,
  createDocument,
  updateDocument,
  deleteDocument,
  getMyDocuments,
  validateDocument,
  getPendingDocuments,
  getAnalytics,
  getDocumentDownloadUrl,
} = require('../controllers/documentController');
const { protect, authorize, optionalAuth } = require('../middleware/auth');
const upload = require('../middleware/upload');
const validate = require('../middleware/validate');
const {
  uploadDocumentValidator, 
  updateDocumentValidator,
  validateDocumentStatusValidator,
  documentIdParamValidator,
  duplicateTitleValidator,
  listDocumentsValidator,
} = require('../validators/documentValidators');

const router = express.Router();

router.route('/')
  .get(optionalAuth, listDocumentsValidator, validate, getDocuments)
  .post(
    protect,
    authorize('contributor', 'sub-admin', 'admin'),
    upload.single('file'),
    uploadDocumentValidator,
    validate,
    createDocument
  );

router.get('/my', protect, getMyDocuments);
router.get('/pending', protect, authorize('sub-admin', 'admin'), getPendingDocuments);
router.get('/analytics', protect, authorize('admin'), getAnalytics);
router.get('/duplicates/title', protect, duplicateTitleValidator, validate, checkDuplicateTitle);
router.get('/:id/download', optionalAuth, documentIdParamValidator, validate, getDocumentDownloadUrl);
router.route('/:id')
  .get(optionalAuth, documentIdParamValidator, validate, getDocument)
  .put(protect, updateDocumentValidator, validate, updateDocument)
  .delete(protect, documentIdParamValidator, validate, deleteDocument);
router.put('/:id/validate', protect, authorize('sub-admin', 'admin'), validateDocumentStatusValidator, validate, validateDocument);

module.exports = router;