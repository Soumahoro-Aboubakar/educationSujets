const express = require('express');
const controller = require('../controllers/dynamicCatalogController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();
router.use((req, res, next) => req.method === 'GET' && req.query.scope === 'admin' ? protect(req, res, () => authorize('admin')(req, res, next)) : next());
router.patch('/parcoursTypes/:id', protect, authorize('admin'), controller.patchCatalog('parcoursTypes'));
router.post('/parcoursTypes/:id/archiver', protect, authorize('admin'), (req, res, next) => { req.body = { status: 'archived' }; next(); }, controller.patchCatalog('parcoursTypes'));

router.get('/organismes/:organismeId/parcours-types', controller.listParcoursTypes);
router.post('/organismes/:organismeId/parcours-types', protect, authorize('admin'), controller.createParcoursType);

module.exports = router;
