/**
 * Tests de sécurité : rate limiting, idempotence, fraude au paiement, anti-bot, erreurs.
 *   TEST_MONGODB_URI=mongodb://127.0.0.1:27017/fatafalta-security-test node --test tests/security.integration.test.js
 * Les tests HTTP sont ignorés si TEST_MONGODB_URI n'est pas défini (ne touche jamais la base de dev/prod).
 * Chaque test utilise sa propre IP simulée (X-Forwarded-For) : les compteurs ne se mélangent pas.
 */
// Défini AVANT tout chargement : dotenv ne remplace pas une variable déjà présente.
Object.assign(process.env, {
  NODE_ENV: 'test',
  PAYMENT_MODE: 'mock',
  // Les paiements restent « en attente » : on teste la création, pas l'aboutissement.
  MOCK_PAYMENT_DELAY_SECONDS: '600',
  JWT_SECRET: 'security-test-access-secret',
  JWT_REFRESH_SECRET: 'security-test-refresh-secret',
  TRUST_PROXY: '1',
  TRUST_CF_CONNECTING_IP: 'false',
  TURNSTILE_SECRET_KEY: '',
  CORS_ORIGINS: '',
  PAYMENT_RECONCILE_INTERVAL_SECONDS: '0',
});

const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const uri = process.env.TEST_MONGODB_URI;
const skip = !uri && 'TEST_MONGODB_URI non defini';

const User = require('../models/User');
const Payment = require('../models/Payment');
const PaymentMethod = require('../models/PaymentMethod');
const abuse = require('../services/security/abuseTracker');
const breaker = require('../services/payments/circuitBreaker');
const securityConfig = require('../config/security');

let app;
let httpServer;
let apiUrl;
let ipCounter = 0;
let userCounter = 0;

/** Nouvelle IP simulée, propre à un scénario. */
const freshIp = () => {
  ipCounter += 1;
  return `10.${Math.floor(ipCounter / 250) % 250}.${ipCounter % 250}.${(ipCounter * 7) % 250 + 1}`;
};

const newUser = async (overrides = {}) => {
  userCounter += 1;
  return User.create({ name: `Test ${userCounter}`, email: `sec${userCounter}-${Date.now()}@test.ci`, password: 'secret123', ...overrides });
};

const tokenOf = (user) => user.getSignedJwtToken();

