Object.assign(process.env, { NODE_ENV: 'test', PAYMENT_MODE: 'mock', SEC_DISABLED: 'true', JWT_SECRET: 'lot4-test', JWT_REFRESH_SECRET: 'lot4-refresh-test' });
/**
 * Lot 4 — contrat entre l'API publiée (lot 3) et le dépôt de contenu mobile
 * (fatafalta/src/prep/contentRepo.js), sur une vraie base MongoDB locale et des réponses HTTP réelles :
 * publication en administration → manifeste → téléchargement → correction serveur → retrait.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Organisme = require('../models/Organisme');
const ParcoursType = require('../models/ParcoursType');
const Content = require('../models/PrepContent');
const Publication = require('../models/PrepPublication');
const service = require('../services/prep/publicationService');
const migration = require('../scripts/migrations/lot3');
const pack = require('../data/prep/build/pack.json');

const skip = !process.env.TEST_MONGODB_URI;
const MOBILE = path.resolve(__dirname, '../../fatafalta');

// Le dépôt mobile est un module ES sans dépendance : chargé tel quel, sans transpileur.
const repo = (() => {
  const source = fs.readFileSync(path.join(MOBILE, 'src/prep/contentRepo.js'), 'utf8');
  const names = [...source.matchAll(/^export const (\w+)/gm)].map((m) => m[1]);
  const body = `${source.replace(/^export const /gm, 'const ')}\nreturn { ${names.join(', ')} };`;
  return new Function(body)();
})();
const mobilePack = JSON.parse(fs.readFileSync(path.join(MOBILE, 'src/prep/content/pack.json'), 'utf8'));
const bundle = { modules: mobilePack.modules, programmes: mobilePack.programmes.map((p) => p.code), empreintes: mobilePack.empreintes.modules };

let server; let base; let admin; let guest;
const call = async (method, url, body, headers = {}) => {
  const r = await fetch(base + url, { method, headers: { 'Content-Type': 'application/json', ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });
  const raw = await r.text();
  return { status: r.status, body: raw ? JSON.parse(raw) : null, headers: r.headers };
};
const data = async (method, url, body, headers) => {
  const r = await call(method, url, body, headers);
  assert.ok(r.status < 300, `${method} ${url} → ${r.status} ${JSON.stringify(r.body)}`);
  return r.body.data;
};
const publish = async (body) => call('POST', '/admin/prep/publications', { expectedGeneration: (await service.current()).generation, ...body }, admin);

/** Synchronisation mobile complète (même enchaînement que contentSync.js). */
const syncLikeMobile = async (cache, followed, headers = guest) => {
  const plan = repo.planUpdate(cache, await data('GET', '/prep/manifest'), bundle);
  if (plan.action !== 'appliquer') return { cache, plan };
  const fetched = { programmes: {}, modules: {} };
  for (const e of plan.fetchProgrammes) fetched.programmes[e.code] = (await data('GET', `/prep/programmes/${e.code}?revision=${e.revision}`)).programme;
  const wanted = new Set(followed.flatMap((code) => (fetched.programmes[code] || repo.resolveProgramme(cache, mobilePack.programmes, code))
    .matieres.flatMap((m) => m.modules.map((r) => r.code))));
  for (const e of plan.fetchModules.filter((x) => wanted.has(x.code))) {
    const r = await call('GET', `/prep/modules/${e.code}?revision=${e.revision}`, undefined, headers);
    if (r.status === 200) fetched.modules[e.code] = { [r.body.data.version || 'fr']: { ...r.body.data, distant: true } };
  }
  return { cache: repo.applyPlan(cache, plan, fetched), plan, fetched };
};

const newModule = () => {
  // Tous les codes (leçons, exercices, mini-questions) sont renommés : ils sont uniques globalement.
  const mod = JSON.parse(JSON.stringify(pack.modules['MATH-LNEXP']).replaceAll('MATH-LNEXP', 'LOT4-MOD'));
  mod.titre = 'Module publié après la sortie de l’app';
  mod.lecons[0].titre = 'Leçon toute neuve';
  return mod;
};
const newProgramme = () => ({
  ...structuredClone(pack.programmes[0]),
  code: 'LOT4-PROG',
  titre: 'Concours publié après la sortie de l’app',
  matieres: [{ nom: 'Mathématiques', teinte: 0, modules: [{ code: 'LOT4-MOD', publie: true }, { code: 'MATH-LNEXP', publie: true }] }],
});

