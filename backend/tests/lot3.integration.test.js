Object.assign(process.env, { NODE_ENV: 'test', PAYMENT_MODE: 'mock', SEC_DISABLED: 'true', JWT_SECRET: 'lot3-test', JWT_REFRESH_SECRET: 'lot3-refresh-test' });
const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const Content = require('../models/PrepContent');
const Publication = require('../models/PrepPublication');
const Organisme = require('../models/Organisme');
const ParcoursType = require('../models/ParcoursType');
const Noeud = require('../models/Noeud');
const User = require('../models/User');
const PrepProgression = require('../models/PrepProgression');
const service = require('../services/prep/publicationService');
const content = require('../services/prep/contentService');
const migration = require('../scripts/migrations/lot3');
const pack = require('../data/prep/build/pack.json');
const skip = !process.env.TEST_MONGODB_URI;
let server, base, admin, ordinary, guest;
const call = async (method, path, body, headers = {}) => {
  const r = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });
  const raw = await r.text(); return { status: r.status, body: raw ? JSON.parse(raw) : null, headers: r.headers };
};
const draft = (kind, payload) => call('POST', '/admin/prep/contenus', { kind, code: payload.code, payload }, admin);
const edit = (row, payload) => call('PATCH', `/admin/prep/contenus/${row.kind}/${row.code}`, { expectedRevision: row.revision, payload }, admin);
const publish = async (revisions, extra = {}) => call('POST', '/admin/prep/publications', { expectedGeneration: (await service.current()).generation, revisions, ...extra }, admin);
const modFixture = () => structuredClone(pack.modules['MATH-LNEXP']);
const progFixture = (code = 'LOT3-PROG') => ({ ...structuredClone(pack.programmes[0]), code, matieres: [{ nom: 'Mathématiques', modules: [{ code: 'MATH-LNEXP', publie: true }] }] });
test.before(async () => {
  if (skip) return;
  migration.assertLocalUri(process.env.TEST_MONGODB_URI);
  await mongoose.connect(process.env.TEST_MONGODB_URI); await mongoose.connection.dropDatabase();
  const app = require('../server');
  await Promise.all([Content, Publication, Organisme, ParcoursType, Noeud, User, PrepProgression].map(m => m.createIndexes()));
  const users = await User.create([{ name: 'Admin test', email: 'lot3-admin@test.invalid', password: 'password123', role: 'admin' }, { name: 'Élève test', email: 'lot3-user@test.invalid', password: 'password123' }]);
  [admin, ordinary] = users.map(u => ({ Authorization: `Bearer ${jwt.sign({ id: String(u._id) }, process.env.JWT_SECRET, { expiresIn: '1h' })}` }));
  server = app.listen(0, '127.0.0.1'); await new Promise(r => server.once('listening', r)); base = `http://127.0.0.1:${server.address().port}/api`;
  const device = await call('POST', '/prep/appareils', { appareilId: 'lot3-guest' }); assert.equal(device.status, 200); guest = { 'X-Prep-Token': device.body.data.token };
});
test.after(async () => { if (skip) return; await new Promise(r => server.close(r)); await mongoose.connection.dropDatabase(); await mongoose.disconnect(); });

