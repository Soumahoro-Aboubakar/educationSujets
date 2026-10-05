/**
 * Parcours de paiement GeniusPay de bout en bout (service, base, webhook HTTP), contre un faux
 * serveur GeniusPay conforme à la documentation. Sur une base jetable :
 *   TEST_MONGODB_URI=mongodb://127.0.0.1:27017/fatafalta-geniuspay-test node --test tests/geniusPayFlow.integration.test.js
 * Ignoré si TEST_MONGODB_URI n'est pas défini (ne touche jamais la base de dev/prod).
 */
process.env.NODE_ENV = 'test';
process.env.PAYMENT_MODE = 'geniuspay';
process.env.GENIUSPAY_ENV = 'sandbox';

const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { startFakeGeniusPay, toExpressRequest } = require('./helpers/fakeGeniusPay');

const uri = process.env.TEST_MONGODB_URI;
const skip = !uri && 'TEST_MONGODB_URI non defini';

const User = require('../models/User');
const Payment = require('../models/Payment');
const PaymentMethod = require('../models/PaymentMethod');
const PaymentWebhookEvent = require('../models/PaymentWebhookEvent');
const Subscription = require('../models/Subscription');

let fake;
let paymentService;
let methodService;
let describeSubscription;
let app;
let httpServer;
let apiUrl;
let admin;
let userCount = 0;

const newUser = () => {
  userCount += 1;
  return User.create({ name: `Abonné ${userCount}`, email: `abonne${userCount}@test.ci`, password: 'secret123' });
};

const start = (user, extra = {}) => paymentService.initiatePayment(user, { method: 'wave', phone: '0701020304', channel: 'web', ...extra });

const referenceOf = async (paymentId) => (await Payment.findById(paymentId)).providerRef;

const isActive = async (user) => (await describeSubscription(user._id)).status === 'ACTIVE';

const appliedCount = async (user) => (await Subscription.findOne({ user: user._id }).lean())?.appliedPayments?.length || 0;

/** Envoie un webhook signé à la vraie route HTTP (corps brut, signature, réponse). */
const postWebhook = async (webhook) => {
  const response = await fetch(`${apiUrl}/api/payments/webhooks/geniuspay`, { method: 'POST', headers: webhook.headers, body: webhook.raw });
  return { status: response.status, body: await response.json() };
};

test.before(async () => {
  if (skip) return;
  fake = await startFakeGeniusPay();
  Object.assign(process.env, {
    GENIUSPAY_BASE_URL: fake.baseUrl,
    GENIUSPAY_API_KEY: fake.keys.apiKey,
    GENIUSPAY_API_SECRET: fake.keys.apiSecret,
    GENIUSPAY_WEBHOOK_SECRET: fake.webhookSecret,
  });

  paymentService = require('../services/payments/paymentService');
  methodService = require('../services/payments/paymentMethodService');
  ({ describeSubscription } = require('../services/billing/subscriptionService'));
  app = require('../server');

  await mongoose.connect(uri);
  await mongoose.connection.dropDatabase();
  await Promise.all([Payment.syncIndexes(), PaymentMethod.syncIndexes(), PaymentWebhookEvent.syncIndexes(), User.syncIndexes(), Subscription.syncIndexes()]);
  methodService.resetSeedCache();
  admin = await User.create({ name: 'Admin', email: 'admin@test.ci', password: 'secret123', role: 'admin' });

  httpServer = app.listen(0);
  apiUrl = `http://127.0.0.1:${httpServer.address().port}`;
});

