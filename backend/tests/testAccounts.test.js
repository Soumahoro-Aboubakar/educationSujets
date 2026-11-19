/**
 * Environnement (APP_ENV) et comptes de test : utilisables en développement, refusés en production.
 *   TEST_MONGODB_URI=mongodb://127.0.0.1:27017/fatafalta-env-test node --require ./tests/helpers/testEnvironment.cjs --test tests/testAccounts.test.js
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { resolve } = require('../config/environment');
const { isReservedEmail, isTestAccount } = require('../utils/testAccounts');

const uri = process.env.TEST_MONGODB_URI;
const skip = !uri && 'TEST_MONGODB_URI non defini';

test('APP_ENV fails closed: production unless development is explicit', () => {
  assert.equal(resolve({}), 'production', 'aucune variable : production');
  assert.equal(resolve({ NODE_ENV: 'production' }), 'production');
  assert.equal(resolve({ NODE_ENV: 'development' }), 'development');
  assert.equal(resolve({ NODE_ENV: 'test' }), 'test');
  assert.equal(resolve({ APP_ENV: 'development', NODE_ENV: 'production' }), 'development', 'APP_ENV prime');
  assert.equal(resolve({ APP_ENV: 'Production ' }), 'production');
  assert.equal(resolve({ APP_ENV: 'dev' }), 'production', 'valeur inconnue : production');
  assert.equal(resolve({ NODE_ENV: 'staging' }), 'production');
});

test('test accounts are recognised by flag or reserved domain only', () => {
  ['eleve.test.web@example.com', 'a@sub.example.org', 'x@fatafalta.test', 'y@local.invalid', 'z@dev.localhost'].forEach((email) => assert.ok(isReservedEmail(email), email));
  ['jean@gmail.com', 'x@test.ci', 'a@example.com.ci', 'contest@fatafalta.com', 'b@invite.fatafalta.com'].forEach((email) => assert.ok(!isReservedEmail(email), email));
  assert.ok(isTestAccount({ email: 'vrai@gmail.com', isTestAccount: true }));
  assert.ok(!isTestAccount({ email: 'vrai@gmail.com' }));
});

test('in production, a test account cannot log in nor keep a session; in development it can', { skip }, async () => {
  await mongoose.connect(uri);
  await mongoose.connection.dropDatabase();
  const User = require('../models/User');
  const app = require('../server');
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}`;
  const post = (path, body, headers = {}) => fetch(`${base}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0 (env-test)', ...headers }, body: JSON.stringify(body) });
  const get = (path, token) => fetch(`${base}${path}`, { headers: { Authorization: `Bearer ${token}`, 'User-Agent': 'Mozilla/5.0 (env-test)' } });
  const previous = process.env.APP_ENV;
  try {
    await User.create({ name: 'Test', email: 'demo@example.com', password: 'secret123' });
    await User.create({ name: 'Marqué', email: 'marque@gmail.com', password: 'secret123', isTestAccount: true });
    await User.create({ name: 'Vrai', email: 'vrai@gmail.com', password: 'secret123' });

    process.env.APP_ENV = 'development';
    const devLogin = await post('/api/auth/login', { email: 'demo@example.com', password: 'secret123' }, { 'X-Forwarded-For': '10.9.0.1' });
    assert.equal(devLogin.status, 200, 'développement : le compte de test se connecte');
    const { token } = await devLogin.json();
    assert.equal((await get('/api/auth/me', token)).status, 200);

    process.env.APP_ENV = 'production';
    assert.equal((await get('/api/auth/me', token)).status, 401, 'production : la session ouverte en dev ne vaut plus');
    for (const email of ['demo@example.com', 'marque@gmail.com']) {
      const refused = await post('/api/auth/login', { email, password: 'secret123' }, { 'X-Forwarded-For': '10.9.0.2' });
      assert.equal(refused.status, 401, `${email} refusé en production`);
      assert.match((await refused.json()).error, /Identifiants invalides/, 'même message qu’un mauvais mot de passe');
    }
    assert.equal((await post('/api/auth/login', { email: 'vrai@gmail.com', password: 'secret123' }, { 'X-Forwarded-For': '10.9.0.3' })).status, 200, 'vrai compte : inchangé');
    const register = await post('/api/auth/register', { name: 'Robot', email: 'robot@example.com', password: 'secret1234' }, { 'X-Forwarded-For': '10.9.0.4' });
    assert.equal(register.status, 400, 'inscription sur domaine réservé refusée en production');
  } finally {
    if (previous === undefined) delete process.env.APP_ENV; else process.env.APP_ENV = previous;
    server.close();
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
});
