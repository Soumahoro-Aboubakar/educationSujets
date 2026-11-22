/**
 * E-mails à code : bascule Brevo → Mailjet → Resend, quota de 3 par adresse et par jour,
 * vérification d'adresse et mot de passe oublié.
 *   TEST_MONGODB_URI=mongodb://127.0.0.1:27017/fatafalta-email-test node --require ./tests/helpers/testEnvironment.cjs --test tests/emailAuth.test.js
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const mailer = require('../services/email/mailer');

const uri = process.env.TEST_MONGODB_URI;
const skip = !uri && 'TEST_MONGODB_URI non defini';

// Fournisseurs simulés : chacun note ce qu'il reçoit ; `down` les met en panne.
const outbox = [];
const down = new Set();
// `network.cuts` : nombre d'appels qui échouent sans réponse (coupure réseau brève).
const network = { cuts: 0 };
const fake = (name) => ({ name, send: async (message) => {
  if (network.cuts > 0) { network.cuts -= 1; throw new TypeError('fetch failed'); }
  if (down.has(name)) { const e = new Error('HTTP 503'); e.status = 503; throw e; }
  outbox.push({ provider: name, message });
} });
mailer.setProvidersForTests([fake('brevo'), fake('mailjet'), fake('resend')]);
const lastCode = () => /\b(\d{6})\b/.exec(outbox.at(-1).message.text)[1];

let server; let base; let ip = 0;
const call = async (method, path, { body, token } = {}) => {
  ip += 1;
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0 (email-test)', 'X-Forwarded-For': `10.77.${Math.floor(ip / 200)}.${ip % 200 + 1}`, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
};

test.before(async () => {
  if (skip) return;
  await mongoose.connect(uri);
  await mongoose.connection.dropDatabase();
  // La limite quotidienne repose sur l'index unique (adresse, jour) : il doit exister avant les envois.
  await Promise.all(['EmailQuota', 'EmailCode', 'User'].map((name) => require(`../models/${name}`).syncIndexes()));
  server = require('../server').listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
});
test.after(async () => {
  if (skip) return;
  server?.close();
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

const register = async (email) => {
  const res = await call('POST', '/api/auth/register', { body: { name: 'Awa Koné', email, password: 'secret123' } });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  return res.body.token;
};

test('verification code: sent by the first provider, then fallback when it is down', { skip }, async () => {
  const token = await register('awa@test.ci');
  outbox.length = 0;
  let res = await call('POST', '/api/auth/email/send-verification', { token });
  assert.equal(res.status, 200);
  assert.equal(outbox.at(-1).provider, 'brevo');
  assert.equal(res.body.data.remaining, 2);
  assert.match(outbox.at(-1).message.subject, /^\d{6} est votre code de vérification Fatafalta$/);

  down.add('brevo');
  res = await call('POST', '/api/auth/email/send-verification', { token });
  assert.equal(outbox.at(-1).provider, 'mailjet', 'Brevo en panne : Mailjet prend le relais');
  down.add('mailjet');
  res = await call('POST', '/api/auth/email/send-verification', { token });
  assert.equal(outbox.at(-1).provider, 'resend', 'Brevo et Mailjet en panne : Resend');
  assert.equal(res.body.data.remaining, 0);
  down.clear();

  // 4e envoi le même jour : refusé jusqu'au lendemain.
  res = await call('POST', '/api/auth/email/send-verification', { token });
  assert.equal(res.status, 429);
  assert.match(JSON.stringify(res.body), /EMAIL_DAILY_LIMIT/);
  assert.match(JSON.stringify(res.body), /Réessayez demain/);

  // Le dernier code envoyé vérifie l'adresse ; un mauvais code est refusé.
  assert.equal((await call('POST', '/api/auth/email/verify', { token, body: { code: '000000' } })).status, 400);
  res = await call('POST', '/api/auth/email/verify', { token, body: { code: lastCode() } });
  assert.equal(res.status, 200);
  const me = await call('GET', '/api/auth/me', { token });
  assert.equal(me.body.data.isVerified, true);
});

test('brief network cut: every provider unreachable, a second round 1.5 s later sends the code', { skip }, async () => {
  const token = await register('coupure@test.ci');
  outbox.length = 0;
  network.cuts = 3;
  const res = await call('POST', '/api/auth/email/send-verification', { token });
  assert.equal(res.status, 200);
  assert.equal(outbox.length, 1);
  assert.equal(outbox[0].provider, 'brevo');
  assert.equal(network.cuts, 0);
});

test('all providers down: 503 and the daily quota is given back', { skip }, async () => {
  const token = await register('panne@test.ci');
  ['brevo', 'mailjet', 'resend'].forEach((name) => down.add(name));
  const res = await call('POST', '/api/auth/email/send-verification', { token });
  assert.equal(res.status, 503);
  down.clear();
  const quota = await call('GET', '/api/auth/email/quota', { token });
  assert.equal(quota.body.data.remaining, 3, 'aucun envoi décompté');
});

test('forgot password: code by email, new password works, old sessions closed', { skip }, async () => {
  const oldToken = await register('mdp@test.ci');
  outbox.length = 0;
  let res = await call('POST', '/api/auth/password/forgot', { body: { email: 'MDP@test.ci' } });
  assert.equal(res.status, 200);
  assert.match(res.body.message, /Si un compte existe/);
  assert.match(outbox.at(-1).message.subject, /changer de mot de passe/);
  const code = lastCode();

  assert.equal((await call('POST', '/api/auth/password/reset', { body: { email: 'mdp@test.ci', code: '123456', password: 'nouveau123' } })).status, 400);
  res = await call('POST', '/api/auth/password/reset', { body: { email: 'mdp@test.ci', code, password: 'nouveau123' } });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  assert.equal((await call('POST', '/api/auth/password/reset', { body: { email: 'mdp@test.ci', code, password: 'encore123' } })).status, 400, 'code à usage unique');
  assert.equal((await call('POST', '/api/auth/login', { body: { email: 'mdp@test.ci', password: 'secret123' } })).status, 401, 'ancien mot de passe refusé');
  assert.equal((await call('POST', '/api/auth/login', { body: { email: 'mdp@test.ci', password: 'nouveau123' } })).status, 200);
  assert.equal((await call('GET', '/api/auth/me', { token: oldToken })).status, 401, 'anciennes sessions fermées');
});

test('forgot password for an unknown address: same answer, nothing sent, quota consumed', { skip }, async () => {
  outbox.length = 0;
  for (let i = 0; i < 3; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    const res = await call('POST', '/api/auth/password/forgot', { body: { email: 'inconnu@test.ci' } });
    assert.equal(res.status, 200);
    assert.match(res.body.message, /Si un compte existe/);
  }
  assert.equal(outbox.length, 0, 'aucun e-mail pour une adresse inconnue');
  assert.equal((await call('POST', '/api/auth/password/forgot', { body: { email: 'inconnu@test.ci' } })).status, 429, 'même limite que pour un compte réel');
});

test('five wrong codes destroy the code', { skip }, async () => {
  await register('essais@test.ci');
  await call('POST', '/api/auth/password/forgot', { body: { email: 'essais@test.ci' } });
  const code = lastCode();
  const wrong = code === '111111' ? '222222' : '111111';
  for (let i = 0; i < 5; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    assert.equal((await call('POST', '/api/auth/password/reset', { body: { email: 'essais@test.ci', code: wrong, password: 'nouveau123' } })).status, 400);
  }
  assert.equal((await call('POST', '/api/auth/password/reset', { body: { email: 'essais@test.ci', code, password: 'nouveau123' } })).status, 400, 'le bon code ne marche plus');
});
