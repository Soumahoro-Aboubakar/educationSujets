/**
 * Abonnement personnel (CGV) et droits des utilisateurs (politique de confidentialité) :
 * acceptation des conditions à l'inscription, « Mes appareils » (liste, déconnexion à distance,
 * limite douce de sessions) et suppression du compte par son titulaire.
 *   TEST_MONGODB_URI=mongodb://127.0.0.1:27017/fatafalta-test node --require ./tests/helpers/testEnvironment.cjs --test tests/comptesEtAppareils.integration.test.js
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const uri = process.env.TEST_MONGODB_URI;
const skip = !uri && 'TEST_MONGODB_URI non defini';

let server; let base; let ip = 0;
const call = async (method, path, { body, token, ua = 'Mozilla/5.0 (Linux; Android 14) Chrome/130.0 Mobile Safari/537.36' } = {}) => {
  ip += 1;
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', 'User-Agent': ua, 'X-Forwarded-For': `10.88.${Math.floor(ip / 200)}.${ip % 200 + 1}`, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
};

test.before(async () => {
  if (skip) return;
  await mongoose.connect(uri);
  await mongoose.connection.dropDatabase();
  await Promise.all(['User', 'AuthSession'].map((name) => require(`../models/${name}`).syncIndexes()));
  server = require('../server').listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
});
test.after(async () => {
  if (skip) return;
  server?.close();
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

const register = async (email, extra = {}) => {
  const res = await call('POST', '/api/auth/register', { body: { name: 'Awa Koné', email, password: 'secret123', ...extra } });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  return res.body.token;
};
const login = async (email, ua) => {
  const res = await call('POST', '/api/auth/login', { body: { email, password: 'secret123', platform: 'web' }, ua });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  return res.body.token;
};

test('inscription : la preuve d’acceptation est enregistrée seulement si la case a été cochée', { skip }, async () => {
  const User = require('../models/User');
  await register('accepte@example.org', { accepteConditions: true });
  await register('ancienne-app@example.org');
  const avec = await User.findOne({ email: 'accepte@example.org' }).lean();
  const sans = await User.findOne({ email: 'ancienne-app@example.org' }).lean();
  assert.equal(avec.conditions.version, require('../config/legal').version);
  assert.ok(avec.conditions.accepteesLe instanceof Date);
  assert.equal(sans.conditions?.accepteesLe || null, null);
});

test('mes appareils : liste, libellé minimal, déconnexion à distance d’un seul appareil', { skip }, async () => {
  const email = 'appareils@example.org';
  await register(email);
  const mobile = await login(email, 'okhttp/4.12.0');
  const pc = await login(email, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0 Safari/537.36');
  const liste = await call('GET', '/api/auth/sessions', { token: pc });
  assert.equal(liste.status, 200);
  assert.equal(liste.body.meta.limite, 5);
  const actuelle = liste.body.data.find((s) => s.actuelle);
  assert.equal(actuelle.appareil, 'Windows · Chrome');
  assert.ok(liste.body.data.some((s) => s.appareil.includes('Application Fatafalta')));
  assert.ok(liste.body.data.every((s) => !('ip' in s) && !('refreshHash' in s)));
  const cible = liste.body.data.find((s) => s.appareil.includes('Application Fatafalta'));
  assert.equal((await call('DELETE', `/api/auth/sessions/${cible.id}`, { token: pc })).status, 200);
  assert.equal((await call('GET', '/api/auth/me', { token: mobile })).status, 401, 'l’appareil déconnecté perd l’accès');
  assert.equal((await call('GET', '/api/auth/me', { token: pc })).status, 200, 'les autres appareils restent connectés');
});

test('mes appareils : impossible de déconnecter la session d’un autre compte', { skip }, async () => {
  const a = await register('titulaire-a@example.org');
  const b = await register('titulaire-b@example.org');
  const sessionsB = await call('GET', '/api/auth/sessions', { token: b });
  const res = await call('DELETE', `/api/auth/sessions/${sessionsB.body.data[0].id}`, { token: a });
  assert.equal(res.status, 404);
  assert.equal((await call('GET', '/api/auth/me', { token: b })).status, 200);
});

test('limite douce : au-delà de 5 sessions, la plus ancienne est fermée, jamais le compte', { skip }, async () => {
  const email = 'limite@example.org';
  await register(email);
  const tokens = [];
  for (let i = 0; i < 6; i += 1) tokens.push(await login(email));
  const liste = await call('GET', '/api/auth/sessions', { token: tokens[5] });
  assert.equal(liste.body.data.length, 5);
  assert.equal((await call('GET', '/api/auth/me', { token: tokens[5] })).status, 200);
  assert.equal((await call('GET', '/api/auth/me', { token: tokens[0] })).status, 401, 'la session la plus ancienne est fermée');
  const User = require('../models/User');
  assert.equal((await User.findOne({ email }).lean()).accountStatus, 'ACTIVE', 'aucun blocage du compte');
});

test('suppression du compte : mot de passe exigé, données effacées ou anonymisées, accès coupé', { skip }, async () => {
  const email = 'supprimer@example.org';
  const token = await register(email);
  assert.equal((await call('POST', '/api/me/suppression-compte', { token, body: { motDePasse: 'mauvais' } })).status, 401);
  const PushSubscription = require('../models/PushSubscription');
  const User = require('../models/User');
  const user = await User.findOne({ email }).lean();
  await PushSubscription.create({ user: user._id, endpoint: 'https://push.example.org/x', keys: { p256dh: 'a', auth: 'b' } });
  const ok = await call('POST', '/api/me/suppression-compte', { token, body: { motDePasse: 'secret123' } });
  assert.equal(ok.status, 200, JSON.stringify(ok.body));
  const apres = await User.findById(user._id).lean();
  assert.notEqual(apres.email, email);
  assert.match(apres.email, /@supprime\.invalid$/);
  assert.equal(apres.accountStatus, 'DISABLED');
  assert.equal(await PushSubscription.countDocuments({ user: user._id }), 0);
  assert.equal((await call('GET', '/api/auth/me', { token })).status, 401, 'les sessions sont révoquées');
  assert.equal((await call('POST', '/api/auth/login', { body: { email, password: 'secret123' } })).status, 401);
  await register(email); // l’adresse est libérée
});
