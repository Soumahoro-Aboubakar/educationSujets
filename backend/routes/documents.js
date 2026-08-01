const express = require('express');
const {
  getDocuments,
  checkDuplicateTitle,
  getDocument,
  createDocument,
  createCorrectionDocument,
  updateDocument,
  deleteDocument,
  getMyDocuments,
  validateDocument,
  getPendingDocuments,
  getDraftDocuments,
  getAnalytics,
  getDocumentDownloadUrl,
  getTrashedDocuments,
  restoreDocument,
  permanentlyDeleteDocument,
  getTrashedDocumentPreview,
} = require('../controllers/documentController');
const { protect, authorize, optionalAuth, authorizeSuperAdmin } = require('../middleware/auth');
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
    authorize('admin'),
    upload.single('file'),
    uploadDocumentValidator,
    validate,
    createDocument
  );

router.get('/my', protect, getMyDocuments);
router.get('/pending', protect, authorize('sub-admin', 'admin'), getPendingDocuments);
router.get('/drafts', protect, authorize('sub-admin', 'admin'), getDraftDocuments);
router.get('/analytics', protect, authorize('admin'), getAnalytics);
router.get('/duplicates/title', protect, duplicateTitleValidator, validate, checkDuplicateTitle);

// ── Trash routes (Super Admin only) ─────────────
router.get('/trash', protect, authorizeSuperAdmin, getTrashedDocuments);
router.get('/trash/:id/preview', protect, authorizeSuperAdmin, documentIdParamValidator, validate, getTrashedDocumentPreview);
router.put('/trash/:id/restore', protect, authorizeSuperAdmin, documentIdParamValidator, validate, restoreDocument);
router.delete('/trash/:id', protect, authorizeSuperAdmin, documentIdParamValidator, validate, permanentlyDeleteDocument);

router.get('/:id/download', optionalAuth, documentIdParamValidator, validate, getDocumentDownloadUrl);
router.post(
  '/:id/correction',
  protect,
  authorize('admin'),
  documentIdParamValidator,
  validate,
  upload.single('file'),
  createCorrectionDocument
);
router.route('/:id')
  .get(optionalAuth, documentIdParamValidator, validate, getDocument)
  .put(protect, authorize('sub-admin', 'admin'), updateDocumentValidator, validate, updateDocument)
  .delete(protect, authorize('sub-admin', 'admin'), documentIdParamValidator, validate, deleteDocument);
router.put('/:id/validate', protect, authorize('sub-admin', 'admin'), validateDocumentStatusValidator, validate, validateDocument);

module.exports = router;
