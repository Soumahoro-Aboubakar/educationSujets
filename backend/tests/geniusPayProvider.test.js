/**
 * Tests unitaires du provider GeniusPay, contre un faux serveur conforme à la documentation.
 *   node --test tests/geniusPayProvider.test.js
 */
process.env.NODE_ENV = 'test';

const test = require('node:test');
const assert = require('node:assert/strict');
const GeniusPayProvider = require('../services/payments/providers/GeniusPayProvider');
const { readConfig, configWarnings } = require('../config/geniuspay');
const { startFakeGeniusPay, toExpressRequest, KEYS, WEBHOOK_SECRET } = require('./helpers/fakeGeniusPay');

let fake;
let provider;

const configFor = (overrides = {}) => readConfig({
  GENIUSPAY_ENV: 'sandbox',
  GENIUSPAY_API_KEY: KEYS.sandbox.apiKey,
  GENIUSPAY_API_SECRET: KEYS.sandbox.apiSecret,
  GENIUSPAY_WEBHOOK_SECRET: WEBHOOK_SECRET,
  GENIUSPAY_BASE_URL: fake.baseUrl,
  ...overrides,
});

const payment = { _id: '65f000000000000000000001', user: '65f000000000000000000002', kind: 'initial', amount: 2000, currency: 'XOF' };
const method = { code: 'wave', label: 'Wave' };

test.before(async () => {
  fake = await startFakeGeniusPay();
  provider = new GeniusPayProvider(configFor());
});

test.after(() => fake.close());

test('defaults to the sandbox environment', () => {
  const config = readConfig({});
  assert.equal(config.env, 'sandbox');
  assert.equal(config.apiEnvironment, 'sandbox');
});

test('refuses keys that do not match GENIUSPAY_ENV', () => {
  assert.throws(() => new GeniusPayProvider(configFor({ GENIUSPAY_ENV: 'production' })), /ne correspondent pas/);
  assert.throws(() => new GeniusPayProvider(configFor({ GENIUSPAY_API_KEY: KEYS.production.apiKey })), /ne correspondent pas/);
  assert.throws(() => new GeniusPayProvider(configFor({ GENIUSPAY_ENV: 'staging' })), /GENIUSPAY_ENV invalide/);
});

test('production requires live keys; webhook secret and https only raise warnings', () => {
  const live = {
    GENIUSPAY_ENV: 'production',
    GENIUSPAY_API_KEY: KEYS.production.apiKey,
    GENIUSPAY_API_SECRET: KEYS.production.apiSecret,
    GENIUSPAY_WEBHOOK_SECRET: WEBHOOK_SECRET,
    FRONTEND_URL: process.env.FRONTEND_URL,
  };
  assert.equal(new GeniusPayProvider(configFor(live)).environment, 'live');
  assert.deepEqual(configWarnings(configFor(live)), []);

  // Production locale sans webhook ni https : utilisable, avec avertissements explicites.
  const local = configFor({ ...live, GENIUSPAY_WEBHOOK_SECRET: '', FRONTEND_URL: process.env.FRONTEND_URL?.replace(/^https:/, 'http:') });
  assert.equal(new GeniusPayProvider(local).environment, 'live');
  const warnings = configWarnings(local);
  assert.equal(warnings.length, 2);
  assert.match(warnings.join(' '), /GENIUSPAY_WEBHOOK_SECRET/);
  assert.match(warnings.join(' '), /https/);
});

test('configuration errors never reveal the keys', () => {
  try {
    new GeniusPayProvider(configFor({ GENIUSPAY_ENV: 'production' }));
    assert.fail('should throw');
  } catch (error) {
    assert.ok(!error.message.includes(KEYS.sandbox.apiSecret));
    assert.ok(!error.message.includes(KEYS.sandbox.apiKey));
  }
});

