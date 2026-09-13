const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const controller = require('../controllers/dynamicCatalogController');

const router = express.Router();

router.get('/', controller.listNoeuds);
router.post('/trouver-ou-creer', protect, authorize('admin'), controller.upsertNoeud);

module.exports = router;