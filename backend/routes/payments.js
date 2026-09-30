const express = require('express');
const rateLimit = require('express-rate-limit');
const { body, param } = require('express-validator');
const controller = require('../controllers/paymentController');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

// Limite dédiée : l'initiation déclenche une demande sur le téléphone de l'utilisateur.
const initiateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Trop de tentatives de paiement. Réessayez dans quelques minutes.' },
});

router.get('/plans', controller.getPlans);
router.post('/webhooks/:provider', controller.webhook);

router.post('/quote', protect, body('promoCode').optional({ values: 'falsy' }).isString().isLength({ max: 32 }), validate, controller.quote);
router.post(
  '/',
  protect,
  initiateLimiter,
  body('method').isString(),
  body('phone').isString(),
  body('promoCode').optional({ values: 'falsy' }).isString().isLength({ max: 32 }),
  validate,
  controller.initiate
);
router.get('/:id', protect, param('id').isMongoId(), validate, controller.getPayment);
router.post('/:id/cancel', protect, param('id').isMongoId(), validate, controller.cancel);

module.exports = router;
