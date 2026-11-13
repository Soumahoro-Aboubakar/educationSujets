Object.assign(process.env, {
  NODE_ENV: 'test', PAYMENT_MODE: 'mock', MOCK_PAYMENT_DELAY_SECONDS: '0', SEC_DISABLED: 'true',
  JWT_SECRET: 'lot6-test', JWT_REFRESH_SECRET: 'lot6-refresh-test', PAYMENT_RECONCILE_INTERVAL_SECONDS: '0',
});
/**
 * Lot 6 — recette transverse HTTP, sur MongoDB local et faux fournisseur de paiement :
 * un même compte, une session Web et une session mobile.
 *  - scénario 1 : organisme ajouté en administration visible sans mise à jour de l'app ;
 *  - scénario 4 : souscription payée sur le Web → Premium reconnu par la session mobile (droits et PREP) ;
 *  - scénario 5 : expiration → droits actualisés sur les deux sessions ;
 *  - scénarios 6–8 : progression commencée sur l'app, reprise sur le site, puis retour sur l'app.
 * Aucun résultat de store ou de fournisseur réel n'est prétendu : le paiement est simulé.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const Subscription = require('../models/Subscription');
const User = require('../models/User');
const { assertLocalUri } = require('../scripts/migrations/lot1');
const core = require('../services/prep/shared/prepCore');
const pack = require('../data/prep/build/pack.json');

const skip = !process.env.TEST_MONGODB_URI;
const PROG = pack.programmes[0].code;
const MOD = pack.programmes[0].matieres.flatMap((m) => m.modules).find((r) => r.publie).code;
const LESSON = pack.modules[MOD].lecons[0].code;
const today = core.dayKey(new Date());
let server; let base;

const call = async (method, url, body, headers = {}) => {
  const r = await fetch(base + url, { method, headers: { 'Content-Type': 'application/json', ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });
  const raw = await r.text();
  return { status: r.status, body: raw ? JSON.parse(raw) : null };
};
const login = async (platform) => {
  const r = await call('POST', '/auth/login', { email: 'recette@test.invalid', password: 'Recette-2026!', platform });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  return { Authorization: `Bearer ${r.body.token}` };
};

test.before(async () => {
  if (skip) return;
  assertLocalUri(process.env.TEST_MONGODB_URI);
  await mongoose.connect(process.env.TEST_MONGODB_URI);
  await mongoose.connection.dropDatabase();
  const app = require('../server');
  server = app.listen(0, '127.0.0.1');
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}/api`;
  assert.equal((await call('POST', '/auth/register', { name: 'Élève Recette', email: 'recette@test.invalid', password: 'Recette-2026!' })).status, 201);
});
test.after(async () => {
  if (skip) return;
  await new Promise((r) => server.close(r));
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

test('scénario 1 : organisme créé en administration, visible par la découverte sans nouvelle version', { skip }, async () => {
  await User.create({ name: 'Admin recette', email: 'admin-recette@test.invalid', password: 'Admin-2026!x', role: 'admin' });
  const admin = await call('POST', '/auth/login', { email: 'admin-recette@test.invalid', password: 'Admin-2026!x', platform: 'web' });
  const created = await call('POST', '/organismes', { nom: 'Institut Recette Lot 6' }, { Authorization: `Bearer ${admin.body.token}` });
  assert.ok([200, 201].includes(created.status), JSON.stringify(created.body));
  const list = await call('GET', '/organismes?limit=100');
  assert.ok(JSON.stringify(list.body).includes('Institut Recette Lot 6'));
});

test('scénarios 4 et 5 : paiement Web (faux fournisseur) → Premium sur la session mobile, puis expiration', { skip }, async () => {
  const web = await login('web');
  const mobile = await login('mobile');
  // Avant paiement : aucun Premium, ni sur le Web ni sur le mobile.
  assert.equal((await call('GET', '/me/entitlements', undefined, mobile)).body.data.subscription.status === 'ACTIVE', false);

  const init = await call('POST', '/payments', { method: 'wave', phone: '0701020304', channel: 'web', attemptId: 'recette-lot6-0001' }, web);
  assert.ok([200, 201].includes(init.status), JSON.stringify(init.body));
  const paymentId = init.body.data.payment?.id || init.body.data.id;
  const settled = await call('GET', `/payments/${paymentId}`, undefined, web);
  assert.equal(settled.body.data.status, 'SUCCEEDED');

  // La session mobile, sans reconnexion, lit le même droit serveur.
  const mobileRights = (await call('GET', '/me/entitlements', undefined, mobile)).body.data;
  assert.equal(mobileRights.subscription.status, 'ACTIVE');
  const device = await call('POST', '/prep/appareils', { appareilId: 'recette-tel' }, mobile);
  assert.equal(device.body.data.droits.abonne, true, 'Premium PREP reconnu sur mobile');

  // Relecture répétée du paiement : une seule période d'abonnement.
  const before = await Subscription.findOne({}).lean();
  await call('GET', `/payments/${paymentId}`, undefined, web);
  const after = await Subscription.findOne({}).lean();
  assert.equal(String(after.currentPeriodEnd), String(before.currentPeriodEnd));

  // Expiration : droits actualisés sur les deux sessions, sans action client.
  await Subscription.updateOne({ _id: before._id }, { $set: { currentPeriodEnd: new Date(Date.now() - 60 * 1000) } });
  assert.notEqual((await call('GET', '/me/entitlements', undefined, web)).body.data.subscription.status, 'ACTIVE');
  const droits = (await call('GET', '/prep/droits', undefined, { ...mobile, 'X-Prep-Token': device.body.data.token })).body.data.droits;
  assert.equal(droits.abonne, false);
});

test('scénarios 6 à 8 : progression commencée sur l’app, reprise sur le site, retour sur l’app', { skip }, async () => {
  const mobile = await login('mobile');
  const web = await login('web');
  // Application : identité invitée puis rattachement au compte (comme après connexion dans l'app).
  const guest = (await call('POST', '/prep/appareils', { appareilId: 'recette-tel-2' })).body.data.token;
  const attached = await call('POST', '/prep/rattachement', {}, { ...mobile, 'X-Prep-Token': guest });
  assert.equal(attached.status, 200, JSON.stringify(attached.body));
  const app = { ...mobile, 'X-Prep-Token': attached.body.data.token };

  // Hors connexion sur l'app : actions mises en file puis envoyées (même clé si renvoyées).
  const offline = [
    { cle: 'r6-1', type: 'lecon', programme: PROG, lecon: LESSON, position: 0.45, jour: today },
    { cle: 'r6-2', type: 'reprise', programme: PROG, appareil: 'recette-tel-2', seq: 1, vu: 0, cible: { type: 'lecon', module: MOD, lecon: LESSON, position: 0.45 }, jour: today },
  ];
  const sent = await call('POST', '/prep/sync', { actions: offline }, app);
  assert.deepEqual(sent.body.data.resultats.map((r) => r.statut), ['applied', 'applied']);
  assert.deepEqual((await call('POST', '/prep/sync', { actions: offline }, app)).body.data.resultats.map((r) => r.statut), ['duplicate', 'duplicate']);

  // Site : même compte → même identité canonique ; le parcours est retrouvé sans action locale.
  const siteIdentity = (await call('POST', '/prep/appareils', { appareilId: 'web-recette' }, web)).body.data;
  assert.equal(siteIdentity.identite.id, attached.body.data.identite.id);
  const site = { ...web, 'X-Prep-Token': siteIdentity.token };
  const read = (await call('GET', '/prep/progressions', undefined, site)).body.data.progressions[PROG].etat;
  assert.equal(read.derniereReprise.lecon, LESSON);
  assert.equal(read.lecons[LESSON].derniere, 0.45);

  // Le site poursuit la lecture (il a vu la reprise version 1) et termine la leçon.
  const web1 = await call('POST', '/prep/sync', { actions: [
    { cle: 'w6-1', type: 'reprise', programme: PROG, appareil: 'web-recette', seq: 1, vu: read.derniereReprise.version, cible: { type: 'lecon', module: MOD, lecon: LESSON, position: 0.9 }, jour: today },
    { cle: 'w6-2', type: 'lecon', programme: PROG, lecon: LESSON, position: 1, terminee: true, jour: today },
  ] }, site);
  assert.deepEqual(web1.body.data.resultats.map((r) => r.statut), ['applied', 'applied']);

  // Retour sur l'app : état serveur à jour ; une reprise ancienne de l'app ne l'écrase pas.
  const back = (await call('GET', '/prep/progressions', undefined, app)).body.data.progressions[PROG].etat;
  assert.equal(back.lecons[LESSON].terminee, true);
  assert.equal(back.derniereReprise.appareil, 'web-recette');
  const stale = await call('POST', '/prep/sync', { actions: [{ cle: 'r6-3', type: 'reprise', programme: PROG, appareil: 'recette-tel-2', seq: 2, vu: 1, cible: { type: 'lecon', module: MOD, lecon: LESSON, position: 0.1 }, jour: today }] }, app);
  assert.equal(stale.body.data.resultats[0].statut, 'conflict');

  // Le jeton PREP n'est jamais accepté dans l'adresse.
  assert.equal((await call('GET', `/prep/progressions?token=${encodeURIComponent(siteIdentity.token)}`)).status, 401);
});