test.after(async () => {
  if (skip) return;
  await new Promise((resolve) => httpServer.close(resolve));
  await fake.close();
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

// ── Moyens de paiement ──────────────────────────────────

test('default methods are seeded from the GeniusPay documentation', { skip }, async () => {
  const methods = await methodService.adminList();
  assert.deepEqual(methods.map((m) => m.code), ['wave', 'orange_money', 'mtn_money', 'moov_money', 'card']);
  // Pour l'instant, seul Wave est proposé ; les opérateurs restent configurés mais désactivés.
  const plans = await paymentService.getPublicPlans();
  assert.deepEqual(plans.methods.map((m) => m.code), ['wave']);
  assert.equal(plans.sandbox, true);
  assert.equal(plans.simulated, false);
});

test('operators are re-enabled from the admin in one action (no code change)', { skip }, async () => {
  for (const code of ['orange_money', 'mtn_money', 'moov_money']) await methodService.adminUpdate(code, { enabled: true }, admin);
  const plans = await paymentService.getPublicPlans();
  // Moov est activé chez nous mais fermé chez GeniusPay (PawaPay CI) : il n'est pas proposé.
  assert.deepEqual(plans.methods.map((m) => m.code), ['wave', 'orange_money', 'mtn_money']);
  assert.deepEqual(plans.methods.map((m) => m.flow), ['redirect', 'push', 'push']);
});

test('a disabled method disappears for users and is refused by the API', { skip }, async () => {
  await methodService.adminUpdate('mtn_money', { enabled: false }, admin);

  const plans = await paymentService.getPublicPlans();
  assert.ok(!plans.methods.some((m) => m.code === 'mtn_money'), 'MTN must not be offered');

  const user = await newUser();
  const posts = fake.requests.filter((r) => r.method === 'POST').length;
  await assert.rejects(start(user, { method: 'mtn_money' }), { errorCode: 'PAYMENT_METHOD_DISABLED' });
  await assert.rejects(start(user, { method: 'bitcoin' }), { errorCode: 'PAYMENT_METHOD_INVALID' });
  assert.equal(fake.requests.filter((r) => r.method === 'POST').length, posts, 'GeniusPay is never called');
  assert.equal(await Payment.countDocuments({ user: user._id }), 0);

  await methodService.adminUpdate('mtn_money', { enabled: true }, admin);
  assert.ok((await paymentService.getPublicPlans()).methods.some((m) => m.code === 'mtn_money'));
});

test('admin can add a new provider method without code changes', { skip }, async () => {
  const created = await methodService.adminCreate({ code: 'airtel_money', label: 'Airtel Money' }, admin);
  assert.equal(created.enabled, false, 'new methods start disabled');
  await assert.rejects(methodService.adminCreate({ code: 'airtel_money', label: 'Doublon' }, admin), { errorCode: 'PAYMENT_METHOD_EXISTS' });
  await assert.rejects(methodService.adminUpdate('airtel_money', { logoUrl: 'javascript:alert(1)' }, admin), { errorCode: 'VALIDATION_ERROR' });
});

test('card does not require a phone number', { skip }, async () => {
  await methodService.adminUpdate('card', { enabled: true }, admin);
  const user = await newUser();
  const { payment } = await start(user, { method: 'card', phone: undefined });
  assert.equal(payment.status, 'PENDING');
  await paymentService.cancelMyPayment(user, payment.id);
  await methodService.adminUpdate('card', { enabled: false }, admin);
  await assert.rejects(start(await newUser(), { method: 'wave', phone: '123' }), { errorCode: 'PHONE_INVALID' });
});

// ── Parcours ────────────────────────────────────────────

test('success: payment confirmed by webhook activates the subscription', { skip }, async () => {
  const user = await newUser();
  const result = await start(user, { channel: 'mobile', returnUrl: 'fatafalta://paiement-retour' });
  assert.equal(result.payment.status, 'PENDING');
  assert.ok(result.redirectUrl.startsWith('https://pay.example/MTX-'));
  assert.equal(result.payment.amount, 2000, 'amount computed by the server');

  const sent = fake.requests.filter((r) => r.method === 'POST').at(-1).body;
  assert.ok(sent.success_url.includes(`payment=${result.payment.id}`));
  assert.ok(sent.success_url.includes(encodeURIComponent('fatafalta://paiement-retour')));
  assert.equal(await isActive(user), false, 'not active before confirmation');

  const reference = await referenceOf(result.payment.id);
  fake.setStatus(reference, 'completed');
  const response = await postWebhook(fake.webhook(reference, 'payment.success'));
  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { received: true });

  const payment = await Payment.findById(result.payment.id);
  assert.equal(payment.status, 'SUCCEEDED');
  assert.ok(payment.fulfilledAt);
  assert.equal(await isActive(user), true);
});

test('success without webhook: polling confirms through the API', { skip }, async () => {
  const user = await newUser();
  const { payment } = await start(user);
  fake.setStatus(await referenceOf(payment.id), 'completed');
  const refreshed = await paymentService.getMyPayment(user, payment.id);
  assert.equal(refreshed.status, 'SUCCEEDED');
  assert.equal(await isActive(user), true);
});

test('failure: subscription is not activated', { skip }, async () => {
  const user = await newUser();
  const { payment } = await start(user);
  const reference = await referenceOf(payment.id);
  fake.setStatus(reference, 'failed');
  await postWebhook(fake.webhook(reference, 'payment.failed'));
  const current = await paymentService.getMyPayment(user, payment.id);
  assert.equal(current.status, 'FAILED');
  assert.equal(current.failureReason, 'Le paiement a été refusé par l’opérateur.');
  assert.equal(await isActive(user), false);
});

test('cancellation at GeniusPay: subscription is not activated', { skip }, async () => {
  const user = await newUser();
  const { payment } = await start(user);
  const reference = await referenceOf(payment.id);
  fake.setStatus(reference, 'cancelled');
  await postWebhook(fake.webhook(reference, 'payment.cancelled'));
  assert.equal((await paymentService.getMyPayment(user, payment.id)).status, 'CANCELLED');
  assert.equal(await isActive(user), false);
});

test('pending and processing never activate the subscription early', { skip }, async () => {
  const user = await newUser();
  const { payment } = await start(user);
  const reference = await referenceOf(payment.id);
  assert.equal((await paymentService.getMyPayment(user, payment.id)).status, 'PENDING');
  fake.setStatus(reference, 'processing');
  assert.equal((await paymentService.getMyPayment(user, payment.id)).status, 'PROCESSING');
  assert.equal(await isActive(user), false);
  assert.equal((await describeSubscription(user._id)).hasPendingPayment, true);
  await paymentService.cancelMyPayment(user, payment.id);
});

test('double click: one transaction, one GeniusPay call', { skip }, async () => {
  const user = await newUser();
  const posts = fake.requests.filter((r) => r.method === 'POST').length;
  const attemptId = 'attempt-double-click-1';
  const results = await Promise.allSettled([start(user, { attemptId }), start(user, { attemptId }), start(user, { attemptId })]);
  const created = results.filter((r) => r.status === 'fulfilled');
  assert.ok(created.length >= 1);
  for (const rejected of results.filter((r) => r.status === 'rejected')) {
    assert.equal(rejected.reason.errorCode, 'PAYMENT_IN_PROGRESS');
  }
  assert.equal(await Payment.countDocuments({ user: user._id }), 1);
  assert.equal(fake.requests.filter((r) => r.method === 'POST').length, posts + 1);

  // Même tentative renvoyée plus tard (réseau, rechargement) : même transaction, aucun nouvel appel.
  const replay = await start(user, { attemptId });
  assert.equal(String(replay.payment.id), String(created[0].value.payment.id));
  assert.equal(fake.requests.filter((r) => r.method === 'POST').length, posts + 1);
});

test('a payment being validated by the operator is never replaced', { skip }, async () => {
  const user = await newUser();
  const first = await start(user, { method: 'orange_money', phone: '0701010101' });
  fake.setStatus(await referenceOf(first.payment.id), 'processing');
  await assert.rejects(start(user, { method: 'mtn_money', phone: '0502020202' }), (error) => error.errorCode === 'PAYMENT_PROCESSING' && Boolean(error.details.paymentId));
  assert.equal((await Payment.findById(first.payment.id)).status, 'PROCESSING');
  assert.equal(await Payment.countDocuments({ user: user._id }), 1);
});

test('a replaced attempt that is finally paid is still honoured, without contaminating the new one', { skip }, async () => {
  const user = await newUser();
  const a = await start(user, { method: 'orange_money', phone: '0701010101' });
  const b = await start(user, { method: 'mtn_money', phone: '0502020202' });
  // L'abonné valide finalement l'ancienne demande Orange.
  fake.setStatus(await referenceOf(a.payment.id), 'completed');
  await postWebhook(fake.webhook(await referenceOf(a.payment.id), 'payment.success'));
  assert.equal((await Payment.findById(a.payment.id)).status, 'SUCCEEDED');
  assert.equal(await isActive(user), true);
  // La nouvelle tentative garde ses propres informations.
  const current = await paymentService.getMyPayment(user, b.payment.id);
  assert.equal(current.methodLabel, 'MTN Mobile Money');
  assert.equal(current.phone, '05 02 02 02 02');
  await paymentService.cancelMyPayment(user, b.payment.id);
});

test('confirmation steps are only given after initiation and match the operator used', { skip }, async () => {
  const plans = await paymentService.getPublicPlans();
  assert.ok(plans.methods.every((m) => m.confirmSteps === undefined), 'no instructions before initiation');

  const orangeUser = await newUser();
  const orange = await start(orangeUser, { method: 'orange_money', phone: '0701010101' });
  assert.deepEqual(orange.payment.confirmSteps, ['Composez #120#', 'Saisissez votre mot de passe', 'Confirmez le paiement']);
  assert.equal(orange.payment.phone, '07 01 01 01 01');

  const mtn = await start(orangeUser, { method: 'mtn_money', phone: '0701010101' });
  assert.deepEqual(mtn.payment.confirmSteps, ['Composez *133#', 'Choisissez l’option 1', 'Confirmez le paiement']);
  await paymentService.cancelMyPayment(orangeUser, mtn.payment.id);

  const waveUser = await newUser();
  const wave = await start(waveUser, { method: 'wave' });
  assert.deepEqual(wave.payment.confirmSteps, [], 'no USSD instructions for Wave');
  await paymentService.cancelMyPayment(waveUser, wave.payment.id);
});

test('repeated webhook: processed once, subscription extended once', { skip }, async () => {
  const user = await newUser();
  const { payment } = await start(user);
  const reference = await referenceOf(payment.id);
  fake.setStatus(reference, 'completed');

  const webhook = fake.webhook(reference, 'payment.success', { id: 'evt-repeat' });
  const responses = await Promise.all([postWebhook(webhook), postWebhook(webhook), postWebhook(webhook)]);
  assert.ok(responses.every((r) => r.status === 200));
  // Même succès livré sous un autre identifiant d'événement : toujours sans effet.
  await postWebhook(fake.webhook(reference, 'payment.success', { id: 'evt-other' }));
  await paymentService.getMyPayment(user, payment.id);

  assert.equal(await appliedCount(user), 1);
  assert.equal(await PaymentWebhookEvent.countDocuments({ eventId: 'evt-repeat' }), 1);
  assert.equal(await Payment.countDocuments({ user: user._id }), 1);
});

test('a forged success is ignored when GeniusPay still reports pending', { skip }, async () => {
  const user = await newUser();
  const { payment } = await start(user);
  const reference = await referenceOf(payment.id);
  // Signature valide mais GeniusPay (l'API) dit « pending » : l'API fait autorité.
  await postWebhook(fake.webhook(reference, 'payment.success', { data: { status: 'completed' } }));
  assert.equal((await Payment.findById(payment.id)).status, 'PENDING');
  assert.equal(await isActive(user), false);
  await paymentService.cancelMyPayment(user, payment.id);
});

test('invalid signature is rejected over HTTP and changes nothing', { skip }, async () => {
  const user = await newUser();
  const { payment } = await start(user);
  const reference = await referenceOf(payment.id);
  fake.setStatus(reference, 'completed');
  const forged = fake.webhook(reference, 'payment.success', { secret: 'whsec_attacker' });
  const response = await postWebhook(forged);
  assert.equal(response.status, 401);
  assert.equal(response.body.success, false);
  assert.ok(!JSON.stringify(response.body).includes('whsec'), 'no secret in the response');
  assert.equal((await Payment.findById(payment.id)).status, 'PENDING');
  await paymentService.cancelMyPayment(user, payment.id);
});

test('amount mismatch at GeniusPay never activates the subscription', { skip }, async () => {
  const user = await newUser();
  const { payment } = await start(user);
  const reference = await referenceOf(payment.id);
  fake.setStatus(reference, 'completed', { amount: 200 });
  const current = await paymentService.getMyPayment(user, payment.id);
  assert.equal(current.status, 'FAILED');
  assert.equal(await isActive(user), false);
});

test('expired at GeniusPay or past local delay: not activated', { skip }, async () => {
  const user = await newUser();
  const first = await start(user);
  fake.setStatus(await referenceOf(first.payment.id), 'expired');
  assert.equal((await paymentService.getMyPayment(user, first.payment.id)).status, 'EXPIRED');

  const second = await start(user);
  await Payment.updateOne({ _id: second.payment.id }, { $set: { expiresAt: new Date(Date.now() - 1000) } });
  assert.equal((await paymentService.getMyPayment(user, second.payment.id)).status, 'EXPIRED');
  assert.equal(await isActive(user), false);
});

test('a payment confirmed after local expiry or cancellation is still honoured', { skip }, async () => {
  const user = await newUser();
  const { payment } = await start(user);
  const reference = await referenceOf(payment.id);
  await paymentService.cancelMyPayment(user, payment.id);
  assert.equal(await isActive(user), false);

  // L'abonné a finalement payé sur la page GeniusPay encore ouverte.
  fake.setStatus(reference, 'completed');
  await postWebhook(fake.webhook(reference, 'payment.success'));
  assert.equal((await Payment.findById(payment.id)).status, 'SUCCEEDED');
  assert.equal(await isActive(user), true);
});

test('GeniusPay errors are reported without technical details and release the lock', { skip }, async () => {
  const user = await newUser();
  fake.failNextRequest({ status: 400, code: 'PAYMENT_INIT_FAILED' });
  await assert.rejects(start(user), (error) => {
    assert.equal(error.errorCode, 'PAYMENT_PROVIDER_ERROR');
    assert.ok(!error.message.includes('raw provider detail'));
    return true;
  });

  fake.failNextRequest('network');
  await assert.rejects(start(user), { errorCode: 'PAYMENT_PROVIDER_UNAVAILABLE' });

  assert.equal(await Payment.countDocuments({ user: user._id, status: 'FAILED' }), 2);
  const retry = await start(user);
  assert.equal(retry.payment.status, 'PENDING', 'the user can retry immediately');
});

test('a malicious return URL is never forwarded to GeniusPay', { skip }, async () => {
  const user = await newUser();
  await start(user, { returnUrl: 'https://evil.example/phish' });
  const sent = fake.requests.filter((r) => r.method === 'POST').at(-1).body;
  assert.ok(!sent.success_url.includes('evil.example'));
});

test('HTTP: admin disables a method, it vanishes from /plans and a direct API call is refused', { skip }, async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
  const buyer = await newUser();
  const auth = (user) => ({ Authorization: `Bearer ${user.getSignedJwtToken()}`, 'Content-Type': 'application/json' });
  const call = async (method, path, user, body) => {
    const response = await fetch(`${apiUrl}${path}`, { method, headers: user ? auth(user) : {}, body: body ? JSON.stringify(body) : undefined });
    return { status: response.status, body: await response.json() };
  };

  // Un abonné ne peut pas modifier la configuration.
  assert.equal((await call('PATCH', '/api/admin/payment-methods/orange_money', buyer, { enabled: false })).status, 403);

  const disabled = await call('PATCH', '/api/admin/payment-methods/orange_money', admin, { enabled: false });
  assert.equal(disabled.status, 200);
  assert.equal(disabled.body.data.enabled, false);

  const plans = await call('GET', '/api/payments/plans');
  assert.ok(!plans.body.data.methods.some((m) => m.code === 'orange_money'));
  assert.ok(!JSON.stringify(plans.body).match(/sk_|pk_|whsec/), 'no key in the public payload');

  const direct = await call('POST', '/api/payments', buyer, { method: 'orange_money', phone: '0701020304' });
  assert.equal(direct.status, 400);
  assert.equal(direct.body.code, 'PAYMENT_METHOD_DISABLED');

  // Un montant envoyé par le client est ignoré : seul le devis serveur compte.
  const tampered = await call('POST', '/api/payments', buyer, { method: 'wave', phone: '0701020304', amount: 1 });
  assert.equal(tampered.status, 201);
  assert.equal(tampered.body.data.payment.amount, 2000);

  await call('PATCH', '/api/admin/payment-methods/orange_money', admin, { enabled: true });
});

