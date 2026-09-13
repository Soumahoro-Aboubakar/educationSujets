const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const {
  listInstitutions,
  createInstitution,
  getInstitution,
  updateInstitution,
  getStructure,
  updateStructure,
} = require('../controllers/institutionController');

const router = express.Router();
const adminOnly = [protect, authorize('sub-admin', 'admin')];

router.route('/').get(listInstitutions).post(...adminOnly, createInstitution);
router.route('/:id/structure').get(getStructure).put(...adminOnly, updateStructure);
router.route('/:id').get(getInstitution).put(...adminOnly, updateInstitution);

module.exports = router;
