const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const controller = require('../controllers/dynamicCatalogController');

const router = express.Router();

router.get('/', controller.listOrganismes);
router.post('/', protect, authorize('admin'), controller.createOrganisme);

module.exports = router;