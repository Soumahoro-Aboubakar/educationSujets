const express = require('express');
const controller = require('../controllers/dynamicCatalogController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/organismes/:organismeId/parcours-types', controller.listParcoursTypes);
router.post('/organismes/:organismeId/parcours-types', protect, authorize('admin'), controller.createParcoursType);

module.exports = router;
