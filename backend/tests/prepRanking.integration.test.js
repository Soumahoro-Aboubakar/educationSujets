/**
 * Tests réels Mongo/HTTP, sans charger server.js ni .env, sans supprimer la base.
 * TEST_MONGODB_URI=mongodb://127.0.0.1:27017/fatafalta-prep-test node --test tests/prepRanking.integration.test.js
 * Seuls les documents créés ici sont supprimés. Pas de migration exécutée.
 */
Object.assign(process.env, { NODE_ENV: 'test', SEC_DISABLED: 'true', JWT_SECRET: 'prep-ranking-test-secret' });
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');
const users = [];
const Identity = require('../models/PrepIdentite');
const Progress = require('../models/PrepProgression');
const service = require('../services/prep/rankingService');
const { issueToken } = require('../services/prep/identityService');
const controller = require('../controllers/prepController');

const uri = process.env.TEST_MONGODB_URI;
const skip = !uri && 'TEST_MONGODB_URI non défini : Mongo requis';
const programme = `ranking-test-${process.pid}`;
const identities = [];
const progressions = [];
let fixtures; let server; let base;
const ids = (rows) => rows.map((r) => r.identite);
const call = (path, viewer, accessToken) => new Promise((resolve, reject) => {
  const req = http.get(`${base}/programmes/${programme}/${path}`, { headers: viewer ? { 'X-Prep-Token': issueToken(viewer._id), ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) } : {} }, (res) => {
    let raw = ''; res.on('data', (chunk) => { raw += chunk; });
    res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(raw), headers: res.headers }));
  });
  req.on('error', reject);
});
const clean = async () => {
  await User.deleteMany({ _id: { $in: users } });
  await Progress.deleteMany({ _id: { $in: progressions } });
  await Identity.deleteMany({ _id: { $in: identities } });
  service.invalidateRanking();
};
const make = async (pseudonyme, score, visible = true, days = 0, selectedProgramme = programme) => {
  const identity = await Identity.create({ pseudonyme, visibleClassement: visible }); identities.push(identity._id);
  if (score === null) return { identity };
  const progression = await Progress.create({ identite: identity._id, programme: selectedProgramme, score,
    stats: { questions: 100, reussies: 80, reussite: 0.8 }, etat: { secret: 'DO_NOT_FETCH', lourd: 'x'.repeat(10000) },
    derniereActivite: new Date(Date.now() - days * 864e5) });
  progressions.push(progression._id);
  return { identity, progression, score, visible, days };
};

test.before(async () => {
  if (skip) return;
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 3000, autoIndex: false });
  assert.match(mongoose.connection.name, /test/i, 'Une base dont le nom contient test est obligatoire');
  await Promise.all([Identity.createIndexes(), Progress.createIndexes()]);
  const app = express();
  app.use('/api/prep', require('../routes/prep'));
  app.use(require('../middleware/error'));
  server = http.createServer(app);
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  base = `http://127.0.0.1:${server.address().port}/api/prep`;
});
test.beforeEach(async () => {
  if (skip) return;
  await clean();
  fixtures = [];
  for (const args of [['Ancien-1000', 100, true, 40], ['Masqué-9000', 90, false], ['Écureuil-1172', 80],
    ['Cauri-1172', 80], ['Écureuil-9999', 70, false], ['Baobab-3000', 60], ['Moi-4000', 50],
    ['Bas-5000', 40], ['Dernier-6000', 30]]) fixtures.push(await make(...args));
  service.invalidateRanking();
});
test.after(async () => {
  if (skip) return;
  if (server) await new Promise((resolve) => server.close(resolve));
  if (mongoose.connection.readyState === 1 && /test/i.test(mongoose.connection.name)) await clean();
  await mongoose.disconnect();
});

test('ex æquo : rang de compétition identique dans liste, moi et profil, masqués compris', { skip }, async () => {
  const viewer = fixtures[2].identity;
  const { status, body, headers } = await call('classement', viewer);
  assert.equal(status, 200); assert.equal(headers['cache-control'], 'private, no-store');
  const data = body.data;
  assert.equal(data.total, 9); assert.equal(data.rang, 3); assert.equal(data.moi.rang, 3);
  assert.deepEqual(data.candidats.map((r) => r.rang), [1, 3, 3, 6, 7, 8, 9]);
  assert.deepEqual(data.candidats.map((r) => r.rangApprox), data.candidats.map((r) => r.rang));
  const profile = await call(`candidats/${viewer._id}`);
  assert.equal(profile.body.data.rang, 3);
});

