/**
 * API de préparation (§ 29) : identité appareil et restauration, essai en jours d'interaction,
 * correction serveur, seconde chance, cahier d'erreurs, synchronisation hors ligne, classement.
 *   TEST_MONGODB_URI=mongodb://127.0.0.1:27017/fatafalta-prep-test node --test tests/prep.integration.test.js
 * Ignoré sans TEST_MONGODB_URI (ne touche jamais la base de dev/prod).
 */
Object.assign(process.env, {
  NODE_ENV: 'test',
  PAYMENT_MODE: 'mock',
  JWT_SECRET: 'prep-test-access-secret',
  JWT_REFRESH_SECRET: 'prep-test-refresh-secret',
  CORS_ORIGINS: '',
  PAYMENT_RECONCILE_INTERVAL_SECONDS: '0',
  SEC_DISABLED: 'true',
});

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const mongoose = require('mongoose');

const uri = process.env.TEST_MONGODB_URI;
const skip = !uri && 'TEST_MONGODB_URI non defini';

let server;
let base;

const call = (method, path, body, headers = {}) => new Promise((resolve, reject) => {
  const data = body ? JSON.stringify(body) : null;
  const req = http.request(`${base}${path}`, { method, headers: { 'Content-Type': 'application/json', ...headers } }, (res) => {
    let raw = '';
    res.on('data', (c) => { raw += c; });
    res.on('end', () => resolve({ status: res.statusCode, body: raw ? JSON.parse(raw) : null }));
  });
  req.on('error', reject);
  if (data) req.write(data);
  req.end();
});

test.before(async () => {
  if (skip) return;
  await mongoose.connect(uri);
  await mongoose.connection.db.dropDatabase();
  const app = require('../server');
  server = http.createServer(app).listen(0);
  base = `http://127.0.0.1:${server.address().port}/api/prep`;
});

test.after(async () => {
  if (skip) return;
  server.close();
  await mongoose.connection.db.dropDatabase();
  await mongoose.disconnect();
});

const tokenFor = async (appareilId, extra = {}) => {
  const r = await call('POST', '/appareils', { appareilId, ...extra });
  assert.equal(r.status, 200);
  return r.body.data;
};

test('identité automatique, puis restauration après réinstallation via ANDROID_ID', { skip }, async () => {
  const first = await tokenFor('uuid-1', { androidId: 'android-A' });
  assert.match(first.identite.pseudonyme, /-\d{4}$/);
  assert.equal(first.droits.essai.joursRestants, 7);
  const again = await tokenFor('uuid-2-apres-reinstallation', { androidId: 'android-A' });
  assert.equal(again.identite.id, first.identite.id);
});

test('catalogue : les 6 organismes pilotes', { skip }, async () => {
  const r = await call('GET', '/catalogue');
  const sigles = r.body.data.map((o) => o.sigle).sort();
  assert.deepEqual(sigles, ['ENS', 'ENSEA', 'ESATIC', 'INFAS', 'INFJ', 'INPHB']);
});

test('module public : aucune clé de correction exposée', { skip }, async () => {
  const r = await call('GET', '/modules/MATH-LNEXP');
  assert.equal(r.status, 200);
  r.body.data.exercices.forEach((ex) => { assert.equal(ex.cle, undefined); assert.equal(ex.explication, undefined); });
});

test('tentative : mini-cours sans réponse au 1er échec, correction au 2e, cahier d’erreurs', { skip }, async () => {
  const { token } = await tokenFor('uuid-tentatives');
  const headers = { 'X-Prep-Token': token };
  const premier = await call('POST', '/exercices/MATH-LNEXP-E01/tentative', { programme: 'ENSEA-AS', reponse: { ids: ['o2'] }, essai: 1 }, headers);
  assert.equal(premier.body.data.correct, false);
  assert.ok(premier.body.data.miniCours);
  assert.equal(premier.body.data.correction, null);
  const second = await call('POST', '/exercices/MATH-LNEXP-E01/tentative', { programme: 'ENSEA-AS', reponse: { ids: ['o3'] }, essai: 2 }, headers);
  assert.ok(second.body.data.correction.cle);
  assert.ok(second.body.data.progression.etat.erreurs['MATH-LNEXP-E01']);
  assert.equal(second.body.data.droits.essai.joursUtilises, 1);
});

test('essai : verrou après 7 jours d’interaction distincts', { skip }, async () => {
  const { token } = await tokenFor('uuid-essai');
  const headers = { 'X-Prep-Token': token };
  const today = new Date();
  const jours = Array.from({ length: 8 }, (_, i) => new Date(today.getTime() - (8 - i) * 864e5).toISOString().slice(0, 10));
  const actions = jours.map((jour, i) => ({ type: 'lecon', programme: 'ENSEA-AS', lecon: 'MATH-LNEXP-L1', position: 0.5, jour, cle: `l${i}` }));
  const r = await call('POST', '/sync', { actions }, headers);
  assert.equal(r.body.data.resultats.filter((x) => x.ok).length, 7);
  assert.equal(r.body.data.resultats[7].erreur, 'ESSAI_EPUISE');
});

test('sync idempotente et classement « Xᵉ sur N »', { skip }, async () => {
  const { token } = await tokenFor('uuid-sync');
  const headers = { 'X-Prep-Token': token };
  const action = { type: 'tentative', programme: 'ENSEA-AS', exercice: 'MATH-SUITES-E01', reponse: { valeur: '43' }, essai: 1, session: 's1', cle: 'k1' };
  await call('POST', '/sync', { actions: [action] }, headers);
  const doublon = await call('POST', '/sync', { actions: [action] }, headers);
  assert.equal(doublon.body.data.resultats[0].doublon, true);
  const rank = await call('GET', '/programmes/ENSEA-AS/classement', null, headers);
  assert.ok(rank.body.data.rang >= 1);
  assert.ok(rank.body.data.total >= rank.body.data.rang);
});

test('raisonnement sans fournisseur IA : référence affichée, non décompté', { skip }, async () => {
  const { token } = await tokenFor('uuid-ia');
  const r = await call('POST', '/exercices/MATH-LNEXP-E07/raisonnement', { programme: 'ENSEA-AS', texte: 'Je pose x² − 4 > 0 puis je factorise.' }, { 'X-Prep-Token': token });
  assert.equal(r.body.data.disponible, false);
  assert.ok(r.body.data.reference);
  assert.equal(r.body.data.droits.essai.iaRestantes, 3);
});
