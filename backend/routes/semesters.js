const express = require('express');
const {
  getSemesters,
  createSemester,
} = require('../controllers/semesterController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createNameValidator } = require('../validators/taxonomyValidators');

const router = express.Router();

router.route('/')
  .get(getSemesters)
  .post(protect, authorize('contributor', 'sub-admin', 'admin'), createNameValidator, validate, createSemester);

module.exports = router;
