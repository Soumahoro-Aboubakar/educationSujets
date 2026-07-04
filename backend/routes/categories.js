const express = require('express');
const {
  getCategories,
  createCategory,
} = require('../controllers/categoryController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createNameValidator } = require('../validators/taxonomyValidators');

const router = express.Router();

router.route('/')
  .get(getCategories)
  .post(protect, authorize('contributor', 'sub-admin', 'admin'), createNameValidator, validate, createCategory);

module.exports = router;