test.before(async () => {
  if (skip) return;
  migration.assertLocalUri(process.env.TEST_MONGODB_URI);
  await mongoose.connect(process.env.TEST_MONGODB_URI);
  await mongoose.connection.dropDatabase();
  const app = require('../server');
  await Promise.all([Content, Publication, Organisme, ParcoursType, User].map((m) => m.createIndexes()));
  const user = await User.create({ name: 'Admin lot 4', email: 'lot4-admin@test.invalid', password: 'password123', role: 'admin' });
  admin = { Authorization: `Bearer ${jwt.sign({ id: String(user._id) }, process.env.JWT_SECRET, { expiresIn: '1h' })}` };
  server = app.listen(0, '127.0.0.1');
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}/api`;
  const device = await call('POST', '/prep/appareils', { appareilId: 'lot4-appareil' });
  guest = { 'X-Prep-Token': device.body.data.token };
  // Import du pack historique (lot 3) avec des organismes de fixture.
  const links = {};
  for (const p of pack.programmes) {
    const org = await Organisme.create({ nom: `Lot4 ${p.code}` });
    const parcours = await ParcoursType.create({ organismeId: org._id, nom: p.parcoursType });
    links[p.code] = { organismeId: String(org._id), parcoursTypeId: String(parcours._id) };
  }
  assert.equal((await migration.migrate({ apply: true, links })).generation, 1);
});
test.after(async () => {
  if (skip) return;
  await new Promise((r) => server.close(r));
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

test('après import, les empreintes Mongo sont celles du pack embarqué : aucun module retéléchargé', { skip }, async () => {
  const { cache, plan } = await syncLikeMobile(repo.emptyCache(), mobilePack.programmes.map((p) => p.code));
  assert.equal(plan.action, 'appliquer');
  assert.equal(plan.fetchModules.length, 0, 'les modules embarqués restent utilisés (correction locale hors ligne)');
  assert.equal(plan.bundleModules.length, Object.keys(mobilePack.modules).length);
  assert.equal(cache.generation, 1);
  assert.equal(repo.resolveModule(cache, bundle, 'MATH-LNEXP').distant, false);
});

test('publication admin → nouveau programme, module et leçon utilisables sans nouvelle version de l’app', { skip }, async () => {
  const start = (await syncLikeMobile(repo.emptyCache(), [])).cache;
  const mod = await data('POST', '/admin/prep/contenus', { kind: 'module', code: 'LOT4-MOD', payload: newModule() }, admin);
  const prog = await data('POST', '/admin/prep/contenus', { kind: 'programme', code: 'LOT4-PROG', payload: newProgramme() }, admin);
  const published = await publish({ revisions: [mod, prog].map(({ kind, code, revision }) => ({ kind, code, revision })) });
  assert.equal(published.status, 200, JSON.stringify(published.body));

  // L'élève voit le nouveau cycle dans le catalogue (pagination incluse).
  const catalogue = await call('GET', '/prep/catalogue?page=1&limit=100');
  assert.ok(catalogue.body.data.some((o) => o.cycles.some((c) => c.programme === 'LOT4-PROG')));
  assert.equal(catalogue.body.meta.pagination.page, 1);

  const { cache, plan } = await syncLikeMobile(start, ['LOT4-PROG']);
  assert.deepEqual(plan.fetchModules.map((e) => e.code), ['LOT4-MOD'], 'seul le module nouveau est téléchargé ; le module partagé reste embarqué');
  assert.equal(repo.resolveProgramme(cache, mobilePack.programmes, 'LOT4-PROG').titre, 'Concours publié après la sortie de l’app');
  const resolved = repo.resolveModule(cache, bundle, 'LOT4-MOD');
  assert.equal(resolved.distant, true);
  assert.equal(resolved.module.lecons[0].titre, 'Leçon toute neuve');
  // Aucune correction notée embarquée : le serveur corrige.
  assert.ok(resolved.module.exercices.every((ex) => repo.needsServerGrading(ex)));
  assert.ok(resolved.module.exercices.every((ex) => !('explication' in ex)));
  assert.equal(repo.resolveModule(cache, bundle, 'MATH-LNEXP').distant, false);

  // Réponse envoyée par la file hors ligne : la note vient du serveur, avec la correction.
  const source = newModule().exercices.find((ex) => ex.type === 'qcm');
  const sync = await data('POST', '/prep/sync', { actions: [{ cle: 'lot4-a1', type: 'tentative', programme: 'LOT4-PROG', exercice: source.code, reponse: { ids: source.cle.ids }, essai: 1, indices: 0, contexte: 'niveau' }] }, guest);
  const [result] = sync.resultats;
  assert.equal(result.ok, true);
  assert.equal(result.correct, true);
  assert.deepEqual(result.correction.cle, source.cle);
  // Rejeu de la même action (reprise après coupure) : comptée une seule fois.
  const replay = await data('POST', '/prep/sync', { actions: [{ cle: 'lot4-a1', type: 'tentative', programme: 'LOT4-PROG', exercice: source.code, reponse: { ids: source.cle.ids }, essai: 1, indices: 0, contexte: 'niveau' }] }, guest);
  assert.equal(replay.resultats[0].doublon, true);
});

test('module protégé : sans identité, refus avant tout contenu ; le cache garde l’état précédent', { skip }, async () => {
  assert.equal((await call('GET', '/prep/modules/LOT4-MOD')).status, 401);
  const { cache } = await syncLikeMobile(repo.emptyCache(), ['LOT4-PROG'], {});
  assert.equal(repo.resolveModule(cache, bundle, 'LOT4-MOD'), null, 'non téléchargé sans droits');
  assert.ok(repo.resolveProgramme(cache, mobilePack.programmes, 'LOT4-PROG'), 'le programme public reste visible');
});

test('mise à jour puis retrait groupé : nouvelle révision servie, puis contenu retiré du mobile', { skip }, async () => {
  const before = (await syncLikeMobile(repo.emptyCache(), ['LOT4-PROG'])).cache;
  assert.equal(repo.resolveModule(before, bundle, 'LOT4-MOD').revision, 1);
  const current = await service.latest('module', 'LOT4-MOD');
  const payload = newModule();
  payload.lecons[0].titre = 'Leçon corrigée';
  const edited = await data('PATCH', '/admin/prep/contenus/module/LOT4-MOD', { expectedRevision: current.revision, payload }, admin);
  assert.equal((await publish({ revisions: [{ kind: 'module', code: 'LOT4-MOD', revision: edited.revision }] })).status, 200);
  const updated = (await syncLikeMobile(before, ['LOT4-PROG'])).cache;
  assert.equal(repo.resolveModule(updated, bundle, 'LOT4-MOD').revision, 2);
  assert.equal(repo.resolveModule(updated, bundle, 'LOT4-MOD').module.lecons[0].titre, 'Leçon corrigée');

  // Un élève en pleine session garde la révision 1 jusqu'à la fin de sa session.
  const during = (await (async () => {
    const plan = repo.planUpdate(before, await data('GET', '/prep/manifest'), bundle);
    const r = await call('GET', '/prep/modules/LOT4-MOD?revision=2', undefined, guest);
    return repo.applyPlan(before, plan, { programmes: {}, modules: { 'LOT4-MOD': { fr: { ...r.body.data, distant: true } } } }, ['LOT4-MOD']);
  })());
  assert.equal(repo.resolveModule(during, bundle, 'LOT4-MOD').revision, 1);
  assert.equal(repo.resolveModule(repo.releaseDeferred(during, []), bundle, 'LOT4-MOD').revision, 2);

  const removed = await publish({ revisions: [], removals: [{ kind: 'programme', code: 'LOT4-PROG' }, { kind: 'module', code: 'LOT4-MOD' }] });
  assert.equal(removed.status, 200, JSON.stringify(removed.body));
  const after = (await syncLikeMobile(updated, [])).cache;
  assert.equal(repo.resolveProgramme(after, mobilePack.programmes, 'LOT4-PROG'), null);
  assert.equal(repo.resolveModule(after, bundle, 'LOT4-MOD'), null);
  assert.ok(repo.resolveModule(after, bundle, 'MATH-LNEXP'), 'le module partagé reste');
});
