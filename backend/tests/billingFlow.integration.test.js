/**
 * Test d'intégration du parcours payant, sur une base jetable.
 *   TEST_MONGODB_URI=mongodb://127.0.0.1:27017/fatafalta-billing-test node --test tests/billingFlow.integration.test.js
 * Ignoré si TEST_MONGODB_URI n'est pas défini (ne touche jamais la base de dev/prod).
 */
process.env.MOCK_PAYMENT_DELAY_SECONDS = '0';
process.env.PAYMENT_MODE = 'mock';

const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const uri = process.env.TEST_MONGODB_URI;
const skip = !uri && 'TEST_MONGODB_URI non defini';

const User = require('../models/User');
const Payment = require('../models/Payment');
const Commission = require('../models/Commission');
const paymentService = require('../services/payments/paymentService');
const promoService = require('../services/billing/promoCodeService');
const walletService = require('../services/billing/walletService');
const { authorizeDownload } = require('../services/billing/downloadGuard');
const billingConfig = require('../config/billing');

let referrer;
let buyer;

const pay = async (user, extra = {}) => {
  const { payment } = await paymentService.initiatePayment(user, { method: 'wave', phone: '0701020304', ...extra });
  return paymentService.getMyPayment(user, payment.id);
};

test.before(async () => {
  if (skip) return;
  await mongoose.connect(uri);
  await mongoose.connection.dropDatabase();
  await Promise.all([Payment.syncIndexes(), Commission.syncIndexes(), User.syncIndexes()]);
  referrer = await User.create({ name: 'Awa Koné', email: 'awa@test.ci', password: 'secret123' });
  buyer = await User.create({ name: 'Yao Kouassi', email: 'yao@test.ci', password: 'secret123' });
});

