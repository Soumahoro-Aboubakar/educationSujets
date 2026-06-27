
const express = require('express');
const {
  getSemesters,
  createSemester,
  updateSemester,
  deleteSemester,
} = require('../controllers/semesterController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.route('/').get(getSemesters).post(protect, authorize('admin'), createSemester);
router.route('/:id').put(protect, authorize('admin'), updateSemester).delete(protect, authorize('admin'), deleteSemester);

module.exports = router;
