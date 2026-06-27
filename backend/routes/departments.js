
const express = require('express');
const {
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} = require('../controllers/departmentController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.route('/').get(getDepartments).post(protect, authorize('admin'), createDepartment);
router.route('/:id').put(protect, authorize('admin'), updateDepartment).delete(protect, authorize('admin'), deleteDepartment);

module.exports = router;