test('administration protégée, brouillons invisibles, doublons et codes immuables', { skip }, async () => {
  assert.equal((await call('GET', '/admin/prep/contenus')).status, 401);
  assert.equal((await call('GET', '/admin/prep/contenus', undefined, ordinary)).status, 403);
  const mod = await draft('module', modFixture()); assert.equal(mod.status, 201);
  assert.equal((await draft('module', modFixture())).status, 409);
  assert.equal((await draft('programme', progFixture())).status, 201);
  assert.equal((await call('GET', '/prep/programmes/LOT3-PROG')).status, 404);
  assert.equal((await edit(mod.body.data, { ...modFixture(), code: 'CHANGED' })).status, 422);
  assert.equal((await draft('other', { code: 'SAFE' })).status, 400);
});
test('validation : traductions, références, types et unicité globale', { skip }, async () => {
  const english = structuredClone(pack.modules['ANG-GRAM']); delete english.versionCible.lecons[english.lecons[0].code];
  const saved = await draft('module', english); const invalid = await publish([saved.body.data]); assert.equal(invalid.status, 422); assert.match(JSON.stringify(invalid.body.details), /manquante/);
  const p = await draft('programme', { ...progFixture('LOT3-BAD'), matieres: [{ nom: 'M', modules: [{ code: 'MISSING', publie: true }] }] });
  assert.equal((await publish([p.body.data])).status, 422);
  const duplicate = await draft('module', { ...modFixture(), code: 'LOT3-DOUBLE' });
  assert.equal((await publish([await service.latest('module', 'MATH-LNEXP'), duplicate.body.data])).status, 422);
  const unsupported = modFixture(); unsupported.lecons[0].blocs[0].type = 'executable';
  assert.ok(require('../services/prep/contentValidator').validateContent([unsupported]).errors.some(e => /type de bloc inconnu/.test(e)));
  const malformed = modFixture(); malformed.lecons[0].blocs = [{ type: 'tableau', entetes: ['A'], lignes: [['A', 'B']] }];
  assert.ok(require('../services/prep/contentValidator').validateContent([malformed]).errors.some(e => /tableau invalide/.test(e)));
  malformed.titre = { fr: 'Objet interdit' };
  assert.ok(require('../services/prep/contentValidator').validateContent([malformed]).errors.some(e => /titre doit être un texte/.test(e)));
  assert.equal((await service.current()).generation, 0);
});
test('publication atomique sans redémarrage, ETag, droits avant 304 et anciennes révisions', { skip }, async () => {
  const rows = await Promise.all([service.latest('module', 'MATH-LNEXP'), service.latest('programme', 'LOT3-PROG')]);
  assert.equal((await publish(rows)).status, 409, 'la première publication exige un import explicite');
  const first = await service.publish({ revisions: rows, expectedGeneration: 0 }, null, { bootstrap: true }); assert.equal(first.generation, 1);
  const manifest = await call('GET', '/prep/manifest'); assert.equal(manifest.body.data.generation, 1);
  assert.equal((await call('GET', '/prep/manifest', undefined, { 'If-None-Match': manifest.headers.get('etag') })).status, 304);
  const mod = await call('GET', '/prep/modules/MATH-LNEXP', undefined, guest); assert.equal(mod.status, 200);
  for (const ex of mod.body.data.exercices) { assert.equal(ex.cle, undefined); assert.equal(ex.explication, undefined); assert.equal(ex.raisonnement?.reference, undefined); }
  assert.equal(mod.body.data.versionCible, undefined);
  const cached = { ...guest, 'If-None-Match': mod.headers.get('etag') };
  assert.equal((await call('GET', '/prep/modules/MATH-LNEXP', undefined, cached)).status, 304);
  assert.equal((await call('GET', '/prep/modules/MATH-LNEXP', undefined, { 'If-None-Match': mod.headers.get('etag') })).status, 401);
  const changed = modFixture(); changed.lecons[0].titre = 'Leçon publiée en direct'; changed.exercices[0].consigne = 'Énoncé modifié en direct';
  const next = await edit(rows[0], changed); assert.equal(next.status, 200);
  assert.notEqual((await call('GET', '/prep/modules/MATH-LNEXP', undefined, guest)).body.data.lecons[0].titre, changed.lecons[0].titre);
  assert.equal((await publish([next.body.data])).status, 200);
  const live = await call('GET', '/prep/modules/MATH-LNEXP', undefined, cached); assert.equal(live.status, 200);
  assert.equal(live.body.data.lecons[0].titre, changed.lecons[0].titre); assert.equal(live.body.data.exercices[0].consigne, changed.exercices[0].consigne); assert.equal(live.body.data.revision, 2);
  assert.equal((await call('GET', '/prep/modules/MATH-LNEXP?revision=1', undefined, guest)).body.data.lecons[0].titre, modFixture().lecons[0].titre);
});
test('concurrence : un gagnant ; interruption avant CAS sans activation', { skip }, async t => {
  const row = await service.latest('module', 'MATH-LNEXP');
  const changes = await Promise.all([edit(row, { ...row.payload, titre: 'A' }), edit(row, { ...row.payload, titre: 'B' })]); assert.deepEqual(changes.map(r => r.status).sort(), [200, 409]);
  const next = changes.find(r => r.status === 200).body.data; const before = await service.current();
  t.mock.method(Publication, 'findOneAndUpdate', () => { throw new Error('Interruption simulée avant CAS'); });
  await assert.rejects(service.publish({ expectedGeneration: before.generation, revisions: [next] }), /Interruption/);
  assert.equal((await service.current()).generation, before.generation); t.mock.restoreAll();
  const both = await Promise.all([1, 2].map(() => call('POST', '/admin/prep/publications', { expectedGeneration: before.generation, revisions: [next] }, admin))); assert.deepEqual(both.map(r => r.status).sort(), [200, 409]);
});
test('module partagé, retrait et dépendances, rollback, progression conservée', { skip }, async () => {
  const p = await draft('programme', progFixture('LOT3-SHARED')); await publish([p.body.data]);
  assert.deepEqual((await call('GET', '/admin/prep/contenus/module/MATH-LNEXP', undefined, admin)).body.data.dependencies.sort(), ['LOT3-PROG', 'LOT3-SHARED']);
  const before = await service.current();
  assert.equal((await call('POST', '/admin/prep/contenus/module/MATH-LNEXP/archiver', { expectedGeneration: before.generation }, admin)).status, 422);
  const progress = await PrepProgression.create({ identite: new mongoose.Types.ObjectId(), programme: 'LOT3-PROG', etat: { lecons: { L: { terminee: true } } } });
  const removed = await publish([], { removals: before.entries.map(({ kind, code }) => ({ kind, code })) }); assert.equal(removed.status, 200); assert.ok(removed.body.data.tombstones.some(r => r.code === 'MATH-LNEXP'));
  assert.equal((await call('GET', '/prep/modules/MATH-LNEXP', undefined, guest)).status, 404);
  assert.equal((await call('GET', '/prep/modules/MATH-LNEXP?revision=1', undefined, guest)).status, 200);
  assert.equal((await PrepProgression.findById(progress._id)).etat.lecons.L.terminee, true);
  assert.equal((await publish([], { rollbackGeneration: before.generation })).status, 200);
  assert.equal((await call('GET', '/prep/modules/MATH-LNEXP', undefined, guest)).status, 200);
});
test('pagination admin au-delà de 100, suppression sans réutilisation de révision', { skip }, async () => {
  await Content.insertMany(Array.from({ length: 105 }, (_, i) => ({ kind: 'module', code: `PAGE-${i}`, revision: 1, payload: { code: `PAGE-${i}` }, hash: 'fixture' })));
  const a = await call('GET', '/admin/prep/contenus?limit=100', undefined, admin); const b = await call('GET', '/admin/prep/contenus?limit=100&page=2', undefined, admin);
  assert.equal(a.body.data.length, 100); assert.ok(b.body.data.length > 5); assert.equal(new Set([...a.body.data, ...b.body.data].map(r => r._id)).size, a.body.meta.pagination.total);
  assert.equal((await call('DELETE', '/admin/prep/contenus/module/PAGE-0/brouillon', { expectedRevision: 1 }, admin)).status, 200);
  assert.equal((await publish([{ kind: 'module', code: 'PAGE-0', revision: 1 }])).status, 422);
  assert.equal((await edit(await service.latest('module', 'PAGE-0'), { code: 'PAGE-0' })).body.data.revision, 2);
});
test('catalogue : découverte vide publiée, archives privées, descendants et pagination', { skip }, async () => {
  const created = await call('POST', '/organismes', { nom: 'Organisme vide lot 3', status: 'draft' }, admin); assert.equal(created.status, 201); const id = created.body.data._id;
  assert.equal((await call('GET', '/organismes')).body.data.some(r => r._id === id), false);
  assert.equal((await call('GET', '/organismes?scope=admin', undefined, ordinary)).status, 403);
  assert.equal((await call('PATCH', `/organismes/${id}`, { status: 'published' }, admin)).status, 200);
  const discovery = await call('GET', '/organismes'); assert.equal(discovery.body.data.find(r => r._id === id).subjectCount, 0); assert.ok(discovery.body.meta.revision > 0);
  assert.equal((await call('GET', '/catalog/organismes')).body.data.some(r => r._id === id), false);
  const child = await Noeud.create({ organismeId: id, nom: '2026', ordreNiveau: 1 });
  assert.equal((await call('POST', `/organismes/${id}/archiver`, {}, admin)).status, 409);
  assert.equal((await call('POST', `/noeuds/${child._id}/archiver`, {}, admin)).status, 200);
  assert.equal((await call('POST', `/organismes/${id}/archiver`, {}, admin)).status, 200);
  assert.equal((await call('PATCH', `/noeuds/${child._id}`, { status: 'published' }, admin)).status, 404);
  await Organisme.insertMany(Array.from({ length: 105 }, (_, i) => ({ nom: `Pagination ${i}`, nomNormalise: `pagination ${i}`, slug: `page-${i}` })));
  assert.equal((await call('GET', '/organismes?limit=100')).body.data.length, 100); assert.equal((await call('GET', '/organismes?limit=100&page=2')).body.data.length, 5);
});
test('import : à blanc, liens explicites, répétition sans écrasement des éditions', { skip }, async () => {
  await Content.deleteMany({}); await Publication.deleteMany({}); content.resetCache();
  const before = await migration.migrate(); assert.equal(before.modules, 39); assert.equal(before.programmes, 8); assert.equal(await Content.countDocuments(), 0);
  await assert.rejects(migration.migrate({ apply: true }), /Rapprochement/); assert.throws(() => migration.assertLocalUri('mongodb://production.invalid/fatafalta'));
  const links = {};
  for (const p of pack.programmes) { const org = await Organisme.create({ nom: `Import ${p.code}` }); const parcours = await ParcoursType.create({ organismeId: org._id, nom: p.parcoursType }); links[p.code] = { organismeId: String(org._id), parcoursTypeId: String(parcours._id) }; }
  const first = await migration.migrate({ apply: true, links }); assert.equal(first.generation, 1); assert.equal(await Content.countDocuments(), 47);
  const row = await service.latest('module', 'MATH-LNEXP'); const modified = await service.saveDraft({ ...row, expectedRevision: row.revision, payload: { ...row.payload, titre: 'Édition conservée' } });
  const revisionBeforeRetry = (await require('../models/CatalogRevision').findById('catalog').lean()).revision;
  assert.equal((await migration.migrate({ apply: true, links })).alreadyImported, true);
  assert.equal((await require('../models/CatalogRevision').findById('catalog').lean()).revision, revisionBeforeRetry); assert.equal(await Content.countDocuments(), 48); assert.equal((await service.latest('module', 'MATH-LNEXP')).revision, modified.revision);
});
test('vidéo liée à une révision et snapshot stable pendant une requête', { skip }, async () => {
  const initial = await content.snapshot(); const cible = require('../scripts/video/lib/cible').resolveCible({ type: 'lecon', id: 'MATH-LNEXP-L1' }, initial.pack); assert.equal(cible.contentRevision, 1); assert.equal(cible.contentGeneration, 1);
  await content.withSnapshot(async () => { const previous = content.getModule('MATH-LNEXP'); await service.publish({ expectedGeneration: 1, revisions: [await service.latest('module', 'MATH-LNEXP')] }); assert.equal(content.getModule('MATH-LNEXP'), previous); });
  assert.equal((await content.snapshot()).pack.modules['MATH-LNEXP'].revision, 2);
});