test('initiate sends the documented payload and returns the redirect URL', async () => {
  const started = await provider.initiate({
    payment,
    phone: '0701020304',
    method,
    user: { name: 'Awa', email: 'awa@test.ci' },
    description: 'Fatafalta · Abonnement 4 mois',
    successUrl: 'https://fatafalta.com/abonnement?payment=1&outcome=success',
    errorUrl: 'https://fatafalta.com/abonnement?payment=1&outcome=error',
  });

  const sent = fake.requests.at(-1);
  assert.equal(sent.method, 'POST');
  assert.equal(sent.url, '/payments');
  assert.equal(sent.headers['x-api-key'], KEYS.sandbox.apiKey);
  assert.equal(sent.body.amount, 2000);
  assert.equal(sent.body.currency, 'XOF');
  assert.equal(sent.body.payment_method, 'wave');
  assert.equal(sent.body.customer.phone, '+2250701020304');
  assert.equal(sent.body.metadata.payment_id, payment._id);
  assert.ok(sent.body.success_url.includes('outcome=success'));

  assert.match(started.providerRef, /^MTX-/);
  assert.equal(started.status, 'PENDING');
  assert.equal(started.environment, 'sandbox');
  assert.ok(started.redirectUrl.startsWith('https://pay.example/'));
});

test('getStatus maps every documented GeniusPay status', async () => {
  const { providerRef } = await provider.initiate({ payment, phone: '0701020304', method });
  const expected = { pending: 'PENDING', processing: 'PROCESSING', completed: 'SUCCEEDED', failed: 'FAILED', cancelled: 'CANCELLED', expired: 'EXPIRED', refunded: null };
  for (const [raw, status] of Object.entries(expected)) {
    fake.setStatus(providerRef, raw);
    const result = await provider.getStatus({ providerRef });
    assert.equal(result.status, status, raw);
    assert.equal(result.providerStatus, raw);
    assert.equal(result.amount, 2000);
  }
});

test('API and network errors become typed errors without the raw provider message', async () => {
  fake.failNextRequest({ status: 400, code: 'PAYMENT_INIT_FAILED' });
  await assert.rejects(provider.initiate({ payment, phone: '0701020304', method }), (error) => {
    assert.equal(error.name, 'GeniusPayError');
    assert.equal(error.code, 'PAYMENT_INIT_FAILED');
    assert.equal(error.retriable, false);
    assert.ok(!error.message.includes('raw provider detail'));
    return true;
  });

  fake.failNextRequest({ status: 503, code: 'UNAVAILABLE' });
  await assert.rejects(provider.getStatus({ providerRef: 'MTX-X' }), { retriable: true });

  // Lecture : une coupure isolée est absorbée par une nouvelle tentative…
  const { providerRef } = await provider.initiate({ payment, phone: '0701020304', method });
  fake.failNextRequest('network');
  assert.equal((await provider.getStatus({ providerRef })).providerRef, providerRef);
  // … mais deux coupures consécutives remontent une erreur.
  fake.failNextRequest('network', 2);
  await assert.rejects(provider.getStatus({ providerRef }), { retriable: true });

  // Création : une requête coupée après envoi n'est jamais renvoyée (pas de double transaction).
  const posts = fake.requests.filter((r) => r.method === 'POST').length;
  fake.failNextRequest('network');
  await assert.rejects(provider.initiate({ payment, phone: '0701020304', method }), { retriable: true });
  assert.equal(fake.requests.filter((r) => r.method === 'POST').length, posts + 1);
});

test('a correctly signed webhook is accepted and normalized', async () => {
  const { providerRef } = await provider.initiate({ payment, phone: '0701020304', method });
  fake.setStatus(providerRef, 'completed');
  const webhook = fake.webhook(providerRef, 'payment.success', { id: 'evt-1' });
  const event = await provider.parseWebhook(toExpressRequest(webhook));
  assert.equal(event.eventId, 'evt-1');
  assert.equal(event.status, 'SUCCEEDED');
  assert.equal(event.providerRef, providerRef);
  assert.equal(event.environment, 'sandbox');
  assert.equal(event.metadata.payment_id, payment._id);
});

