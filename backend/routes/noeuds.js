const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const controller = require('../controllers/dynamicCatalogController');

const router = express.Router();
router.use((req, res, next) => req.method === 'GET' && req.query.scope === 'admin' ? protect(req, res, () => authorize('admin')(req, res, next)) : next());
router.patch('/:id', protect, authorize('admin'), controller.patchCatalog('noeuds'));
router.post('/:id/archiver', protect, authorize('admin'), (req, res, next) => { req.body = { status: 'archived' }; next(); }, controller.patchCatalog('noeuds'));

router.get('/', controller.listNoeuds);
router.post('/trouver-ou-creer', protect, authorize('admin'), controller.upsertNoeud);

module.exports = router;