test('vidéos sans révision ou obsolètes masquées ; références versionnées servies', { skip }, async () => {
  const Video = require('../models/PrepVideo'); const videos = require('../services/prep/videoService');
  const snapshot = await content.snapshot(); const mod = snapshot.pack.modules['MATH-LNEXP'];
  const row = { cible: 'lecon', code: mod.lecons[0].code, youtubeId: 'VJns0RfVWGg', url: 'https://www.youtube.com/watch?v=VJns0RfVWGg', status: 'published' };
  const video = await Video.create(row); videos.reset();
  assert.equal((await call('GET', '/prep/modules/MATH-LNEXP', undefined, guest)).body.data.lecons[0].video, null);
  await Video.updateOne({ _id: video._id }, { $set: { 'source.contentRevision': mod.revision, 'source.contentGeneration': snapshot.manifest.generation, 'source.needsReview': false } }); videos.reset();
  const live = await call('GET', '/prep/modules/MATH-LNEXP', undefined, guest); assert.equal(live.body.data.lecons[0].video.contentRevision, mod.revision);
  assert.equal((await call('GET', '/prep/modules/MATH-LNEXP?revision=1', undefined, guest)).body.data.lecons[0].video, null);
  assert.ok((await call('GET', '/prep/videos')).body.data.lecons[row.code]);
});
test('refus Premium avant 304 après épuisement de l’essai', { skip }, async () => {
  const mod = await call('GET', '/prep/modules/MATH-LNEXP', undefined, guest); assert.equal(mod.status, 200);
  const Identity = require('../models/PrepIdentite'); const identity = require('../services/prep/identityService');
  const id = identity.verifyToken(guest['X-Prep-Token']);
  const oldDays = Array.from({ length: 7 }, (_, i) => new Date(Date.now() - (i + 1) * 864e5).toISOString().slice(0, 10));
  await Identity.updateOne({ _id: id }, { $set: { 'essai.jours': oldDays } });
  const denied = await call('GET', '/prep/modules/MATH-LNEXP', undefined, { ...guest, 'If-None-Match': mod.headers.get('etag') }); assert.equal(denied.status, 403);
});
test('matière et parcours : modification, archivage, découverte filtrée et compteur', { skip }, async () => {
  const org = await Organisme.create({ nom: 'Cycle de vie complet' });
  const mat = await call('POST', '/matieres/trouver-ou-creer', { organismeId: org._id, nom: 'Sciences' }, admin); assert.equal(mat.status, 200);
  const parcours = await call('POST', `/organismes/${org._id}/parcours-types`, { nom: 'Concours' }, admin); assert.equal(parcours.status, 201);
  const before = (await call('GET', '/organismes')).body.meta.revision;
  assert.equal((await call('PATCH', `/matieres/${mat.body.data._id}`, { nom: 'Sciences exactes', status: 'draft' }, admin)).status, 200);
  assert.equal((await call('GET', `/matieres?organismeId=${org._id}`)).body.data.length, 0);
  assert.equal((await call('GET', `/matieres?organismeId=${org._id}&scope=admin`, undefined, admin)).body.data[0].nom, 'Sciences exactes');
  assert.equal((await call('POST', `/parcoursTypes/${parcours.body.data._id}/archiver`, {}, admin)).status, 200);
  assert.equal((await call('GET', `/organismes/${org._id}/parcours-types`)).body.data.length, 0);
  assert.ok((await call('GET', '/organismes')).body.meta.revision > before);
  assert.equal((await call('PATCH', `/organismes/${org._id}`, { status: 'invalide' }, admin)).status, 400);
});
