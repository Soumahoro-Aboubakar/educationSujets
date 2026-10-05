const express = require('express');
const { param } = require('express-validator');
const controller = require('../controllers/accountController');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const limits = require('../middleware/rateLimit');
const { restrictSensitive } = require('../middleware/security');

const router = express.Router();

router.use(protect);

router.get('/entitlements', controller.getEntitlements);
router.get('/subscription', controller.getMySubscription);
router.get('/promo-code', controller.getMyPromoCode);
router.get('/wallet', controller.getMyWallet);
router.get('/downloads', controller.getMyDownloads);
router.put('/profile', limits.profileUpdate, controller.updateProfile);
router.put('/password', limits.passwordChange, controller.changePassword);
router.post('/withdrawals', restrictSensitive, limits.withdrawalCreate, controller.createWithdrawal);
router.post('/withdrawals/:id/cancel', limits.withdrawalCancel, param('id').isMongoId(), validate, controller.cancelWithdrawal);

module.exports = router;
