const express = require('express');
const { body, param } = require('express-validator');
const controller = require('../controllers/downloadController');
const { optionalAuth, protect, authorize } = require('../middleware/auth');
const limits = require('../middleware/rateLimit');
const { limitConcurrency } = require('../middleware/security');
const validate = require('../middleware/validate');

/*
 * Téléchargements groupés et quota de sujets récents. Ouvert aux visiteurs : les documents
 * gratuits n'exigent pas de compte. Les règles (gratuité, abonnement, quota, un seul cycle)
 * sont appliquées par services/downloads/bundleService.js et services/billing/downloadGuard.js.
 */
const router = express.Router();

const selection = [
  body('documentIds').isArray({ min: 1, max: 200 }).withMessage('Sélectionnez au moins un document.'),
  body('documentIds.*').isString().isLength({ max: 40 }),
];
const token = param('token').isString().matches(/^[A-Za-z0-9_-]{20,64}$/);

router.get('/quota', optionalAuth, controller.getQuota);
router.get('/scope', limits.searchWhenQuery, optionalAuth, controller.getScope);
router.post('/preview', optionalAuth, selection, validate, controller.previewSelection);
router.post('/bundles', limits.download, optionalAuth, selection, validate, controller.createBundle);
// Le jeton à usage unique tient lieu d'autorisation : le navigateur ouvre ce lien directement.
router.get('/bundles/:token/archive', limits.download, token, validate, limitConcurrency({ name: 'bundle-archive', max: 2 }), controller.streamArchive);
router.get('/bundles/:token/files', limits.download, token, validate, controller.deliverFiles);

// Administration : documents dont l'année est indéterminable (jamais gratuits).
router.get('/admin/year-issues', protect, authorize('sub-admin', 'admin'), controller.listYearIssues);

module.exports = router;