test('pagination : aucune duplication ni omission, ordre stable à travers les ex æquo, retour arrière', { skip }, async () => {
  const expected = (await service.ranking(null, programme, { limite: 50 })).candidats;
  const collected = []; let cursor; let last; const visited = new Set();
  do {
    const { body, status } = await call(`classement?limite=2${cursor ? `&apres=${cursor}` : ''}`);
    assert.equal(status, 200); const page = body.data;
    assert.ok(page.candidats.length <= 2); collected.push(...page.candidats); last = page;
    cursor = page.suivant;
    if (cursor) { assert.ok(!visited.has(cursor)); visited.add(cursor); }
  } while (cursor);
  assert.deepEqual(ids(collected), ids(expected)); assert.equal(new Set(ids(collected)).size, expected.length);
  const previous = (await call(`classement?limite=2&avant=${last.precedent}`)).body.data;
  assert.deepEqual(ids(previous.candidats), ids(expected.slice(-3, -1)));
  const forward = (await call(`classement?limite=2&apres=${previous.suivant}`)).body.data;
  assert.deepEqual(ids(forward.candidats), ids(last.candidats));
});

test('autour=moi : centré, voisinage visible, cursors dans les deux sens, bords remplis', { skip }, async () => {
  const all = (await service.ranking(null, programme, { limite: 50 })).candidats;
  const viewer = fixtures[5].identity;
  const page = (await call('classement?autour=moi&limite=3', viewer)).body.data;
  const center = all.findIndex((r) => r.identite === String(viewer._id));
  assert.deepEqual(ids(page.candidats), ids(all.slice(center - 1, center + 2)));
  assert.ok(page.precedent); assert.ok(page.suivant); assert.equal(page.candidats[1].moi, true);
  const above = (await call(`classement?limite=3&avant=${page.precedent}`, viewer)).body.data;
  const below = (await call(`classement?limite=3&apres=${page.suivant}`, viewer)).body.data;
  assert.equal(ids(above.candidats).some((id) => ids(page.candidats).includes(id)), false);
  assert.equal(ids(below.candidats).some((id) => ids(page.candidats).includes(id)), false);
  for (const index of [0, 8]) {
    const edge = (await call('classement?autour=moi&limite=4', fixtures[index].identity)).body.data;
    assert.equal(edge.candidats.length, 4); assert.ok(edge.candidats.some((r) => r.moi));
  }
});

test('masqués : exclus avant la limite et de la recherche/profil, rang personnel hors page', { skip }, async () => {
  const viewer = fixtures[1].identity;
  const page = (await call('classement?limite=3', viewer)).body.data;
  assert.equal(page.candidats.length, 3); assert.equal(page.moi.rang, 2); assert.equal(page.moi.visible, false);
  assert.equal(page.candidats.some((r) => !r.pseudonyme || r.identite === String(viewer._id)), false);
  assert.equal((await call(`candidats/${viewer._id}`)).status, 404);
  assert.equal((await call(`candidats/${viewer._id}`, viewer)).body.data.rang, 2);
  const around = (await call('classement?autour=moi&limite=3', viewer)).body.data;
  assert.equal(around.candidats.length, 3); assert.equal(around.moi.rang, 2);
  assert.equal((await call('candidats?q=mas')).body.data.candidats.length, 0);
});

test('périodes : filtre identique pour total, rang personnel, liste, profil et recherche', { skip }, async () => {
  const viewer = fixtures[2].identity;
  for (const periode of ['semaine', 'mois']) {
    const data = (await call(`classement?periode=${periode}`, viewer)).body.data;
    assert.equal(data.total, 8); assert.equal(data.moi.rang, 2);
    assert.equal(data.candidats.find((r) => r.moi).rang, 2);
    assert.equal((await call(`candidats/${viewer._id}?periode=${periode}`)).body.data.rang, 2);
    assert.equal((await call(`candidats?q=ecure&periode=${periode}`)).body.data.candidats[0].rang, 2);
    // Une progression inactive reste accessible à son propriétaire, même hors de la page de période.
    const inactive = (await call(`classement?periode=${periode}`, fixtures[0].identity)).body.data;
    assert.equal(inactive.moi.rang, 1); assert.ok(inactive.moi.stats.questions);
  }
});

