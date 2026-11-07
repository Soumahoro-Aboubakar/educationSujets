/**
 * Vidéos explicatives (modules / concours) et versions linguistiques des cours de langue.
 * Tests sans base de données : le modèle Mongo est remplacé par un faux.
 *   node --test tests/prepVideo.test.js
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { createVideoService, buildIndex, publicVideo } = require('../services/prep/videoService');
const content = require('../services/prep/contentService');
const core = require('../services/prep/shared/prepCore');
const prep = require('../controllers/prepController');

const doc = (over) => ({
  cible: 'module', code: 'MATH-LNEXP', langue: 'fr', youtubeId: 'VJns0RfVWGg',
  url: 'https://www.youtube.com/watch?v=VJns0RfVWGg', title: 'Logarithme', durationSec: 1095,
  publishedAt: new Date('2026-11-07T10:00:00Z'), status: 'published',
  source: { empreinteContenu: 'abc', fichierSha256: 'def' }, ...over,
});

/** Faux modèle Mongoose : find(filtre).select().lean() */
const fakeModel = (docs, { fail = false } = {}) => {
  const calls = { find: 0 };
  return {
    calls,
    find(filter) {
      calls.find += 1;
      const chain = {
        select: () => chain,
        lean: async () => {
          if (fail) throw new Error('base indisponible');
          return docs.filter((d) => !filter.status || d.status === filter.status);
        },
      };
      return chain;
    },
  };
};

test('index : seules les vidéos publiées, rangées par cible, code et langue', () => {
  const idx = buildIndex([
    doc(),
    doc({ code: 'ANG-GRAM', langue: 'en', youtubeId: 'XGw2-p2WuJk' }),
    doc({ cible: 'concours', code: 'ENSEA-AS', youtubeId: 'L3L2zw335uM' }),
    doc({ code: 'MATH-PROBA', status: 'processing' }),
    doc({ code: 'MATH-SUITES', status: 'hidden' }),
  ]);
  assert.equal(idx.modules['MATH-LNEXP'].fr.youtubeId, 'VJns0RfVWGg');
  assert.equal(idx.modules['ANG-GRAM'].en.youtubeId, 'XGw2-p2WuJk');
  assert.equal(idx.modules['ANG-GRAM'].fr, undefined);
  assert.equal(idx.concours['ENSEA-AS'].fr.youtubeId, 'L3L2zw335uM');
  assert.equal(idx.modules['MATH-PROBA'], undefined);
  assert.equal(idx.modules['MATH-SUITES'], undefined);
});

test('projection publique : contrat de l’API, sans données internes', () => {
  const v = publicVideo(doc());
  assert.deepEqual(Object.keys(v).sort(), ['durationSec', 'publishedAt', 'status', 'title', 'url', 'youtubeId']);
  assert.equal(publicVideo(null), null);
});

test('service : cache de 5 min, puis relecture de la base', async () => {
  let t = 0;
  const model = fakeModel([doc()]);
  const svc = createVideoService({ model, now: () => t, isReady: () => true });
  assert.equal((await svc.forModule('MATH-LNEXP')).youtubeId, 'VJns0RfVWGg');
  await svc.forModule('MATH-LNEXP');
  assert.equal(model.calls.find, 1, 'deuxième appel servi par le cache');
  t += 5 * 60 * 1000 + 1;
  await svc.index();
  assert.equal(model.calls.find, 2);
});

test('service : absence de vidéo → null ; langue demandée respectée', async () => {
  const svc = createVideoService({ model: fakeModel([doc({ code: 'ANG-GRAM', langue: 'en' })]), isReady: () => true });
  assert.equal(await svc.forModule('MATH-PROBA'), null);
  assert.equal(await svc.forModule('ANG-GRAM'), null, 'pas de vidéo française → rien');
  assert.ok(await svc.forModule('ANG-GRAM', 'en'));
  assert.equal(await svc.forConcours('ENSEA-AS'), null);
});