test('signature prefixed with sha256= is accepted', async () => {
  const webhook = fake.webhook('MTX-PREFIX', 'payment.failed');
  webhook.headers['x-webhook-signature'] = `sha256=${webhook.headers['x-webhook-signature']}`;
  const event = await provider.parseWebhook(toExpressRequest(webhook));
  assert.equal(event.status, 'FAILED');
});

test('tampered, unsigned, stale or foreign-environment webhooks are rejected', async () => {
  const tampered = fake.webhook('MTX-T', 'payment.failed');
  tampered.raw = tampered.raw.replace('"event":"payment.failed"', '"event":"payment.success"');
  assert.ok(tampered.raw.includes('payment.success'));
  await assert.rejects(provider.parseWebhook(toExpressRequest(tampered)), { name: 'WebhookRejectedError', statusCode: 401 });

  const wrongSecret = fake.webhook('MTX-T', 'payment.success', { secret: 'whsec_other' });
  await assert.rejects(provider.parseWebhook(toExpressRequest(wrongSecret)), { statusCode: 401 });

  const unsigned = fake.webhook('MTX-T', 'payment.success');
  delete unsigned.headers['x-webhook-signature'];
  await assert.rejects(provider.parseWebhook(toExpressRequest(unsigned)), { statusCode: 401 });

  const stale = fake.webhook('MTX-T', 'payment.success', { timestamp: Math.floor(Date.now() / 1000) - 3600 });
  await assert.rejects(provider.parseWebhook(toExpressRequest(stale)), { statusCode: 400 });

  const live = fake.webhook('MTX-T', 'payment.success', { environment: 'live' });
  await assert.rejects(provider.parseWebhook(toExpressRequest(live)), /Environnement inattendu/);
});

test('webhooks are refused when no secret is configured (sandbox)', async () => {
  const noSecret = new GeniusPayProvider(configFor({ GENIUSPAY_WEBHOOK_SECRET: '' }));
  const webhook = fake.webhook('MTX-S', 'payment.success');
  await assert.rejects(noSecret.parseWebhook(toExpressRequest(webhook)), { statusCode: 503 });
});

test('switching to production only takes environment variables', async () => {
  const liveServer = await startFakeGeniusPay({ env: 'production' });
  try {
    const live = new GeniusPayProvider(readConfig({
      GENIUSPAY_ENV: 'production',
      GENIUSPAY_API_KEY: KEYS.production.apiKey,
      GENIUSPAY_API_SECRET: KEYS.production.apiSecret,
      GENIUSPAY_WEBHOOK_SECRET: WEBHOOK_SECRET,
      GENIUSPAY_BASE_URL: liveServer.baseUrl,
      FRONTEND_URL: process.env.FRONTEND_URL,
    }));
    const started = await live.initiate({ payment, phone: '0701020304', method });
    assert.equal(started.environment, 'live');

    // Un webhook sandbox n'est jamais accepté par un serveur de production, et inversement.
    const sandboxHook = liveServer.webhook(started.providerRef, 'payment.success', { environment: 'sandbox' });
    await assert.rejects(live.parseWebhook(toExpressRequest(sandboxHook)), /Environnement inattendu/);
    const liveHook = liveServer.webhook(started.providerRef, 'payment.success');
    await assert.rejects(provider.parseWebhook(toExpressRequest(liveHook)), /Environnement inattendu/);
  } finally {
    await liveServer.close();
  }
});

test('accepts the key format issued by the GeniusPay dashboard (sk_/ss_)', () => {
  const dashboard = new GeniusPayProvider(configFor({ GENIUSPAY_API_KEY: 'sk_sandbox_abc', GENIUSPAY_API_SECRET: 'ss_sandbox_def' }));
  assert.equal(dashboard.environment, 'sandbox');
  assert.throws(() => new GeniusPayProvider(configFor({ GENIUSPAY_API_KEY: 'sk_live_abc', GENIUSPAY_API_SECRET: 'ss_sandbox_def' })), /ne correspondent pas/);
  assert.throws(() => new GeniusPayProvider(configFor({ GENIUSPAY_API_KEY: 'random', GENIUSPAY_API_SECRET: 'ss_sandbox_def' })), /ne correspondent pas/);
});
