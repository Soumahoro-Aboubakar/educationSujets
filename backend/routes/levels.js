
const express = require('express');
const {
  getLevels,
  createLevel,
  updateLevel,
  deleteLevel,
} = require('../controllers/levelController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.route('/').get(getLevels).post(protect, authorize('admin'), createLevel);
router.route('/:id').put(protect, authorize('admin'), updateLevel).delete(protect, authorize('admin'), deleteLevel);

module.exports = router;