test.after(async () => {
  if (skip) return;
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

test('new users are plain users, never admins', { skip }, () => {
  assert.equal(buyer.role, 'user');
});

test('a guest or unsubscribed user cannot download', { skip }, async () => {
  const doc = { _id: new mongoose.Types.ObjectId() };
  await assert.rejects(authorizeDownload(null, doc), { errorCode: 'AUTH_REQUIRED' });
  await assert.rejects(authorizeDownload(buyer, doc), { errorCode: 'SUBSCRIPTION_REQUIRED' });
});

test('an inactive promo code is refused', { skip }, async () => {
  const { code } = await promoService.ensurePromoCode(referrer._id);
  await assert.rejects(paymentService.quote(buyer, code), { errorCode: 'PROMO_INACTIVE' });
});

test('referrer subscribes; their code becomes active', { skip }, async () => {
  const payment = await pay(referrer);
  assert.equal(payment.status, 'SUCCEEDED');
  assert.equal(payment.amount, 2000);
  const promo = await promoService.describeMyPromoCode(referrer._id);
  assert.equal(promo.status, 'ACTIVE');
});

test('mock failure scenario leaves no access', { skip }, async () => {
  const payment = await pay(buyer, { phone: '0701020300' });
  assert.equal(payment.status, 'FAILED');
});

test('buyer pays 1500 with the code; referrer earns 500 once', { skip }, async () => {
  const { code } = await promoService.ensurePromoCode(referrer._id);
  const quote = await paymentService.quote(buyer, code);
  assert.equal(quote.amount, 1500);

  const payment = await pay(buyer, { promoCode: code });
  assert.equal(payment.status, 'SUCCEEDED');
  assert.equal(payment.amount, 1500);

  // Relecture multiple : la réalisation est idempotente.
  await paymentService.getMyPayment(buyer, payment.id);
  assert.equal(await Commission.countDocuments({ referredUser: buyer._id }), 1);

  const wallet = await walletService.computeBalances(referrer._id);
  assert.equal(wallet.earned, 500);
  assert.equal(wallet.available, 0, 'commission is on hold for the configured delay');
});

test('promo code cannot be reused on later payments', { skip }, async () => {
  const { code } = await promoService.ensurePromoCode(referrer._id);
  await assert.rejects(paymentService.quote(buyer, code), { errorCode: 'PROMO_FIRST_PAYMENT_ONLY' });
});

test('second payment: full price to the platform, no new commission', { skip }, async () => {
  const payment = await pay(buyer);
  assert.equal(payment.status, 'SUCCEEDED');
  assert.equal(payment.discount, 0);
  assert.equal(payment.amount, billingConfig.plans[payment.kind].amount);
  assert.equal(await Commission.countDocuments({ referredUser: buyer._id }), 1);
});

test('two concurrent payments are impossible', { skip }, async () => {
  process.env.MOCK_PAYMENT_DELAY_SECONDS = '600';
  const first = await paymentService.initiatePayment(buyer, { method: 'wave', phone: '0701020304' });
  await assert.rejects(
    paymentService.initiatePayment(buyer, { method: 'wave', phone: '0701020304' }),
    { errorCode: 'PAYMENT_IN_PROGRESS' }
  );
  const cancelled = await paymentService.cancelMyPayment(buyer, first.payment.id);
  assert.equal(cancelled.status, 'CANCELLED');
  process.env.MOCK_PAYMENT_DELAY_SECONDS = '0';
});

test('own code is refused', { skip }, async () => {
  const other = await User.create({ name: 'Solo', email: 'solo@test.ci', password: 'secret123' });
  const { code } = await promoService.ensurePromoCode(other._id);
  await promoService.setAdminOverride(other._id, 'ACTIVE', referrer._id, 'test');
  await assert.rejects(paymentService.quote(other, code), { errorCode: 'PROMO_SELF' });
});

test('subscribed user downloads until the daily limit', { skip }, async () => {
  const limit = billingConfig.downloads.dailyLimit;
  for (let i = 0; i < limit; i += 1) {
    await authorizeDownload(buyer, { _id: new mongoose.Types.ObjectId() });
  }
  await assert.rejects(authorizeDownload(buyer, { _id: new mongoose.Types.ObjectId() }), { errorCode: 'DAILY_LIMIT_REACHED' });
});

test('withdrawal is refused beyond the available balance', { skip }, async () => {
  await assert.rejects(
    walletService.requestWithdrawal(referrer, { amount: 1000, operator: 'wave', phone: '0701020304', firstName: 'Awa', lastName: 'Koné' }),
    { errorCode: 'INSUFFICIENT_BALANCE' }
  );
});

// ── Administration ─────────────────────────────────────
const adminService = require('../services/admin/adminService');
const { protect } = require('../middleware/auth');

test('admin creates a user with temporary credentials', { skip }, async () => {
  const created = await adminService.createUser({ name: 'Partenaire Test', role: 'partner' }, referrer);
  assert.ok(created.tempPassword.length >= 12);
  assert.ok(created.temporaryEmail);
  const user = await User.findById(created.id).select('+password');
  assert.equal(user.mustChangePassword, true);
  assert.equal(user.role, 'partner');
  assert.ok(await user.matchPassword(created.tempPassword));
  // Le rôle envoyé par le client est ignoré : une création admin donne toujours un partenaire.
  const forced = await adminService.createUser({ name: 'X', role: 'admin' }, referrer);
  assert.equal((await User.findById(forced.id)).role, 'partner');
});

test('partner code is always active, without subscription, and usable by a buyer', { skip }, async () => {
  const created = await adminService.createUser({ name: 'Partenaire Actif' }, referrer);
  const partner = await User.findById(created.id);
  const promo = await promoService.describeMyPromoCode(partner._id);
  assert.equal(promo.status, 'ACTIVE');
  assert.equal(promo.alwaysActive, true);

  const newcomer = await User.create({ name: 'Filleul Partenaire', email: 'filleul-partenaire@test.ci', password: 'secret123' });
  const quote = await paymentService.quote(newcomer, promo.code);
  assert.equal(quote.amount, 1500);

  // Même désactivé, le code du partenaire reste actif ; il ne peut pas être forcé inactif.
  await adminService.updateUser(partner._id, { accountStatus: 'DISABLED' }, referrer);
  assert.equal((await promoService.describeMyPromoCode(partner._id)).status, 'ACTIVE');
  await assert.rejects(adminService.overridePromoCode(partner._id, 'INACTIVE', 'test', referrer), { errorCode: 'PARTNER_CODE_ALWAYS_ACTIVE' });
});

test('disabled account is rejected by the auth middleware', { skip }, async () => {
  const target = await User.create({ name: 'Bloqué', email: 'bloque@test.ci', password: 'secret123' });
  await adminService.updateUser(target._id, { accountStatus: 'DISABLED', statusReason: 'test' }, referrer);
  const jwtSecret = process.env.JWT_SECRET || 'test-secret';
  process.env.JWT_SECRET = jwtSecret;
  const token = (await User.findById(target._id)).getSignedJwtToken();
  const req = { headers: { authorization: `Bearer ${token}` } };
  const error = await new Promise((resolve) => protect(req, {}, resolve));
  assert.equal(error?.errorCode, 'ACCOUNT_DISABLED');
});

test('admin cannot disable or demote themselves', { skip }, async () => {
  await assert.rejects(adminService.updateUser(referrer._id, { accountStatus: 'DISABLED' }, referrer), /propre compte/);
});

test('admin can force a promo code active on a disabled account', { skip }, async () => {
  const target = await User.findOne({ email: 'bloque@test.ci' });
  const details = await adminService.overridePromoCode(target._id, 'ACTIVE', 'Compte partenaire', referrer);
  assert.equal(details.promoCode.status, 'ACTIVE');
  assert.equal(details.promoCode.history[0].isAdminAction, true);
});

test('stats aggregate without error', { skip }, async () => {
  const stats = await adminService.getStats();
  assert.ok(stats.users.total >= 3);
  assert.ok(stats.payments.succeeded >= 3);
  assert.equal(stats.referrals.commissions, 1);
});

test('a processed withdrawal cannot be processed twice', { skip }, async () => {
  await Commission.updateMany({}, { $set: { availableAt: new Date(Date.now() - 1000) } });
  await Commission.create({
    referrer: referrer._id,
    referredUser: new mongoose.Types.ObjectId(),
    payment: new mongoose.Types.ObjectId(),
    promoCode: (await promoService.ensurePromoCode(referrer._id))._id,
    amount: 500,
    availableAt: new Date(Date.now() - 1000),
  });
  const withdrawal = await walletService.requestWithdrawal(referrer, { amount: 1000, operator: 'wave', phone: '0701020304', firstName: 'Awa', lastName: 'Koné' });
  await assert.rejects(
    walletService.requestWithdrawal(referrer, { amount: 1000, operator: 'wave', phone: '0701020304', firstName: 'Awa', lastName: 'Koné' }),
    (error) => ['WITHDRAWAL_IN_PROGRESS', 'INSUFFICIENT_BALANCE'].includes(error.errorCode)
  );
  await adminService.processWithdrawal(withdrawal.id, { status: 'PROCESSED', reference: 'TX-1' }, referrer);
  await assert.rejects(adminService.processWithdrawal(withdrawal.id, { status: 'PROCESSED' }, referrer), /plus en attente/);
  const balances = await walletService.computeBalances(referrer._id);
  assert.equal(balances.withdrawn, 1000);
  assert.equal(balances.available, 0);
});