test('server reconciliation activates a paid subscription without webhook nor client polling', { skip }, async () => {
  const { reconcileOpenPayments } = require('../services/payments/reconciler');
  const user = await newUser();
  const { payment } = await start(user);
  // L'abonné a payé puis fermé la page ; aucun webhook n'arrive.
  fake.setStatus(await referenceOf(payment.id), 'completed');
  // createdAt est immuable pour Mongoose : on vieillit le paiement directement en base.
  await Payment.collection.updateOne({ _id: new mongoose.Types.ObjectId(String(payment.id)) }, { $set: { createdAt: new Date(Date.now() - 60 * 1000) } });

  const result = await reconcileOpenPayments();
  assert.ok(result.checked >= 1);
  assert.equal((await Payment.findById(payment.id)).status, 'SUCCEEDED');
  assert.equal(await isActive(user), true);
});

// ── Routage par opérateur (constaté en production) ─────

test('MTN and Orange are routed through PawaPay as a phone push, without redirection', { skip }, async () => {
  for (const [code, operator] of [['mtn_money', 'MTN_MOMO_CIV'], ['orange_money', 'ORANGE_CIV']]) {
    const user = await newUser();
    const result = await start(user, { method: code, phone: '0701020304' });
    const sent = fake.requests.filter((r) => r.method === 'POST').at(-1).body;
    assert.equal(sent.payment_method, 'pawapay', 'never mtn_money/orange_money: GeniusPay reroutes them to Wave');
    assert.equal(sent.mmo_provider, operator);
    assert.equal(sent.customer.phone, '+2250701020304');

    assert.equal(result.flow, 'push');
    assert.equal(result.redirectUrl, null, 'no external page: the user validates on the phone');
    assert.equal(result.payment.phoneHint, '07 •• •• •• 04');
    assert.match(result.instructions, /07 •• •• •• 04/);
    assert.ok(!result.instructions.includes('0701020304'), 'full number never echoed');

    // Validation sur le téléphone → confirmation par l'API.
    fake.setStatus(await referenceOf(result.payment.id), 'completed');
    assert.equal((await paymentService.getMyPayment(user, result.payment.id)).status, 'SUCCEEDED');
  }
});

