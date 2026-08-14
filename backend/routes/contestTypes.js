const express = require('express');
const {
  getContestTypes,
  createContestType,
  updateContestType,
  deleteContestType,
} = require('../controllers/contestTypeController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createNameValidator, entityIdValidator } = require('../validators/taxonomyValidators');

const router = express.Router();

router.route('/')
  .get(getContestTypes)
  .post(protect, authorize('contributor', 'sub-admin', 'admin'), createNameValidator, validate, createContestType);

router.route('/:id')
  .put(protect, authorize('contributor', 'sub-admin', 'admin'), entityIdValidator, validate, updateContestType)
  .delete(protect, authorize('contributor', 'sub-admin', 'admin'), entityIdValidator, validate, deleteContestType);

module.exports = router;
