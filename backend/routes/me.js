const express = require('express');
const { param } = require('express-validator');
const controller = require('../controllers/accountController');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

router.use(protect);

router.get('/entitlements', controller.getEntitlements);
router.get('/subscription', controller.getMySubscription);
router.get('/promo-code', controller.getMyPromoCode);
router.get('/wallet', controller.getMyWallet);
router.get('/downloads', controller.getMyDownloads);
router.put('/profile', controller.updateProfile);
router.put('/password', controller.changePassword);
router.post('/withdrawals', controller.createWithdrawal);
router.post('/withdrawals/:id/cancel', param('id').isMongoId(), validate, controller.cancelWithdrawal);

module.exports = router;
