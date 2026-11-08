const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const Progress = require('../models/PrepProgression');
const Identity = require('../models/PrepIdentite');
const ranking = require('../services/prep/rankingService');
const { pseudonymFields, escapeRegex } = require('../services/prep/pseudonymSearch');
const core = require('../services/prep/shared/prepCore');
const id = (n) => new mongoose.Types.ObjectId(n.toString(16).padStart(24, '0'));

test('recherche : normalisation accents/casse et numéro, regex traitées littéralement', async () => {
  const identity = new Identity({ pseudonyme: 'ÉcUrEuIl-1172' });
  await identity.validate();
  assert.equal(identity.pseudonymeNormalise, 'ecureuil-1172');
  assert.equal(identity.pseudonymeNumero, '1172');
  assert.deepEqual(pseudonymFields('E\u0301cureuil-1172'), pseudonymFields('ÉCUREUIL-1172'));
  for (const input of ['.*', '[a-z]', 'a|b', '(?=x)', '^a$', '\\d+', 'a{2}']) {
    const regex = new RegExp(`^${escapeRegex(input)}`);
    assert.equal(regex.test(input + 'suffixe'), true);
    assert.equal(regex.test('autre'), false);
  }
});

test('statistiques : réussies et taux portent sur les mêmes premiers essais N1–N3 hors test', () => {
  let state = core.emptyProgress();
  const apply = (over) => { state = core.applyAttempt(state, { exercice: 'E', module: 'M', niveau: 1, jour: '2026-11-08', essai: 1, correct: true, ...over }); };
  apply({}); apply({ niveau: 2, correct: false }); apply({ niveau: 3, contexte: 'revision' });
  apply({ contexte: 'blanc' }); apply({ contexte: 'test' }); apply({ niveau: 4 });
  apply({ essai: 2 }); apply({ essai: 2, contexte: 'test' });
  const stats = core.publicStats(state);
  assert.equal(stats.questions, 6); assert.equal(stats.reussies, 3);
  assert.equal(stats.reussite, 0.75); assert.equal(stats.secondesChancesReussies, 2);
});

test('paramètres malformés rejetés avant toute requête Mongo', async (t) => {
  t.mock.method(Progress, 'countDocuments', () => { throw new Error('Aucune requête ne doit partir'); });
  for (const options of [{ periode: 'an' }, { limite: '0' }, { limite: '-2' }, { limite: '3.5' },
    { limite: '9007199254740992' }, { limite: ['30'] }, { apres: '***' }, { apres: '' }, { apres: Buffer.from('{}').toString('base64url') },
    { apres: 'a', avant: 'b' }, { autour: 'autre' }, { autour: 'moi', apres: 'a' }]) {
    await assert.rejects(ranking.ranking(null, 'P', options), { statusCode: 400 });
  }
  for (const q of ['', 'a', 'x'.repeat(41), { $regex: '.*' }, ['ca']]) {
    await assert.rejects(ranking.searchCandidates('P', q), { statusCode: 400 });
  }
});

test('projection stricte, visibilité avant limite, ex æquo et cache jamais personnel', async (t) => {
  ranking.invalidateRanking(); t.after(() => ranking.invalidateRanking());
  const viewerA = { _id: id(1), pseudonyme: 'A', visibleClassement: false };
  const viewerB = { _id: id(2), pseudonyme: 'B', visibleClassement: true };
  let mineCalls = 0; let totalCalls = 0; let pageCalls = 0;
  const selections = []; const pipelines = [];
  const query = (value) => ({
    select(fields) { selections.push(fields); return this; },
    maxTimeMS(ms) { assert.equal(ms, 3000); return this; },
    lean() { return Promise.resolve(value); },
  });
  t.mock.method(Progress, 'findOne', ({ identite }) => {
    mineCalls += 1;
    return query({ _id: id(100), score: String(identite) === String(viewerA._id) ? 50 : 90, stats: { questions: mineCalls } });
  });
  t.mock.method(Progress, 'countDocuments', (filter) => {
    if (!filter.score) totalCalls += 1;
    return { maxTimeMS(ms) { assert.equal(ms, 3000); return Promise.resolve(!filter.score ? 5 : filter.score.$gt === 90 ? 0 : 3); } };
  });
  t.mock.method(Progress, 'aggregate', (pipeline) => {
    pipelines.push(pipeline);
    let result;
    if (pipeline.some((s) => s.$bucket)) {
      // Cinq participants : 90,90,70,50,30 ; les deux 90 sont ex æquo.
      result = [{ _id: 90, count: 2, ties: 2 }, { _id: 50, count: 2, ties: 1 }];
    } else {
      pageCalls += 1;
      result = [90, 90, 50].map((score, i) => ({ _id: id(i + 10), score, stats: {}, profil: { _id: id(i + 2), pseudonyme: `C-${i}` } }));
    }
    return { option({ maxTimeMS }) { assert.equal(maxTimeMS, 3000); return Promise.resolve(result); } };
  });
  t.mock.method(Identity, 'find', () => query([0, 1, 2].map((i) => ({ _id: id(i + 2), pseudonyme: `C-${i}` }))));
  const a = await ranking.ranking(viewerA, 'P'); const b = await ranking.ranking(viewerB, 'P');
  assert.equal(a.moi.rang, 4); assert.equal(a.moi.visible, false);
  assert.equal(b.moi.rang, 1); assert.equal(b.moi.pseudonyme, 'B'); assert.notDeepEqual(a.moi.stats, b.moi.stats);
  assert.equal(a.candidats[0].moi, false); assert.equal(b.candidats[0].moi, true);
  assert.deepEqual(a.candidats.map((r) => r.rang), [1, 1, 4]);
  assert.equal(mineCalls, 2); assert.equal(totalCalls, 1); assert.equal(pageCalls, 1);
  for (const fields of selections) {
    if (typeof fields === 'string') { assert.equal(fields.includes('etat'), false); assert.ok(fields.includes('score')); }
    else assert.equal(fields.etat, undefined);
  }
  const pipeline = pipelines.find((p) => p.some((s) => s.$lookup));
  assert.deepEqual(pipeline.find((s) => s.$project).$project, { _id: 1, identite: 1, score: 1, stats: 1 });
  assert.ok(pipeline.findIndex((s) => s.$lookup) < pipeline.findIndex((s) => s.$limit));
  assert.equal(pipeline.find((s) => s.$lookup).$lookup.pipeline[0].$match.visibleClassement.$ne, false);
  ranking.invalidateRanking('P'); await ranking.ranking(null, 'P');
  assert.equal(totalCalls, 2); assert.equal(pageCalls, 2);
});