test('Wave keeps the redirect flow (QR code page)', { skip }, async () => {
  const user = await newUser();
  const result = await start(user, { method: 'wave' });
  const sent = fake.requests.filter((r) => r.method === 'POST').at(-1).body;
  assert.equal(sent.payment_method, 'wave');
  assert.equal(sent.mmo_provider, undefined);
  assert.equal(result.flow, 'redirect');
  assert.ok(result.redirectUrl);
  await paymentService.cancelMyPayment(user, result.payment.id);
});

test('an operator closed at GeniusPay is hidden and refused, and reappears when it opens', { skip }, async () => {
  const user = await newUser();
  await assert.rejects(start(user, { method: 'moov_money' }), { errorCode: 'PAYMENT_METHOD_UNAVAILABLE' });
  const admin = (await methodService.adminList()).find((m) => m.code === 'moov_money');
  assert.equal(admin.enabled, true);
  assert.equal(admin.availableAtProvider, false);

  // Le cache de découverte expire : on simule l'ouverture de Moov en le vidant.
  fake.setOpenOperators(['MTN_MOMO_CIV', 'ORANGE_CIV', 'MOOV_CIV']);
  require('../services/payments/index').getPaymentProvider().mmoCache = null;
  assert.ok((await paymentService.getPublicPlans()).methods.some((m) => m.code === 'moov_money'));
  fake.setOpenOperators(['MTN_MOMO_CIV', 'ORANGE_CIV']);
  require('../services/payments/index').getPaymentProvider().mmoCache = null;
});

