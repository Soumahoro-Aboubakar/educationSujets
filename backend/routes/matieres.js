const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const controller = require('../controllers/dynamicCatalogController');

const router = express.Router();

router.get('/', controller.listMatieres);
router.post('/trouver-ou-creer', protect, authorize('admin'), controller.upsertMatiere);

module.exports = router;