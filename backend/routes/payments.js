const express = require('express');
const { body, param, header } = require('express-validator');
const controller = require('../controllers/paymentController');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const limits = require('../middleware/rateLimit');
const { restrictSensitive } = require('../middleware/security');
const log = require('../services/security/securityLogger');
const { clientIp } = require('../utils/request');

const router = express.Router();

// Champs que seul le serveur détermine : leur présence trahit une requête modifiée à la main.
const SERVER_OWNED_FIELDS = ['amount', 'baseAmount', 'discount', 'currency', 'user', 'userId', 'status', 'providerRef', 'reference', 'kind', 'paymentId'];
const flagTampering = (req, res, next) => {
  const fields = SERVER_OWNED_FIELDS.filter((field) => req.body?.[field] !== undefined);
  if (fields.length) {
    log.warn('payment.tampering_attempt', {
      requestId: req.id, ip: clientIp(req), userId: req.user?._id, path: req.originalUrl.split('?')[0], reason: fields.join(','),
    });
  }
  // Les champs sont ignorés (jamais lus) : la requête suit son cours avec les valeurs serveur.
  next();
};

router.get('/plans', controller.getPlans);
// Appelé par le fournisseur (sans session) : l'authenticité repose sur la signature vérifiée par le provider.
router.post('/webhooks/:provider', limits.webhook, param('provider').isIn(['geniuspay', 'mock']), validate, controller.webhook);

router.post(
  '/quote',
  protect,
  limits.paymentQuote,
  body('promoCode').optional({ values: 'falsy' }).isString().isLength({ max: 32 }),
  validate,
  controller.quote
);
// Initiation : compte restreint refusé, puis limites par IP, rafale (1 min) et fenêtre (15 min) ;
// les plafonds horaires/journaliers et l'idempotence sont appliqués par le service.
router.post(
  '/',
  protect,
  restrictSensitive,
  limits.paymentInitiateIp,
  limits.paymentInitiateBurst,
  limits.paymentInitiate,
  flagTampering,
  body('method').isString().isLength({ min: 2, max: 40 }),
  // Facultatif pour les moyens sans numéro (carte) ; le service exige un numéro valide sinon.
  body('phone').optional({ values: 'falsy' }).isString().isLength({ max: 20 }),
  body('promoCode').optional({ values: 'falsy' }).isString().isLength({ max: 32 }),
  body('channel').optional().isIn(['web', 'mobile']),
  body('returnUrl').optional({ values: 'falsy' }).isString().isLength({ max: 300 }),
  // Identifiant de tentative généré par le client (idempotence : double clic, nouvel envoi réseau).
  body('attemptId').optional({ values: 'falsy' }).matches(/^[A-Za-z0-9_-]{8,64}$/),
  header('idempotency-key').optional({ values: 'falsy' }).matches(/^[A-Za-z0-9_-]{8,64}$/),
  validate,
  controller.initiate
);
router.get('/:id', protect, limits.paymentStatus, param('id').isMongoId(), validate, controller.getPayment);
router.post('/:id/cancel', protect, limits.paymentCancel, param('id').isMongoId(), validate, controller.cancel);

module.exports = router;
