const express = require('express');
const {
  getDocuments,
  checkDuplicateTitle,
  getDocument,
  createDocument,
  createCorrectionDocument,
  replaceDocumentFile,
  updateDocument,
  deleteDocument,
  getMyDocuments,
  validateDocument,
  getPendingDocuments,
  getDraftDocuments,
  getManagedDocuments,
  getAnalytics,
  getDocumentDownloadUrl,
  getTrashedDocuments,
  restoreDocument,
  permanentlyDeleteDocument,
  getTrashedDocumentPreview,
} = require('../controllers/documentController');
const { protect, authorize, optionalAuth, authorizeSuperAdmin } = require('../middleware/auth');
const limits = require('../middleware/rateLimit');
const { limitConcurrency } = require('../middleware/security');
const upload = require('../middleware/upload');
const normalizeDocumentPayload = require('../middleware/normalizeDocumentPayload');
const validate = require('../middleware/validate');
const {
  uploadDocumentValidator, 
  updateDocumentValidator,
  validateDocumentStatusValidator,
  documentIdParamValidator,
  duplicateTitleValidator,
  listDocumentsValidator,
  manageDocumentsValidator,
} = require('../validators/documentValidators');

const router = express.Router();

// Toutes les écritures de ce routeur sont des opérations d'administration.
router.use(limits.adminWrite);

const searchConcurrency = limitConcurrency({ name: 'document-search', max: 3 });

router.route('/')
  .get(limits.searchWhenQuery, searchConcurrency, optionalAuth, listDocumentsValidator, validate, getDocuments)
  .post(
    protect,
    authorize('admin'),
    limits.upload,
    upload.single('file'),
    normalizeDocumentPayload,
    uploadDocumentValidator,
    validate,
    createDocument
  );

router.get('/my', protect, getMyDocuments);
router.get('/pending', protect, authorize('sub-admin', 'admin'), getPendingDocuments);
router.get('/drafts', protect, authorize('sub-admin', 'admin'), getDraftDocuments);
router.get('/manage', protect, authorize('sub-admin', 'admin'), manageDocumentsValidator, validate, getManagedDocuments);
router.get('/analytics', protect, authorize('admin'), getAnalytics);
router.get('/duplicates/title', protect, duplicateTitleValidator, validate, checkDuplicateTitle);

// ── Trash routes (Super Admin only) ─────────────
router.get('/trash', protect, authorizeSuperAdmin, getTrashedDocuments);
router.get('/trash/:id/preview', protect, authorizeSuperAdmin, documentIdParamValidator, validate, getTrashedDocumentPreview);
router.put('/trash/:id/restore', protect, authorizeSuperAdmin, documentIdParamValidator, validate, restoreDocument);
router.delete('/trash/:id', protect, authorizeSuperAdmin, documentIdParamValidator, validate, permanentlyDeleteDocument);

router.get('/:id/download', limits.download, optionalAuth, documentIdParamValidator, validate, getDocumentDownloadUrl);
router.post(
  '/:id/correction',
  protect,
  authorize('admin'),
  limits.upload,
  documentIdParamValidator,
  validate,
  upload.single('file'),
  createCorrectionDocument
);
router.put(
  '/:id/file',
  protect,
  authorize('sub-admin', 'admin'),
  limits.upload,
  documentIdParamValidator,
  validate,
  upload.single('file'),
  replaceDocumentFile
);
router.route('/:id')
  .get(optionalAuth, documentIdParamValidator, validate, getDocument)
  .put(protect, authorize('sub-admin', 'admin'), normalizeDocumentPayload, updateDocumentValidator, validate, updateDocument)
  .delete(protect, authorize('sub-admin', 'admin'), documentIdParamValidator, validate, deleteDocument);
router.put('/:id/validate', protect, authorize('sub-admin', 'admin'), validateDocumentStatusValidator, validate, validateDocument);

module.exports = router;
