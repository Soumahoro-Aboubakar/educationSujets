const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const controller = require('../controllers/dynamicCatalogController');

const router = express.Router();

router.route('/:organismeId')
  .get(controller.getStructure)
  .post(protect, authorize('admin'), controller.saveStructure);

module.exports = router;