test('methods saved before routing existed are completed, admin settings kept', { skip }, async () => {
  // État d'une base créée avant le routage : MTN désactivé par l'admin, sans passerelle.
  await PaymentMethod.collection.updateOne({ code: 'mtn_money' }, { $unset: { gatewayMethod: '', mmoProvider: '', flow: '' }, $set: { enabled: false } });
  methodService.resetSeedCache();
  const mtn = (await methodService.adminList()).find((m) => m.code === 'mtn_money');
  assert.equal(mtn.gatewayMethod, 'pawapay');
  assert.equal(mtn.mmoProvider, 'MTN_MOMO_CIV');
  assert.equal(mtn.flow, 'push');
  assert.equal(mtn.enabled, false, 'admin choice preserved');
  await methodService.adminUpdate('mtn_money', { enabled: true }, admin);
});

// ── Retour arrière puis nouvelle tentative (scénarios A à D) ─────

const lastSent = () => fake.requests.filter((r) => r.method === 'POST').at(-1).body;

const retryScenario = async ({ first, second }) => {
  const user = await newUser();
  const a = await start(user, first);
  // L'abonné revient en arrière sans finaliser, modifie ses informations et relance.
  const b = await start(user, second);
  return { user, a, b };
};

for (const [name, first, second, expected] of [
  ['A: Wave + number A, back, Orange + number B', { method: 'wave', phone: '0701010101' }, { method: 'orange_money', phone: '0502020202' }, { gateway: 'pawapay', operator: 'ORANGE_CIV', phone: '+2250502020202', label: 'Orange Money' }],
  ['B: Orange + number A, back, Orange + number B', { method: 'orange_money', phone: '0701010101' }, { method: 'orange_money', phone: '0502020202' }, { gateway: 'pawapay', operator: 'ORANGE_CIV', phone: '+2250502020202', label: 'Orange Money' }],
  ['C: Orange + number A, back, MTN + number A', { method: 'orange_money', phone: '0701010101' }, { method: 'mtn_money', phone: '0701010101' }, { gateway: 'pawapay', operator: 'MTN_MOMO_CIV', phone: '+2250701010101', label: 'MTN Mobile Money' }],
  ['D: Orange + number A, back, Orange + number A again', { method: 'orange_money', phone: '0701010101' }, { method: 'orange_money', phone: '0701010101' }, { gateway: 'pawapay', operator: 'ORANGE_CIV', phone: '+2250701010101', label: 'Orange Money' }],
]) {
  test(`scenario ${name}: the new attempt uses only the new values`, { skip }, async () => {
    const { user, a, b } = await retryScenario({ first, second });
    const sent = lastSent();
    assert.equal(sent.payment_method, expected.gateway);
    assert.equal(sent.mmo_provider, expected.operator);
    assert.equal(sent.customer.phone, expected.phone);
    assert.equal(sent.metadata.payment_id, String(b.payment.id));

    assert.notEqual(String(b.payment.id), String(a.payment.id), 'a new transaction, never the old one');
    assert.equal(b.payment.methodLabel, expected.label);
    assert.equal(b.payment.phone, second.phone.replace(/(\d{2})(?=\d)/g, '$1 '));

    // L'ancienne tentative est close ; une seule tentative reste ouverte.
    assert.equal((await Payment.findById(a.payment.id)).status, 'CANCELLED');
    assert.equal(await Payment.countDocuments({ user: user._id, openFor: { $exists: true } }), 1);
    await paymentService.cancelMyPayment(user, b.payment.id);
  });
}

