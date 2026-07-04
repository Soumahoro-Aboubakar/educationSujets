const express = require('express');
const {
  getUniversities,
  createUniversity,
} = require('../controllers/universityController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createNameValidator } = require('../validators/taxonomyValidators');

const router = express.Router();

router.route('/')
  .get(getUniversities)
  .post(protect, authorize('contributor', 'sub-admin', 'admin'), createNameValidator, validate, createUniversity);

module.exports = router;
