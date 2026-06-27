
const express = require('express');
const {
  getUniversities,
  createUniversity,
  updateUniversity,
  deleteUniversity,
} = require('../controllers/universityController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.route('/').get(getUniversities).post(protect, authorize('admin'), createUniversity);
router.route('/:id').put(protect, authorize('admin'), updateUniversity).delete(protect, authorize('admin'), deleteUniversity);

module.exports = router;
