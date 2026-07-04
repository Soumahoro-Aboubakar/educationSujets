const express = require('express');
const {
  getDepartments,
  createDepartment,
} = require('../controllers/departmentController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createNameValidator } = require('../validators/taxonomyValidators');

const router = express.Router();

router.route('/')
  .get(getDepartments)
  .post(protect, authorize('contributor', 'sub-admin', 'admin'), createNameValidator, validate, createDepartment);

module.exports = router;