test('HTTP: scenario A as sent by the apps, displayed data equals data sent to GeniusPay', { skip }, async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
  const user = await newUser();
  const post = async (body) => {
    const response = await fetch(`${apiUrl}/api/payments`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${user.getSignedJwtToken()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel: 'web', ...body }),
    });
    return { status: response.status, body: await response.json() };
  };

  const first = await post({ method: 'wave', phone: '0701010101', attemptId: 'attempt-http-A1' });
  assert.equal(first.status, 201);
  // Retour arrière, puis Orange + autre numéro : nouvelle tentative, nouvel identifiant.
  const second = await post({ method: 'orange_money', phone: '0502020202', attemptId: 'attempt-http-A2' });
  assert.equal(second.status, 201);

  const sent = lastSent();
  const shown = second.body.data.payment;
  assert.equal(sent.mmo_provider, 'ORANGE_CIV');
  assert.equal(sent.customer.phone, '+2250502020202');
  assert.equal(shown.methodLabel, 'Orange Money');
  assert.equal(shown.phone, '05 02 02 02 02');
  assert.deepEqual(shown.confirmSteps, ['Composez #120#', 'Saisissez votre mot de passe', 'Confirmez le paiement']);
  assert.equal(second.body.data.redirectUrl, null);
  assert.ok(!('attemptId' in shown) && !JSON.stringify(shown).includes('pawapay'), 'no internal routing exposed');

  // Relecture de la tentative (polling) : toujours les nouvelles valeurs.
  const polled = await fetch(`${apiUrl}/api/payments/${shown.id}`, { headers: { Authorization: `Bearer ${user.getSignedJwtToken()}` } }).then((r) => r.json());
  assert.equal(polled.data.methodLabel, 'Orange Money');
  assert.equal(polled.data.phone, '05 02 02 02 02');
  assert.equal((await Payment.findById(first.body.data.payment.id)).status, 'CANCELLED');
});

