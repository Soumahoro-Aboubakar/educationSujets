
const express = require('express');
const {
  getDocuments,
  getDocument,
  createDocument,
  updateDocument,
  deleteDocument,
  getMyDocuments,
  validateDocument,
  getPendingDocuments,
  getAnalytics,
} = require('../controllers/documentController');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

router.route('/').get(getDocuments).post(
  protect,
  authorize('contributor', 'sub-admin', 'admin'),
  upload.single('file'),
  createDocument
);

router.route('/my').get(protect, getMyDocuments);
router.route('/pending').get(protect, authorize('sub-admin', 'admin'), getPendingDocuments);
router.route('/analytics').get(protect, authorize('admin'), getAnalytics);
router.route('/:id').get(getDocument).put(protect, updateDocument).delete(protect, deleteDocument);
router.route('/:id/validate').put(protect, authorize('sub-admin', 'admin'), validateDocument);

module.exports = router;