test('recherche indexée : casse, accents, numéro, programme, visibilité absente et limite après jointure', { skip }, async () => {
  for (let i = 0; i < 22; i += 1) await make(`Écureuil-${8000 + i}`, 20, true, 0, `${programme}-autre`);
  for (const q of ['écu', 'ÉCU', 'ecu', 'E\u0301cu']) {
    const result = await call(`candidats?q=${encodeURIComponent(q)}`);
    assert.equal(result.status, 200); assert.deepEqual(ids(result.body.data.candidats), [String(fixtures[2].identity._id)]);
  }
  const numbered = (await call('candidats?q=1172')).body.data.candidats;
  assert.deepEqual(new Set(ids(numbered)), new Set([String(fixtures[2].identity._id), String(fixtures[3].identity._id)]));
  assert.ok(numbered.every((r) => r.rang === 3 && r.stats.questions === 100));
  // Cas hérité : visibleClassement absent doit signifier visible.
  await Identity.collection.updateOne({ _id: fixtures[2].identity._id }, { $unset: { visibleClassement: '' } });
  service.invalidateRanking();
  assert.equal((await call('candidats?q=ecu')).body.data.candidats.length, 1);
  assert.ok((await call('classement')).body.data.candidats.some((r) => r.identite === String(fixtures[2].identity._id)));
  for (let i = 0; i < 22; i += 1) await make(`Numero-${7000 + i}`, 20);
  assert.equal((await call('candidats?q=numero')).body.data.candidats.length, 20);
});

test('recherche : injection regex littérale, taille validée et erreurs HTTP 400', { skip }, async () => {
  for (const q of ['.*', 'Ca|Éc', '[a-z]', '^C', '(?=C)', '\\d+']) {
    const response = await call(`candidats?q=${encodeURIComponent(q)}`);
    assert.equal(response.status, 200); assert.deepEqual(response.body.data.candidats, []);
  }
  for (const suffix of ['candidats?q=a', `candidats?q=${'a'.repeat(41)}`, 'classement?apres=***', 'classement?periode=an', 'classement?limite=0']) {
    assert.equal((await call(suffix)).status, 400, suffix);
  }
});

test('profil public : visibilité modifiée et pseudonyme synchronisent recherche/cache', { skip }, async () => {
  const viewer = fixtures[2].identity;
  const user = await User.create({ name: 'Classement', email: `ranking-${Date.now()}@test.ci`, password: 'secret123' });
  users.push(user._id);
  viewer.user = user._id; await viewer.save();
  await service.ranking(null, programme);
  await new Promise((resolve, reject) => controller.updatePublicProfile({
    headers: { 'x-prep-token': issueToken(viewer._id) }, user: { _id: viewer.user },
    body: { visibleClassement: false, pseudonyme: 'Nouveau-1172' },
  }, { json: resolve }, reject));
  assert.equal((await call('candidats?q=nouveau')).body.data.candidats.length, 0);
  assert.ok(!(await call('classement')).body.data.candidats.some((r) => r.identite === String(viewer._id)));
  assert.equal((await call('classement', viewer)).status, 403, 'le jeton PREP seul ne donne pas accès au profil privé lié');
  const own = await call('classement', viewer, user.getSignedJwtToken());
  assert.equal(own.status, 200);
  assert.equal(own.body.data.moi.pseudonyme, 'Nouveau-1172');
});

test('projection Mongo : aucun etat demandé par classement, recherche ou profil', { skip }, async () => {
  const captured = [];
  mongoose.set('debug', (collection, method, ...args) => { if (['aggregate', 'findOne'].includes(method) && collection === Progress.collection.name) captured.push({ method, args }); });
  try {
    await call('classement', fixtures[2].identity); await call('candidats?q=ecu'); await call(`candidats/${fixtures[2].identity._id}`);
  } finally { mongoose.set('debug', false); }
  assert.ok(captured.length >= 4);
  for (const { method, args } of captured) {
    if (method === 'findOne') {
      assert.ok(args[1].projection.score); assert.equal(args[1].projection.etat, undefined);
    } else {
      const projections = args[0].filter((s) => s.$project).map((s) => s.$project);
      assert.ok(projections.length); assert.ok(projections.every((p) => p.etat === undefined && p.score === 1));
    }
  }
});


test('cache public : masquage écrit hors processus, exclu au prochain appel sans trou de page', { skip }, async () => {
  const first = (await call('classement?limite=3')).body.data;
  const victim = first.candidats[1].identite;
  await Identity.collection.updateOne({ _id: new mongoose.Types.ObjectId(victim) }, { $set: { visibleClassement: false } });
  const second = (await call('classement?limite=3')).body.data;
  assert.equal(second.candidats.length, 3); assert.ok(second.candidats.every((r) => r.identite !== victim));
});