test('cache : expiration à 45 s, borne de 200 programmes et échec non mémorisé', async (t) => {
  ranking.invalidateRanking(); t.after(() => ranking.invalidateRanking());
  let now = 100000; let totals = 0; let fail = true;
  t.mock.method(Date, 'now', () => now);
  t.mock.method(Progress, 'countDocuments', () => ({ maxTimeMS() {
    totals += 1; return fail ? Promise.reject(new Error('Mongo indisponible')) : Promise.resolve(0);
  } }));
  t.mock.method(Progress, 'aggregate', () => ({ option: () => Promise.resolve([]) }));
  await assert.rejects(ranking.ranking(null, 'P'), /Mongo indisponible/); fail = false;
  await ranking.ranking(null, 'P'); await ranking.ranking(null, 'P'); assert.equal(totals, 2);
  now += 45001; await ranking.ranking(null, 'P'); assert.equal(totals, 3);
  for (let i = 0; i < 200; i += 1) await ranking.ranking(null, `P${i}`);
  await ranking.ranking(null, 'P'); assert.equal(totals, 204);
});

test('profil : projection sans etat et filtre de période du rang', async (t) => {
  const selections = []; let rankFilter;
  const query = (value) => ({ select(fields) { selections.push(fields); return this; }, maxTimeMS() { return this; }, lean: async () => value });
  t.mock.method(Identity, 'findById', () => query({ _id: id(1), pseudonyme: 'Cauri', visibleClassement: false }));
  t.mock.method(Progress, 'findOne', () => query({ score: 30, stats: {}, matieresFortes: ['Maths'] }));
  t.mock.method(Progress, 'countDocuments', (filter) => { rankFilter = filter; return { maxTimeMS: async () => 2 }; });
  assert.equal(await ranking.candidateProfile('P', String(id(1))), null);
  const own = await ranking.candidateProfile('P', String(id(1)), { periode: 'semaine', viewer: { _id: id(1) } });
  assert.equal(own.rang, 3); assert.deepEqual(own.matieresFortes, ['Maths']);
  assert.equal(rankFilter.programme, 'P'); assert.equal(rankFilter.score.$gt, 30);
  assert.ok(rankFilter.derniereActivite.$gte instanceof Date);
  assert.ok(selections.every((s) => typeof s !== 'string' || !s.includes('etat')));
});

