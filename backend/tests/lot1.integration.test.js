Object.assign(process.env, { NODE_ENV: 'test', PAYMENT_MODE: 'mock', SEC_DISABLED: 'true',
  JWT_SECRET: 'lot1-access-test-only', JWT_REFRESH_SECRET: 'lot1-refresh-test-only',
  FRONTEND_URL: 'https://web.test.invalid', CORS_ORIGINS: 'https://web.test.invalid', MOCK_PAYMENT_DELAY_SECONDS: '600' });
const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Subscription = require('../models/Subscription');
const AuthSession = require('../models/AuthSession');
const PrepIdentite = require('../models/PrepIdentite');
const PrepProgression = require('../models/PrepProgression');
const PrepTentative = require('../models/PrepTentative');
const identity = require('../services/prep/identityService');
const core = require('../services/prep/shared/prepCore');
const sessions = require('../services/auth/sessionService');
const billing = require('../services/billing/subscriptionService');
const guard = require('../services/billing/downloadGuard');
const migration = require('../scripts/migrations/lot1');
const skip = !process.env.TEST_MONGODB_URI;
let server; let base; let seq = 0;
const newUser = (over = {}) => User.create({ name: 'Lot un', email: `lot1-${++seq}@test.ci`, password: 'secret123', ...over });
const call = async (method, route, body, headers = {}) => {
  const r = await fetch(base + route, { method, headers: { 'Content-Type': 'application/json', ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });
  return { status: r.status, body: await r.json(), headers: r.headers };
};
const auth = (token) => ({ Authorization: `Bearer ${token}` });
const guest = async () => {
  const r = await call('POST', '/prep/appareils', { appareilId: `device-${++seq}` });
  assert.equal(r.status, 200); return r.body.data;
};
const login = async (user, platform = 'mobile') => {
  const r = await call('POST', '/auth/login', { email: user.email, password: 'secret123', platform });
  assert.equal(r.status, 200); return r;
};
const attach = (g, token) => call('POST', '/prep/rattachement', {}, { ...auth(token), 'X-Prep-Token': g.token });
const premium = (user, over = {}) => Subscription.create({ user: user._id, currentPeriodEnd: new Date(Date.now() + 3600000), ...over });

test.before(async () => {
  if (skip) return;
  migration.assertLocalUri(process.env.TEST_MONGODB_URI);
  await mongoose.connect(process.env.TEST_MONGODB_URI);
  await mongoose.connection.dropDatabase();
  const app = require('../server');
  await Promise.all([User, Subscription, AuthSession, PrepIdentite, PrepProgression, PrepTentative].map((m) => m.syncIndexes()));
  server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}/api`;
});
test.after(async () => {
  if (skip) return;
  await new Promise((resolve) => server.close(resolve));
  await mongoose.connection.dropDatabase(); await mongoose.disconnect();
});

test('sessions : rotation, rejeu et indépendance Web/mobile', { skip }, async () => {
  const user = await newUser();
  const mobile = (await login(user)).body;
  const web = (await login(user, 'web')).body;
  assert.notEqual(mobile.token, web.token);
  const decoded = jwt.decode(mobile.token);
  assert.equal(decoded.exp - decoded.iat, 900);
  const rotated = await call('POST', '/auth/refresh-token', { refreshToken: mobile.refreshToken });
  assert.equal(rotated.status, 200);
  assert.notEqual(rotated.body.refreshToken, mobile.refreshToken);
  assert.equal((await call('GET', '/auth/me', undefined, auth(rotated.body.token))).status, 200);
  assert.equal((await call('POST', '/auth/refresh-token', { refreshToken: mobile.refreshToken })).status, 401);
  assert.equal((await call('GET', '/auth/me', undefined, auth(rotated.body.token))).status, 401);
  assert.equal((await call('GET', '/auth/me', undefined, auth(web.token))).status, 200);
  const stored = await AuthSession.findOne({ sid: decoded.sid }).select('+refreshHash');
  assert.equal(stored.refreshHash.length, 64);
  assert.ok(!JSON.stringify(stored).includes(mobile.refreshToken));
});

test('sessions : rotation concurrente ne délivre qu’un seul renouvellement', { skip }, async () => {
  const user = await newUser(); const { body } = await login(user);
  const results = await Promise.all([1, 2].map(() => call('POST', '/auth/refresh-token', { refreshToken: body.refreshToken })));
  assert.deepEqual(results.map((r) => r.status).sort(), [200, 401]);
  const accepted = results.find((r) => r.status === 200);
  assert.equal((await call('GET', '/auth/me', undefined, auth(accepted.body.token))).status, 401);
});

test('sessions : cookies HttpOnly, contrôle d’origine, logout et révocation globale', { skip }, async () => {
  const user = await newUser(); const first = await login(user, 'web'); const second = await login(user);
  assert.match(first.headers.get('set-cookie'), /HttpOnly/);
  const cookie = `refreshToken=${first.body.refreshToken}`;
  assert.equal((await call('POST', '/auth/refresh-token', {}, { Cookie: cookie, Origin: 'https://evil.invalid' })).status, 403);
  const rotated = await call('POST', '/auth/refresh-token', {}, { Cookie: cookie, Origin: 'https://web.test.invalid' });
  assert.equal(rotated.status, 200);
  assert.equal((await call('POST', '/auth/logout', {}, auth(rotated.body.token))).status, 200);
  assert.equal((await call('GET', '/auth/me', undefined, auth(rotated.body.token))).status, 401);
  assert.equal((await call('POST', '/auth/sessions/revoke', {}, auth(second.body.token))).status, 200);
  assert.equal((await call('GET', '/auth/me', undefined, auth(second.body.token))).status, 401);
});

test('sessions : compte désactivé, jetons legacy révoqués et refresh legacy à usage unique', { skip }, async () => {
  const user = await newUser(); const legacy = user.getSignedJwtToken(); const refresh = user.getRefreshToken();
  const rotated = await sessions.rotate(refresh);
  await assert.rejects(sessions.rotate(refresh), (e) => e.statusCode === 401);
  assert.equal(await sessions.resolveAccess(rotated.token), null);
  await sessions.revokeAll(user._id);
  assert.equal(await sessions.resolveAccess(legacy), null);
  const current = (await login(await User.findById(user._id))).body;
  await User.updateOne({ _id: user._id }, { $set: { accountStatus: 'DISABLED' } });
  assert.equal((await call('GET', '/auth/me', undefined, auth(current.token))).status, 403);
  assert.equal((await call('POST', '/auth/refresh-token', { refreshToken: current.refreshToken })).status, 401);
  assert.equal((await call('POST', '/auth/login', { email: user.email, password: 'secret123' })).status, 403);
});

test('identité : compte A inaccessible à B et après logout ; déclaration ne révèle pas A', { skip }, async () => {
  const a = await newUser(); const b = await newUser(); await premium(a);
  const ta = (await login(a)).body.token; const tb = (await login(b)).body.token;
  const g = await guest(); const attached = await attach(g, ta); assert.equal(attached.status, 200);
  const prepToken = attached.body.data.token;
  const path = '/prep/droits';
  const r = await call('GET', path, undefined, { ...auth(ta), 'X-Prep-Token': prepToken });
  assert.equal(r.body.data.droits.abonne, true);
  assert.equal((await call('GET', path, undefined, { ...auth(tb), 'X-Prep-Token': prepToken })).status, 403);
  assert.equal((await attach({ token: prepToken }, tb)).status, 403);
  assert.equal((await call('POST', '/prep/appareils', { appareilId: 'forged' }, { ...auth(tb), 'X-Prep-Token': prepToken })).status, 403);
  await call('POST', '/auth/logout', {}, auth(ta));
  assert.equal((await call('GET', path, undefined, { 'X-Prep-Token': prepToken })).status, 403);
  const anonymous = await guest(); assert.equal(anonymous.droits.abonne, false);
  const linked = await PrepIdentite.findById(g.identite.id);
  const restored = await call('POST', '/prep/appareils', { appareilId: linked.identifiants.appareilId });
  assert.equal(restored.status, 200); assert.notEqual(restored.body.data.identite.id, g.identite.id);
  assert.equal(restored.body.data.droits.abonne, false);
});

test('identité : deux comptes ne peuvent pas réclamer le même invité', { skip }, async () => {
  const a = await newUser(); const b = await newUser(); const g = await guest();
  const results = await Promise.all([a, b].map(async (u) => attach(g, (await login(u)).body.token)));
  assert.deepEqual(results.map((r) => r.status).sort(), [200, 403]);
});

test('identité : deux rattachements concurrents, canonique unique et fusion rejouable sans perte', { skip }, async () => {
  const user = await newUser(); const token = (await login(user)).body.token;
  const one = await guest(); const two = await guest();
  const etat = core.applyLesson(core.emptyProgress(), 'MATH-LNEXP-L1', 0.7, true, '2026-11-01');
  etat.compteurs.questions = 3;
  await PrepProgression.create({ identite: two.identite.id, programme: 'ENSEA-AS', etat });
  const results = await Promise.all([attach(one, token), attach(two, token)]);
  assert.ok(results.every((r) => r.status === 200), JSON.stringify(results));
  assert.equal(results[0].body.data.identite.id, results[1].body.data.identite.id);
  assert.equal(await PrepIdentite.countDocuments({ user: user._id, canonical: true }), 1);
  await attach(two, token); await attach(one, token);
  const canonical = await identity.canonicalFor(user);
  const doc = await PrepProgression.findOne({ identite: canonical._id, programme: 'ENSEA-AS' });
  assert.equal(doc.etat.lecons['MATH-LNEXP-L1'].terminee, true);
  assert.equal(doc.etat.compteurs.questions, 3);
});

test('droits : Premium fabriqué ignoré, suspension/révocation/expiration appliquées à PREP et téléchargement', { skip }, async () => {
  const user = await newUser({ isPremium: true }); const admin = await newUser({ role: 'admin' });
  const token = (await login(user)).body.token; const adminToken = (await login(admin)).body.token;
  const g = await guest(); await attach(g, token);
  await PrepIdentite.updateOne({ _id: g.identite.id }, { $set: { 'essai.jours': Array.from({ length: 7 }, (_, i) => core.addDays(core.dayKey(new Date()), -i - 1)) } });
  const headers = { ...auth(token), 'X-Prep-Token': g.token };
  assert.equal((await call('GET', '/prep/droits', undefined, headers)).body.data.droits.abonne, false);
  const subscription = await premium(user);
  const end = subscription.currentPeriodEnd.getTime();
  assert.equal((await call('GET', '/prep/modules/MATH-LNEXP', undefined, headers)).status, 200);
  const entitlements = await call('GET', '/me/entitlements', undefined, auth(token));
  assert.equal(entitlements.body.data.capabilities.premium, true);
  assert.equal(new Date(entitlements.body.data.validUntil).getTime(), end);
  assert.match(entitlements.headers.get('cache-control'), /private/);
  assert.equal((await call('PATCH', `/admin/users/${user._id}/access`, { accessState: 'suspended', reason: 'Test' }, auth(token))).status, 403);
  for (const state of ['suspended', 'revoked', 'enabled']) {
    const r = await call('PATCH', `/admin/users/${user._id}/access`, { accessState: state, reason: 'Contrôle local' }, auth(adminToken));
    assert.equal(r.status, 200);
    assert.equal(new Date(r.body.data.currentPeriodEnd).getTime(), end);
    const rights = await call('GET', '/prep/droits', undefined, headers);
    assert.equal(rights.body.data.droits.abonne, state === 'enabled');
    assert.equal((await call('GET', '/prep/modules/MATH-LNEXP', undefined, headers)).status, state === 'enabled' ? 200 : 403);
    if (state !== 'enabled') {
      const actor = await guard.buildActorForUser(user);
      await assert.rejects(guard.authorizeDownload(actor, { _id: new mongoose.Types.ObjectId() }, { access: { tier: 'recent', freeQuotaEligible: false } }), (e) => e.statusCode === 403);
      const sync = await call('POST', '/prep/sync', { actions: [{ type: 'lecon', programme: 'ENSEA-AS', lecon: 'MATH-LNEXP-L1', terminee: true }] }, headers);
      assert.equal(sync.body.data.resultats[0].ok, false);
    }
  }
  await Subscription.updateOne({ user: user._id }, { $set: { currentPeriodEnd: new Date(Date.now() - 1000) } });
  assert.equal((await call('GET', '/prep/modules/MATH-LNEXP', undefined, headers)).status, 403);
  await assert.rejects(guard.authorizeDownload(await guard.buildActorForUser(user), { _id: new mongoose.Types.ObjectId() }, { access: { tier: 'recent', freeQuotaEligible: false } }), (e) => e.statusCode === 403);
  assert.equal((await call('GET', '/prep/modules/MATH-LNEXP')).status, 401);
});

test('migration : URI locale exigée, contrôle à blanc, choix explicite et application idempotente', { skip }, async () => {
  assert.throws(() => migration.assertLocalUri('mongodb+srv://example.invalid/db'));
  assert.throws(() => migration.assertLocalUri('mongodb://127.0.0.1:27017/production'));
  const user = await newUser();
  await User.collection.updateOne({ _id: user._id }, { $unset: { tokenVersion: 1 } });
  const a = await PrepIdentite.create({ user: user._id, pseudonyme: 'Migration A' });
  const b = await PrepIdentite.create({ user: user._id, pseudonyme: 'Migration B' });
  const dry = await migration.migrate(); assert.equal(dry.dryRun, true);
  assert.ok(dry.duplicates.some((d) => String(d._id) === String(user._id)));
  assert.equal((await User.collection.findOne({ _id: user._id })).tokenVersion, undefined);
  await assert.rejects(migration.migrate({ apply: true }), /Choix canonique requis/);
  const options = { apply: true, mergeMap: [{ user: user._id, canonical: a._id }] };
  await migration.migrate(options); await migration.migrate(options);
  assert.equal((await User.collection.findOne({ _id: user._id })).tokenVersion, 0);
  assert.equal(String((await PrepIdentite.findById(b._id)).fusionneeDans), String(a._id));
  assert.equal(await PrepIdentite.countDocuments({ user: user._id, canonical: true }), 1);
});
