const express = require('express');
const {
  getLevels,
  createLevel,
} = require('../controllers/levelController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createNameValidator } = require('../validators/taxonomyValidators');

const router = express.Router();

router.route('/')
  .get(getLevels)
  .post(protect, authorize('contributor', 'sub-admin', 'admin'), createNameValidator, validate, createLevel);

module.exports = router;
