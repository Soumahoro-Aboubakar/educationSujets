const express = require('express');
const { body, param } = require('express-validator');
const controller = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const limits = require('../middleware/rateLimit');

const router = express.Router();

// Données personnelles et financières : super administrateur uniquement.
// Limites propres : un jeton administrateur volé ne doit pas permettre d'aspirer la base.
router.use(protect, authorize('admin'), limits.admin, limits.adminWrite);

const idParam = [param('id').isMongoId(), validate];

router.get('/stats', controller.getStats);
router.get('/users', controller.listUsers);
router.post('/users', controller.createUser);
router.get('/users/:id', idParam, controller.getUser);
router.patch('/users/:id', idParam, controller.updateUser);
router.post('/users/:id/reset-password', idParam, controller.resetPassword);
router.post('/users/:id/promo-code', idParam, controller.overridePromoCode);
router.get('/payments', controller.listPayments);
router.get('/payment-methods', controller.listPaymentMethods);
router.post(
  '/payment-methods',
  body('code').isString().isLength({ min: 2, max: 40 }),
  body('label').isString().isLength({ min: 1, max: 60 }),
  validate,
  controller.createPaymentMethod
);
router.patch(
  '/payment-methods/:code',
  param('code').matches(/^[a-z0-9_]{2,40}$/),
  body('enabled').optional().isBoolean({ strict: true }),
  validate,
  controller.updatePaymentMethod
);
router.get('/commissions', controller.listCommissions);
router.get('/withdrawals', controller.listWithdrawals);
router.post('/withdrawals/:id/process', idParam, controller.processWithdrawal);

// Sécurité : blocages actifs, comptes surveillés, levée d'un blocage (faux positif).
router.get('/security/overview', controller.getSecurityOverview);
router.delete(
  '/security/blocks/:type/:value',
  param('type').isIn(['ip', 'user']),
  param('value').isString().isLength({ min: 1, max: 100 }),
  validate,
  controller.liftSecurityBlock
);

module.exports = router;