// ── Mobile → web → mobile : un seul compte, un seul état côté serveur ─────

const api = async (method, path, token, body) => {
  const response = await fetch(`${apiUrl}${path}`, {
    method,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: response.status, body: await response.json() };
};

/** L'app mobile ouvre le site : code de passage, échangé par le site contre une session du MÊME compte. */
const openWebFromApp = async (mobileToken) => {
  const handoff = await api('POST', '/api/auth/handoff', mobileToken);
  assert.equal(handoff.status, 201);
  const exchange = await api('POST', '/api/auth/handoff/exchange', null, { code: handoff.body.data.code });
  assert.equal(exchange.status, 200);
  return { webToken: exchange.body.token, webUser: exchange.body.user, code: handoff.body.data.code };
};

test('mobile → web → mobile: Wave payment on the web unlocks the app immediately (no webhook)', { skip }, async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
  await methodService.adminUpdate('wave', { enabled: true }, admin);
  for (const code of ['orange_money', 'mtn_money', 'moov_money', 'card']) await methodService.adminUpdate(code, { enabled: false }, admin);

  const user = await newUser();
  const mobileToken = user.getSignedJwtToken();

  // 1. Dans l'app : pas d'accès.
  let mobile = await api('GET', '/api/me/entitlements', mobileToken);
  assert.equal(mobile.body.data.canDownload, false);
  assert.ok(mobile.body.data.checkout.webCheckoutUrl.endsWith('/abonnement'));

  // 2. Ouverture du site : même compte, sans ressaisie.
  const { webToken, webUser, code } = await openWebFromApp(mobileToken);
  assert.equal(String(webUser.id), String(user._id), 'same account on the web');
  assert.equal((await api('POST', '/api/auth/handoff/exchange', null, { code })).status, 401, 'code is single-use');

  // 3. Sur le site : Wave est le seul moyen proposé ; les autres sont refusés même en direct.
  const plans = await api('GET', '/api/payments/plans');
  assert.deepEqual(plans.body.data.methods.map((m) => m.code), ['wave']);
  const orange = await api('POST', '/api/payments', webToken, { method: 'orange_money', phone: '0701010101' });
  assert.equal(orange.body.code, 'PAYMENT_METHOD_DISABLED');

  // 4. Paiement Wave depuis le site ouvert par l'app : le retour Wave ramène vers l'app.
  const paid = await api('POST', '/api/payments', webToken, {
    method: 'wave', phone: '0701010101', channel: 'mobile', returnUrl: 'fatafalta://abonnement-retour', attemptId: 'attempt-sync-1',
  });
  assert.equal(paid.status, 201);
  assert.ok(paid.body.data.redirectUrl);
  const sent = lastSent();
  assert.equal(sent.payment_method, 'wave');
  assert.equal(sent.metadata.user_id, String(user._id), 'payment attached to the right user');
  assert.ok(sent.success_url.includes(encodeURIComponent('fatafalta://abonnement-retour')));

  // 5. Pendant le paiement, l'app voit « en cours » (même état serveur que le site).
  mobile = await api('GET', '/api/me/subscription', mobileToken);
  assert.equal(mobile.body.data.status, 'PENDING');

  // 6. Wave confirme ; aucun webhook ni polling web : l'app relit et obtient l'accès aussitôt.
  fake.setStatus(await referenceOf(paid.body.data.payment.id), 'completed');
  mobile = await api('GET', '/api/me/entitlements', mobileToken);
  assert.equal(mobile.body.data.subscription.status, 'ACTIVE');
  assert.equal(mobile.body.data.canDownload, true);

  // 7. Le site et l'app affichent le même paiement.
  const web = await api('GET', '/api/me/subscription', webToken);
  const app = await api('GET', '/api/me/subscription', mobileToken);
  assert.equal(web.body.data.currentPeriodEnd, app.body.data.currentPeriodEnd);
  assert.equal(app.body.data.payments[0].status, 'SUCCEEDED');
  assert.equal(app.body.data.payments[0].methodLabel, 'Wave');
});