test('service : base indisponible → dernier index connu, sinon index vide (jamais d’erreur)', async () => {
  const svc = createVideoService({ model: fakeModel([], { fail: true }), isReady: () => true });
  assert.deepEqual(await svc.index(), { modules: {}, concours: {} });
  const offline = createVideoService({ model: fakeModel([doc()]), isReady: () => false });
  assert.deepEqual(await offline.index(), { modules: {}, concours: {} });
});

test('versions : un module non linguistique n’a qu’une version, inchangée', () => {
  const mod = content.getModule('MATH-LNEXP');
  assert.deepEqual(core.moduleVersions(mod), ['fr']);
  assert.equal(core.moduleVersion(mod, 'en'), mod);
});

test('versions : ANG-GRAM existe en français (par défaut) et en anglais, mêmes exercices et mêmes clés', () => {
  const mod = content.getModule('ANG-GRAM');
  assert.equal(mod.langueCible, 'en');
  assert.deepEqual(core.moduleVersions(mod), ['fr', 'en']);
  const en = core.moduleVersion(mod, 'en');
  assert.equal(en.version, 'en');
  assert.notEqual(en.titre, mod.titre);
  assert.deepEqual(en.lecons.map((l) => l.code), mod.lecons.map((l) => l.code));
  assert.deepEqual(en.exercices.map((e) => e.code), mod.exercices.map((e) => e.code));
  en.exercices.forEach((ex, i) => {
    assert.deepEqual(ex.cle, mod.exercices[i].cle, `${ex.code} : clé identique`);
    assert.notEqual(ex.consigne, mod.exercices[i].consigne, `${ex.code} : consigne traduite`);
    assert.ok(core.validate(ex, { ids: ex.cle.ids }) !== null);
  });
});

test('API module : version demandée, versions disponibles, jamais la version cible brute ni les clés', () => {
  const mod = content.getModule('ANG-GRAM');
  const fr = content.publicModule(mod);
  const en = content.publicModule(mod, 'en');
  assert.equal(fr.version, 'fr');
  assert.equal(en.version, 'en');
  assert.deepEqual(en.versions, ['fr', 'en']);
  [fr, en].forEach((m) => {
    assert.equal(m.versionCible, undefined);
    m.exercices.forEach((ex) => { assert.equal(ex.cle, undefined); assert.equal(ex.explication, undefined); });
  });
});

test('API raisonnement : la référence suit la version lue', () => {
  const found = content.getExercise('ANG-GRAM-E07');
  assert.match(content.exerciseIn(found, 'fr').raisonnement.reference, /passé imaginaire/);
  assert.match(content.exerciseIn(found, 'en').raisonnement.reference, /unreal past/);
});

/** Appelle un contrôleur Express avec une fausse réponse. */
const run = (handler, req) => new Promise((resolve, reject) => {
  const res = { headers: {}, set(k, v) { this.headers[k] = v; return this; }, json(body) { resolve({ body, headers: this.headers }); } };
  handler({ params: {}, query: {}, body: {}, ...req }, res, reject);
});

test('GET /modules/:code : champ video présent (null sans vidéo) et version', async () => {
  const { body } = await run(prep.getModule, { params: { code: 'ANG-GRAM' }, query: { version: 'en' } });
  assert.equal(body.data.version, 'en');
  assert.ok('video' in body.data);
  assert.equal(body.data.video, null);
});

test('GET /programmes/:code : video du concours et de chaque module (null sans vidéo)', async () => {
  const { body } = await run(prep.getProgramme, { params: { code: 'ENSEA-AS' } });
  assert.ok('video' in body.data.programme);
  Object.values(body.data.modules).forEach((m) => { assert.ok('video' in m); assert.ok(Array.isArray(m.versions)); });
});

test('GET /videos : index compact, cacheable', async () => {
  const { body, headers } = await run(prep.getVideos, {});
  assert.deepEqual(Object.keys(body.data).sort(), ['concours', 'modules']);
  assert.match(headers['Cache-Control'], /max-age=300/);
});