const call = async (method, path, { token, body, ip, headers = {}, raw } = {}) => {
  const response = await fetch(`${apiUrl}${path}`, {
    method,
    headers: {
      'User-Agent': 'Mozilla/5.0 (security-test)',
      ...(body !== undefined || raw !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(ip ? { 'X-Forwarded-For': ip } : {}),
      ...headers,
    },
    body: raw !== undefined ? raw : body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let json;
  try { json = JSON.parse(text); } catch (error) { json = { raw: text }; }
  return { status: response.status, body: json, headers: response.headers };
};

const pay = (user, ip, body = {}) => call('POST', '/api/payments', {
  token: tokenOf(user), ip, body: { method: 'wave', phone: '0701020304', ...body },
});

test.before(async () => {
  if (skip) return;
  await mongoose.connect(uri);
  await mongoose.connection.dropDatabase();
  await Promise.all([Payment.syncIndexes(), User.syncIndexes()]);
  app = require('../server');
  httpServer = app.listen(0);
  apiUrl = `http://127.0.0.1:${httpServer.address().port}`;
  // Initialise les moyens de paiement (Wave activé par défaut).
  await call('GET', '/api/payments/plans', { ip: freshIp() });
});

test.after(async () => {
  if (skip) return;
  httpServer?.close();
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

test.beforeEach(() => {
  abuse.reset();
  breaker.reset();
});

// ═══════════════════════════ Paiement ═══════════════════════════

test('payment: rapid double/triple click with the same attemptId creates exactly one transaction', { skip }, async () => {
  const user = await newUser();
  const ip = freshIp();
  const attemptId = 'click-storm-0001';
  const results = await Promise.all([1, 2, 3].map(() => pay(user, ip, { attemptId })));

  results.forEach((r) => assert.equal(r.status, 201, JSON.stringify(r.body)));
  const ids = new Set(results.map((r) => String(r.body.data.payment.id)));
  assert.equal(ids.size, 1, 'all clicks receive the same payment');
  assert.equal(await Payment.countDocuments({ user: user._id }), 1);
});

test('payment: the same request replayed later returns the same transaction (Idempotency-Key header too)', { skip }, async () => {
  const user = await newUser();
  const ip = freshIp();
  const first = await call('POST', '/api/payments', {
    token: tokenOf(user), ip, body: { method: 'wave', phone: '0701020304' }, headers: { 'Idempotency-Key': 'header-key-0001' },
  });
  assert.equal(first.status, 201);
  const again = await call('POST', '/api/payments', {
    token: tokenOf(user), ip, body: { method: 'wave', phone: '0701020304' }, headers: { 'Idempotency-Key': 'header-key-0001' },
  });
  assert.equal(again.status, 201);
  assert.equal(String(again.body.data.payment.id), String(first.body.data.payment.id));
  assert.equal(await Payment.countDocuments({ user: user._id }), 1);
});

test('payment: a succeeded payment is never charged twice when its request is replayed', { skip }, async () => {
  const user = await newUser();
  const ip = freshIp();
  const first = await pay(user, ip, { attemptId: 'paid-once-0001' });
  await Payment.updateOne({ _id: first.body.data.payment.id }, { $set: { status: 'SUCCEEDED', fulfilledAt: new Date() }, $unset: { openFor: 1 } });

  const replay = await pay(user, ip, { attemptId: 'paid-once-0001' });
  assert.equal(replay.status, 201);
  assert.equal(String(replay.body.data.payment.id), String(first.body.data.payment.id));
  assert.equal(replay.body.data.payment.status, 'SUCCEEDED');
  assert.equal(await Payment.countDocuments({ user: user._id }), 1);
});

test('payment: changing the phone number or operator under the same attemptId is refused', { skip }, async () => {
  await PaymentMethod.updateOne({ code: 'orange_money' }, { $set: { enabled: true } });
  try {
    const user = await newUser();
    const ip = freshIp();
    assert.equal((await pay(user, ip, { attemptId: 'tamper-0001' })).status, 201);

    const otherPhone = await pay(user, ip, { attemptId: 'tamper-0001', phone: '0505050505' });
    assert.equal(otherPhone.status, 422);
    assert.equal(otherPhone.body.code, 'IDEMPOTENCY_KEY_REUSED');

    const otherOperator = await pay(user, ip, { attemptId: 'tamper-0001', method: 'orange_money' });
    assert.equal(otherOperator.status, 422);
    assert.equal(otherOperator.body.code, 'IDEMPOTENCY_KEY_REUSED');
    assert.equal(await Payment.countDocuments({ user: user._id }), 1);
  } finally {
    await PaymentMethod.updateOne({ code: 'orange_money' }, { $set: { enabled: false } });
  }
});

test('payment: a new attempt (new attemptId) is legitimate and replaces the abandoned one', { skip }, async () => {
  const user = await newUser();
  const ip = freshIp();
  const first = await pay(user, ip, { attemptId: 'legit-retry-0001' });
  const second = await pay(user, ip, { attemptId: 'legit-retry-0002', phone: '0505050505' });
  assert.equal(second.status, 201);
  assert.notEqual(String(second.body.data.payment.id), String(first.body.data.payment.id));
  const previous = await Payment.findById(first.body.data.payment.id);
  assert.equal(previous.status, 'CANCELLED', 'the abandoned attempt is closed, never reused');
});

test('payment: retrying a failed attempt with the same attemptId is allowed (legitimate retry)', { skip }, async () => {
  const user = await newUser();
  const ip = freshIp();
  const first = await pay(user, ip, { attemptId: 'after-fail-0001' });
  await Payment.updateOne({ _id: first.body.data.payment.id }, { $set: { status: 'FAILED' }, $unset: { openFor: 1 } });
  const retry = await pay(user, ip, { attemptId: 'after-fail-0001' });
  assert.equal(retry.status, 201);
  assert.notEqual(String(retry.body.data.payment.id), String(first.body.data.payment.id));
});

test('payment: rapid successive new attempts hit the burst limit with 429 + Retry-After', { skip }, async () => {
  const user = await newUser();
  const ip = freshIp();
  const statuses = [];
  let limited;
  for (let i = 0; i < 5; i += 1) {
    const r = await pay(user, ip, { attemptId: `burst-attempt-${i}-xyz` });
    statuses.push(r.status);
    if (r.status === 429) limited = r;
  }
  assert.deepEqual(statuses.slice(0, 3), [201, 201, 201], 'normal use is not blocked');
  assert.ok(limited, `expected a 429, got ${statuses}`);
  assert.equal(limited.body.code, 'PAYMENT_RATE_LIMITED');
  assert.ok(Number(limited.headers.get('retry-after')) > 0);
  assert.ok(limited.body.retryAfter > 0);
  assert.ok(!limited.body.stack);
});

test('payment: hourly cap counted in the database blocks mass transaction creation', { skip }, async () => {
  const user = await newUser();
  const now = Date.now();
  await Payment.insertMany(Array.from({ length: securityConfig.payments.maxPerHour }, (_, i) => ({
    user: user._id, kind: 'initial', baseAmount: 2000, amount: 2000, method: 'wave', provider: 'mock', status: 'FAILED',
    createdAt: new Date(now - (i + 1) * 60 * 1000),
  })));
  const r = await pay(user, freshIp(), { attemptId: 'over-cap-0001' });
  assert.equal(r.status, 429);
  assert.equal(r.body.code, 'PAYMENT_HOURLY_LIMIT');
  assert.ok(Number(r.headers.get('retry-after')) >= 60);
});

test('payment: client-supplied amount, status and user are ignored (server is the source of truth)', { skip }, async () => {
  const user = await newUser();
  const victim = await newUser();
  const r = await pay(user, freshIp(), {
    attemptId: 'forged-fields-01', amount: 1, baseAmount: 1, discount: 1999, status: 'SUCCEEDED', user: String(victim._id), userId: String(victim._id), kind: 'monthly',
  });
  assert.equal(r.status, 201);
  const stored = await Payment.findById(r.body.data.payment.id);
  assert.equal(stored.amount, 2000, 'server price');
  assert.equal(stored.kind, 'initial');
  assert.notEqual(stored.status, 'SUCCEEDED');
  assert.equal(String(stored.user), String(user._id));
  assert.equal(await Payment.countDocuments({ user: victim._id }), 0);
});

test('payment: a forged unsigned webhook cannot mark a payment as succeeded', { skip }, async () => {
  const user = await newUser();
  const r = await pay(user, freshIp(), { attemptId: 'forged-hook-001' });
  const stored = await Payment.findById(r.body.data.payment.id);
  const hook = await call('POST', '/api/payments/webhooks/mock', { ip: freshIp(), body: { providerRef: stored.providerRef, status: 'SUCCEEDED' } });
  assert.equal(hook.status, 200);
  // Le statut est reconfirmé auprès de l'API du fournisseur, qui dit « en attente ».
  assert.notEqual((await Payment.findById(stored._id)).status, 'SUCCEEDED');
});

test('payment: another user\'s transaction is invisible and cannot be cancelled', { skip }, async () => {
  const owner = await newUser();
  const intruder = await newUser();
  const r = await pay(owner, freshIp(), { attemptId: 'owner-only-0001' });
  const id = r.body.data.payment.id;
  const ip = freshIp();
  assert.equal((await call('GET', `/api/payments/${id}`, { token: tokenOf(intruder), ip })).status, 404);
  assert.equal((await call('POST', `/api/payments/${id}/cancel`, { token: tokenOf(intruder), ip })).status, 404);
  assert.notEqual((await Payment.findById(id)).status, 'CANCELLED');
});

test('payment: invalid identifiers and attemptIds are rejected before any work', { skip }, async () => {
  const user = await newUser();
  const ip = freshIp();
  assert.equal((await call('GET', '/api/payments/not-an-id', { token: tokenOf(user), ip })).status, 400);
  assert.equal((await pay(user, ip, { attemptId: 'x' })).status, 400);
  assert.equal((await pay(user, ip, { attemptId: '../../etc/passwd' })).status, 400);
});

test('payment: a restricted account cannot pay but can still read its space', { skip }, async () => {
  const user = await newUser();
  const ip = freshIp();
  for (let i = 0; i < securityConfig.abuse.userStrikes; i += 1) abuse.recordStrike({ ip: `172.16.0.${i}`, userId: String(user._id), reason: 'test' });
  const blocked = await pay(user, ip, { attemptId: 'restricted-0001' });
  assert.equal(blocked.status, 429);
  assert.equal(blocked.body.code, 'ACCOUNT_TEMPORARILY_RESTRICTED');
  assert.equal((await call('GET', '/api/auth/me', { token: tokenOf(user), ip })).status, 200);
});

test('payment: status polling is limited per user', { skip }, async () => {
  const user = await newUser();
  const ip = freshIp();
  const r = await pay(user, ip, { attemptId: 'polling-0001' });
  let limited = null;
  for (let i = 0; i < securityConfig.limits.paymentStatus.max + 2 && !limited; i += 1) {
    const poll = await call('GET', `/api/payments/${r.body.data.payment.id}`, { token: tokenOf(user), ip });
    if (poll.status === 429) limited = poll;
    // Burst global (60 / 10 s) : on espace légèrement comme un vrai client.
    if (i % 50 === 49) await new Promise((resolve) => { setTimeout(resolve, 10500); });
  }
  assert.ok(limited, 'polling eventually limited');
});

// ═══════════════════════════ API ═══════════════════════════

test('api: a burst of requests from one user is cut with 429 and the user can retry later', { skip }, async () => {
  const user = await newUser();
  const ip = freshIp();
  const results = await Promise.all(Array.from({ length: securityConfig.limits.burstUser.max + 10 }, () => call('GET', '/api/health', { token: tokenOf(user), ip })));
  const limited = results.filter((r) => r.status === 429);
  assert.ok(limited.length >= 10, `expected ≥10 limited, got ${limited.length}`);
  assert.equal(limited[0].body.code, 'RATE_LIMITED');
  assert.ok(Number(limited[0].headers.get('retry-after')) <= 10);
  // Un autre utilisateur derrière la même IP n'est pas pénalisé par le compteur du premier.
  const neighbour = await newUser();
  assert.equal((await call('GET', '/api/health', { token: tokenOf(neighbour), ip })).status, 200);
});

test('api: anonymous visitors sharing one IP get a larger allowance than a single account', { skip }, async () => {
  const ip = freshIp();
  const results = await Promise.all(Array.from({ length: securityConfig.limits.burstUser.max + 20 }, () => call('GET', '/api/health', { ip })));
  assert.ok(results.every((r) => r.status === 200), 'a shared IP (school, CGNAT) is not blocked at the user threshold');
});

test('api: repeated limit hits escalate to a temporary IP block, liftable by an admin', { skip }, async () => {
  const ip = freshIp();
  for (let i = 0; i < securityConfig.abuse.ipStrikes; i += 1) abuse.recordStrike({ ip, reason: 'test' });
  const blocked = await call('GET', '/api/health', { ip });
  assert.equal(blocked.status, 429);
  assert.equal(blocked.body.code, 'IP_TEMPORARILY_BLOCKED');
  assert.ok(Number(blocked.headers.get('retry-after')) > 0);
  // Les autres IP ne sont pas affectées.
  assert.equal((await call('GET', '/api/health', { ip: freshIp() })).status, 200);

  const admin = await newUser({ role: 'admin' });
  const adminIp = freshIp();
  const overview = await call('GET', '/api/admin/security/overview', { token: tokenOf(admin), ip: adminIp });
  assert.ok(overview.body.data.blocks.some((b) => b.type === 'ip' && b.value === ip));
  const lifted = await call('DELETE', `/api/admin/security/blocks/ip/${encodeURIComponent(ip)}`, { token: tokenOf(admin), ip: adminIp });
  assert.equal(lifted.body.data.removed, true);
  assert.equal((await call('GET', '/api/health', { ip })).status, 200);
});

test('api: oversized payloads are refused with 413 without being processed', { skip }, async () => {
  const big = JSON.stringify({ email: 'a@b.ci', password: 'x', filler: 'y'.repeat(300 * 1024) });
  const r = await call('POST', '/api/auth/login', { ip: freshIp(), raw: big });
  assert.equal(r.status, 413);
  assert.equal(r.body.code, 'PAYLOAD_TOO_LARGE');
});

test('api: malformed JSON gets a clean 400 without internals', { skip }, async () => {
  const r = await call('POST', '/api/auth/login', { ip: freshIp(), raw: '{"email": ' });
  assert.equal(r.status, 400);
  assert.equal(r.body.code, 'INVALID_JSON');
  assert.ok(!r.body.stack);
});

test('api: excessive pagination is refused or capped', { skip }, async () => {
  const ip = freshIp();
  assert.equal((await call('GET', '/api/documents?limit=100000', { ip })).status, 400);
  const farPage = await call('GET', '/api/documents?page=999999&limit=10', { ip });
  assert.equal(farPage.status, 200);
  assert.ok(farPage.body.pagination.page <= securityConfig.pagination.maxPage);
});

test('api: NoSQL operators and prototype keys in input are stripped', { skip }, async () => {
  const user = await newUser();
  const ip = freshIp();
  const r = await call('POST', '/api/auth/login', { ip, raw: JSON.stringify({ email: { $gt: '' }, password: { $ne: null } }) });
  assert.equal(r.status, 400);
  assert.ok(!r.body.token);
  const regex = await call('GET', `/api/documents?search[$regex]=.*&limit=5`, { ip });
  assert.notEqual(regex.status, 500);
  const proto = await call('PUT', '/api/me/profile', { token: tokenOf(user), ip, raw: '{"name":"Ok","__proto__":{"role":"admin"},"constructor":{"prototype":{"role":"admin"}}}' });
  assert.equal(proto.status, 200);
  assert.equal((await User.findById(user._id)).role, 'user');
});

test('api: unknown routes answer a JSON 404 and errors carry a request id, never a stack', { skip }, async () => {
  const r = await call('GET', '/api/does-not-exist', { ip: freshIp() });
  assert.equal(r.status, 404);
  assert.equal(r.body.code, 'NOT_FOUND');
  assert.ok(r.body.requestId);
  assert.ok(r.headers.get('x-request-id'));
});

test('api: repeated access to a sensitive endpoint (handoff code generation) is limited', { skip }, async () => {
  const user = await newUser();
  const ip = freshIp();
  const statuses = [];
  for (let i = 0; i < securityConfig.limits.handoffCreate.max + 1; i += 1) {
    statuses.push((await call('POST', '/api/auth/handoff', { token: tokenOf(user), ip })).status);
  }
  assert.equal(statuses.at(-1), 429);
  assert.equal(statuses.filter((s) => s === 201).length, securityConfig.limits.handoffCreate.max);
});

// ═══════════════════════════ Authentification ═══════════════════════════

test('auth: brute force on one account is stopped; a legitimate login elsewhere still works', { skip }, async () => {
  const user = await newUser();
  const attackerIp = freshIp();
  const statuses = [];
  for (let i = 0; i < securityConfig.limits.loginFailuresIpEmail.max + 1; i += 1) {
    statuses.push((await call('POST', '/api/auth/login', { ip: attackerIp, body: { email: user.email, password: `wrong-${i}` } })).status);
  }
  assert.equal(statuses.at(-1), 429);
  // Même le bon mot de passe est refusé à l'attaquant pendant la fenêtre.
  const fromAttacker = await call('POST', '/api/auth/login', { ip: attackerIp, body: { email: user.email, password: 'secret123' } });
  assert.equal(fromAttacker.status, 429);
  assert.equal(fromAttacker.body.code, 'LOGIN_RATE_LIMITED');
  // Le vrai titulaire, depuis sa connexion, n'est pas bloqué.
  const owner = await call('POST', '/api/auth/login', { ip: freshIp(), body: { email: user.email, password: 'secret123' } });
  assert.equal(owner.status, 200);
});

test('auth: successful logins are not counted (a family sharing an IP is not blocked)', { skip }, async () => {
  const ip = freshIp();
  for (let i = 0; i < securityConfig.limits.loginFailuresIpEmail.max + 3; i += 1) {
    const user = await newUser();
    assert.equal((await call('POST', '/api/auth/login', { ip, body: { email: user.email, password: 'secret123' } })).status, 200);
  }
});

test('auth: credential stuffing (many accounts from one IP) blocks the IP', { skip }, async () => {
  const ip = freshIp();
  let last;
  for (let i = 0; i < securityConfig.abuse.distinctEmailFailures; i += 1) {
    last = await call('POST', '/api/auth/login', { ip, body: { email: `victim${i}@test.ci`, password: 'guess' } });
  }
  assert.equal(last.status, 401);
  const next = await call('GET', '/api/health', { ip });
  assert.equal(next.status, 429);
  assert.equal(next.body.code, 'IP_TEMPORARILY_BLOCKED');
});

test('auth: unknown email and wrong password are indistinguishable (message and timing)', { skip }, async () => {
  const user = await newUser();
  const time = async (email) => {
    const started = process.hrtime.bigint();
    const r = await call('POST', '/api/auth/login', { ip: freshIp(), body: { email, password: 'not-the-password' } });
    return { r, ms: Number(process.hrtime.bigint() - started) / 1e6 };
  };
  const known = await time(user.email);
  const unknown = await time(`nobody-${Date.now()}@test.ci`);
  assert.equal(known.r.status, unknown.r.status);
  assert.equal(known.r.body.error, unknown.r.body.error);
  // Le haché factice impose un coût bcrypt comparable (pas de réponse instantanée).
  assert.ok(unknown.ms > known.ms * 0.4, `unknown ${unknown.ms}ms vs known ${known.ms}ms`);
});

test('auth: mass account creation from one IP is limited, scripted clients much sooner', { skip }, async () => {
  const scriptIp = freshIp();
  const scripted = [];
  for (let i = 0; i < securityConfig.limits.registerScripted.max + 1; i += 1) {
    scripted.push((await call('POST', '/api/auth/register', {
      ip: scriptIp, headers: { 'User-Agent': 'python-requests/2.31' }, body: { name: 'Bot', email: `bot${i}-${Date.now()}@test.ci`, password: 'secret123' },
    })).status);
  }
  assert.equal(scripted.at(-1), 429);

  const browserIp = freshIp();
  const browser = [];
  for (let i = 0; i < securityConfig.limits.register.max + 1; i += 1) {
    browser.push((await call('POST', '/api/auth/register', {
      ip: browserIp, body: { name: 'Eleve', email: `eleve${i}-${Date.now()}@test.ci`, password: 'secret123' },
    })).status);
  }
  assert.equal(browser.filter((s) => s === 201).length, securityConfig.limits.register.max);
  assert.equal(browser.at(-1), 429);
});

test('auth: repeated token refresh requests are limited', { skip }, async () => {
  const user = await newUser();
  const ip = freshIp();
  const refreshToken = user.getRefreshToken();
  let limited = false;
  for (let i = 0; i < securityConfig.limits.refreshToken.max + 1 && !limited; i += 1) {
    const r = await call('POST', '/api/auth/refresh-token', { ip, body: { refreshToken } });
    if (r.status === 429) limited = true;
  }
  assert.ok(limited);
});

test('auth: refresh and access tokens are not interchangeable', { skip }, async () => {
  const user = await newUser();
  const ip = freshIp();
  assert.equal((await call('GET', '/api/auth/me', { token: user.getRefreshToken(), ip })).status, 401);
  // Même secret : seul le type du jeton les distingue.
  const savedRefreshSecret = process.env.JWT_REFRESH_SECRET;
  delete process.env.JWT_REFRESH_SECRET;
  try {
    const r = await call('POST', '/api/auth/refresh-token', { ip, body: { refreshToken: tokenOf(user) } });
    assert.equal(r.status, 401);
  } finally {
    process.env.JWT_REFRESH_SECRET = savedRefreshSecret;
  }
});

test('auth: a handoff code can only be used once', { skip }, async () => {
  const user = await newUser();
  const ip = freshIp();
  const { body } = await call('POST', '/api/auth/handoff', { token: tokenOf(user), ip });
  assert.equal((await call('POST', '/api/auth/handoff/exchange', { ip, body: { code: body.data.code } })).status, 200);
  assert.equal((await call('POST', '/api/auth/handoff/exchange', { ip, body: { code: body.data.code } })).status, 401);
});

test('auth: logout succeeds (even with an expired session) and clears the web cookie', { skip }, async () => {
  const user = await newUser();
  const ip = freshIp();
  const withToken = await call('POST', '/api/auth/logout', { token: tokenOf(user), ip });
  assert.equal(withToken.status, 200);
  assert.match(withToken.headers.get('set-cookie') || '', /token=;/);
  assert.equal((await call('POST', '/api/auth/logout', { token: 'expired.or.invalid', ip })).status, 200);
});

test('auth: validation errors never echo a submitted password', { skip }, async () => {
  const r = await call('POST', '/api/auth/register', { ip: freshIp(), body: { name: 'A', email: 'a@test.ci', password: 'abc' } });
  assert.equal(r.status, 400);
  assert.ok(!JSON.stringify(r.body).includes('"abc"'));
});

// ═══════════════════════════ Unitaires (sans base) ═══════════════════════════

test('unit: an IP is blocked after repeated strikes and an admin can lift it', () => {
  abuse.reset();
  const ip = '198.51.100.7';
  for (let i = 0; i < securityConfig.abuse.ipStrikes; i += 1) abuse.recordStrike({ ip, reason: 'unit' });
  const first = abuse.isIpBlocked(ip);
  assert.ok(first);
  assert.ok(abuse.unblock('ip', ip));
  assert.equal(abuse.isIpBlocked(ip), null);
  // Levée manuelle = faux positif : l'historique de récidive est effacé, durée de base.
  for (let i = 0; i < securityConfig.abuse.ipStrikes; i += 1) abuse.recordStrike({ ip, reason: 'unit' });
  assert.ok(abuse.isIpBlocked(ip).retryAfterMs <= securityConfig.abuse.baseBlockMs);
  abuse.reset();
});

test('unit: tracker memory stays bounded under a flood of random IPs', () => {
  const { TtlMap } = abuse;
  const map = new TtlMap(1000);
  for (let i = 0; i < 5000; i += 1) map.set(`ip:${i}`, 1, 60000);
  assert.ok(map.map.size <= 1000);
});

test('unit: circuit breaker opens after repeated provider outages; 4xx refusals never open it', async () => {
  breaker.reset();
  const { breakerFailures } = securityConfig.payments;
  const outage = () => Promise.reject(Object.assign(new Error('down'), { retriable: true }));
  for (let i = 0; i < breakerFailures; i += 1) await assert.rejects(breaker.run('unit', 'status', outage));
  let called = false;
  await assert.rejects(breaker.run('unit', 'status', async () => { called = true; }), { circuitOpen: true });
  assert.equal(called, false, 'no call while open');
  // Une erreur 4xx n'est pas une panne.
  breaker.reset();
  const refused = () => Promise.reject(Object.assign(new Error('bad request'), { httpStatus: 400 }));
  for (let i = 0; i < breakerFailures + 2; i += 1) await assert.rejects(breaker.run('unit', 'status', refused), { message: 'bad request' });
  breaker.reset();
});

test('unit: unexpected server errors are masked; operational messages are kept', () => {
  const errorHandler = require('../middleware/error');
  const AppError = require('../utils/errors');
  const respond = (err) => {
    const res = {
      headersSent: false, statusCode: 200, headers: {},
      setHeader(k, v) { this.headers[k] = v; },
      status(code) { this.statusCode = code; return this; },
      json(body) { this.body = body; return this; },
    };
    errorHandler(err, { id: 'req-1', method: 'GET', originalUrl: '/api/x' }, res, () => {});
    return res;
  };
  const leaked = respond(new Error('MongoServerError: connection to mongodb+srv://admin:pa55@cluster failed'));
  assert.equal(leaked.statusCode, 500);
  assert.equal(leaked.body.error, 'Erreur serveur');
  assert.ok(!JSON.stringify(leaked.body).includes('pa55'));
  assert.ok(!leaked.body.stack);
  assert.equal(leaked.body.requestId, 'req-1');

  const operational = respond(new AppError('Paiement introuvable', 404));
  assert.equal(operational.body.error, 'Paiement introuvable');

  const quota = Object.assign(new AppError('Trop', 429, undefined, 'PAYMENT_HOURLY_LIMIT'), { retryAfter: 120 });
  const limited = respond(quota);
  assert.equal(limited.headers['Retry-After'], '120');
  assert.equal(limited.body.retryAfter, 120);
});