// Faux stockage en mémoire : applique les filtres/ordre/limites soumis par le service, sans socket.
// Les tests Mongo séparés vérifient le moteur Mongo et les vrais index ; ce faux ne les remplace pas.
const fakeStorage = (t) => {
  ranking.invalidateRanking(); t.after(() => ranking.invalidateRanking());
  const rows = Array.from({ length: 120 }, (_, i) => ({
    _id: id(i + 1000), identite: id(i + 1), score: Math.floor((120 - i) / 3), stats: { questions: i },
    profil: { _id: id(i + 1), pseudonyme: `P-${i}`, visibleClassement: i % 7 !== 0 },
  }));
  const compare = (a, b) => String(a) < String(b) ? -1 : String(a) > String(b) ? 1 : 0;
  const matches = (row, filter) => Object.entries(filter).every(([key, condition]) => {
    if (key === 'programme') return true;
    if (key === '$or') return condition.some((branch) => matches(row, branch));
    if (condition && typeof condition === 'object' && !condition._bsontype) return Object.entries(condition).every(([op, value]) => {
      const cmp = typeof row[key] === 'number' ? row[key] - value : compare(row[key], value);
      return { $gt: cmp > 0, $gte: cmp >= 0, $lt: cmp < 0, $lte: cmp <= 0 }[op];
    });
    return compare(row[key], condition) === 0;
  });
  t.mock.method(Identity, 'find', () => ({ select() { return this; }, maxTimeMS() { return this; }, lean: async () => rows.filter((r) => r.profil.visibleClassement).map((r) => r.profil) }));
  t.mock.method(Progress, 'findOne', ({ identite }) => ({ select() { return this; }, maxTimeMS() { return this; }, lean: async () => rows.find((r) => compare(r.identite, identite) === 0) || null }));
  t.mock.method(Progress, 'countDocuments', (filter) => ({ maxTimeMS: async () => rows.filter((r) => matches(r, filter)).length }));
  t.mock.method(Progress, 'aggregate', (pipeline) => ({ option: async () => {
    const selected = rows.filter((r) => matches(r, pipeline[0].$match));
    const bucket = pipeline.find((s) => s.$bucket)?.$bucket;
    if (bucket) {
      const boundaries = bucket.boundaries;
      return boundaries.slice(0, -1).map((lower, i) => {
        const scores = selected.filter((r) => r.score >= lower && r.score < boundaries[i + 1]);
        return { _id: lower, count: scores.length, ties: scores.filter((r) => r.score === lower).length };
      }).filter((b) => b.count).reverse();
    }
    const sort = pipeline.find((s) => s.$sort).$sort;
    selected.sort((a, b) => (a.score - b.score) * sort.score || compare(a._id, b._id) * sort._id);
    return selected.filter((r) => r.profil.visibleClassement).slice(0, pipeline.find((s) => s.$limit).$limit);
  } }));
  return rows;
};

test('pagination du service : 120 participants, ex æquo aux frontières, pages complètes et retour arrière', async (t) => {
  const rows = fakeStorage(t);
  const expected = rows.filter((r) => r.profil.visibleClassement).map((r) => String(r.identite));
  let cursor; const collected = []; let last;
  do {
    last = await ranking.ranking(null, 'P', { limite: 7, ...(cursor ? { apres: cursor } : {}) });
    for (const candidate of last.candidats) {
      assert.equal(candidate.rang, rows.filter((r) => r.score > candidate.score).length + 1);
      assert.equal(candidate.rangApprox, candidate.rang);
    }
    collected.push(...last.candidats.map((r) => r.identite)); cursor = last.suivant;
  } while (cursor);
  assert.deepEqual(collected, expected); assert.equal(new Set(collected).size, expected.length);
  const previous = await ranking.ranking(null, 'P', { limite: 7, avant: last.precedent });
  const start = expected.indexOf(last.candidats[0].identite);
  assert.deepEqual(previous.candidats.map((r) => r.identite), expected.slice(Math.max(0, start - 7), start));
  const next = await ranking.ranking(null, 'P', { limite: 7, apres: previous.suivant });
  assert.deepEqual(next.candidats, last.candidats);
  const maximum = await ranking.ranking(null, 'P', { limite: 1000 }); assert.equal(maximum.candidats.length, 50);
});

test('autour=moi du service : centre visible/masqué, bords, limite=1 et utilisateur absent', async (t) => {
  const rows = fakeStorage(t);
  for (const index of [0, 1, 50, 56, 119]) {
    const row = rows[index];
    const viewer = { _id: row.identite, ...row.profil };
    for (const limite of [1, 4, 5]) {
      const page = await ranking.ranking(viewer, 'P', { autour: 'moi', limite });
      assert.equal(page.candidats.length, limite); assert.equal(page.moi.rang, rows.filter((r) => r.score > row.score).length + 1);
      assert.equal(page.candidats.some((r) => r.moi), row.profil.visibleClassement);
      const positions = page.candidats.map((r) => rows.findIndex((x) => String(x.identite) === r.identite));
      assert.deepEqual(positions, [...positions].sort((a, b) => a - b));
      if (row.profil.visibleClassement && index === 50) assert.equal(page.candidats[Math.floor(limite / 2)].moi, true);
    }
  }
  const absent = await ranking.ranking({ _id: id(9999) }, 'P', { autour: 'moi', limite: 3 });
  assert.equal(absent.moi, null); assert.equal(absent.rang, null); assert.equal(absent.candidats.length, 3);
});


test('cache public : masquage sans invalidation locale détecté, page rechargée et complétée', async (t) => {
  const rows = fakeStorage(t);
  const first = await ranking.ranking(null, 'P', { limite: 3 });
  const victim = first.candidats[0].identite;
  rows.find((r) => String(r.identite) === victim).profil.visibleClassement = false;
  const second = await ranking.ranking(null, 'P', { limite: 3 });
  assert.equal(second.candidats.length, 3);
  assert.ok(second.candidats.every((r) => r.identite !== victim));
  assert.deepEqual(second.candidats.map((r) => r.identite), rows.filter((r) => r.profil.visibleClassement).slice(0, 3).map((r) => String(r.identite)));
});