test('web → mobile: a payment confirmed by webhook is visible in the app without any action', { skip }, async () => {
  const user = await newUser();
  const mobileToken = user.getSignedJwtToken();
  const { webToken } = await openWebFromApp(mobileToken);
  const paid = await api('POST', '/api/payments', webToken, { method: 'wave', phone: '0701010101', attemptId: 'attempt-sync-2' });
  const reference = await referenceOf(paid.body.data.payment.id);
  fake.setStatus(reference, 'completed');
  await postWebhook(fake.webhook(reference, 'payment.success'));

  const app = await api('GET', '/api/me/entitlements', mobileToken);
  assert.equal(app.body.data.canDownload, true);
});

test('disabled operators keep their full configuration and can be re-enabled from admin', { skip }, async () => {
  const mtn = (await methodService.adminList()).find((m) => m.code === 'mtn_money');
  assert.equal(mtn.enabled, false);
  assert.equal(mtn.gatewayMethod, 'pawapay');
  assert.equal(mtn.mmoProvider, 'MTN_MOMO_CIV');
  assert.deepEqual(mtn.confirmSteps, ['Composez *133#', 'Choisissez l’option 1', 'Confirmez le paiement']);

  await methodService.adminUpdate('mtn_money', { enabled: true }, admin);
  assert.ok((await paymentService.getPublicPlans()).methods.some((m) => m.code === 'mtn_money'));
  await methodService.adminUpdate('mtn_money', { enabled: false }, admin);
});
