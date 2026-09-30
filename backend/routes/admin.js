const express = require('express');
const { param } = require('express-validator');
const controller = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

// Données personnelles et financières : super administrateur uniquement.
router.use(protect, authorize('admin'));

const idParam = [param('id').isMongoId(), validate];

router.get('/stats', controller.getStats);
router.get('/users', controller.listUsers);
router.post('/users', controller.createUser);
router.get('/users/:id', idParam, controller.getUser);
router.patch('/users/:id', idParam, controller.updateUser);
router.post('/users/:id/reset-password', idParam, controller.resetPassword);
router.post('/users/:id/promo-code', idParam, controller.overridePromoCode);
router.get('/payments', controller.listPayments);
router.get('/commissions', controller.listCommissions);
router.get('/withdrawals', controller.listWithdrawals);
router.post('/withdrawals/:id/process', idParam, controller.processWithdrawal);

module.exports = router;
