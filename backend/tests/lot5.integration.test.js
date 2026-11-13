Object.assign(process.env, { NODE_ENV: 'test', PAYMENT_MODE: 'mock', SEC_DISABLED: 'true', JWT_SECRET: 'lot5-test', JWT_REFRESH_SECRET: 'lot5-refresh-test', PAYMENT_RECONCILE_INTERVAL_SECONDS: '0' });
/**
 * Lot 5 — progression durable et reprise entre appareils, sur MongoDB local réel :
 * déduplication de toutes les actions, écritures concurrentes, reprise après crash à chaque étape,
 * acquittements partiels, conflits de reprise, lecture par un second appareil.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const PrepAction = require('../models/PrepAction');
const PrepProgression = require('../models/PrepProgression');
const PrepTentative = require('../models/PrepTentative');
const PrepIdentite = require('../models/PrepIdentite');
const core = require('../services/prep/shared/prepCore');
const { assertLocalUri } = require('../scripts/migrations/lot1');
const pack = require('../data/prep/build/pack.json');

const skip = !process.env.TEST_MONGODB_URI;
const PROG = pack.programmes.find((p) => p.matieres.some((m) => m.modules.some((r) => r.code === 'MATH-LNEXP'))) || pack.programmes[0];
const MOD = pack.modules['MATH-LNEXP'] ? 'MATH-LNEXP' : PROG.matieres[0].modules.find((r) => r.publie).code;
const LESSON = pack.modules[MOD].lecons[0].code;
const QCM = pack.modules[MOD].exercices.find((ex) => ex.type === 'qcm');
const today = core.dayKey(new Date());

let server; let base;
const call = async (method, url, body, headers = {}) => {
  const r = await fetch(base + url, { method, headers: { 'Content-Type': 'application/json', ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });
  const raw = await r.text();
  return { status: r.status, body: raw ? JSON.parse(raw) : null };
};
const device = async (id) => ({ 'X-Prep-Token': (await call('POST', '/prep/appareils', { appareilId: id })).body.data.token });
const sync = async (headers, actions) => {
  const r = await call('POST', '/prep/sync', { actions: actions.map((a) => ({ programme: PROG.code, jour: today, ...a })) }, headers);
  assert.equal(r.status, 200, JSON.stringify(r.body));
  return r.body.data;
};
const etatOf = async (headers) => (await call('GET', '/prep/progressions', undefined, headers)).body.data.progressions[PROG.code];

test.before(async () => {
  if (skip) return;
  assertLocalUri(process.env.TEST_MONGODB_URI);
  await mongoose.connect(process.env.TEST_MONGODB_URI);
  await mongoose.connection.dropDatabase();
  const app = require('../server');
  await Promise.all([PrepAction, PrepProgression, PrepTentative, PrepIdentite].map((m) => m.createIndexes()));
  server = app.listen(0, '127.0.0.1');
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}/api`;
});
test.after(async () => {
  if (skip) return;
  await new Promise((r) => server.close(r));
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

test('toutes les actions sont dédoublonnées : minutes, leçon, tentative et blanc rejoués comptent une fois', { skip }, async () => {
  const a = await device('lot5-dedup');
  const actions = [
    { cle: 'd-min', type: 'minutes', minutes: 4 },
    { cle: 'd-lec', type: 'lecon', lecon: LESSON, position: 0.5, terminee: false },
    { cle: 'd-ten', type: 'tentative', exercice: QCM.code, reponse: { ids: QCM.cle.ids }, essai: 1, indices: 0, contexte: 'blanc', session: 'blanc-1' },
    { cle: 'd-bla', type: 'blanc', session: 'blanc-1', nbQuestions: 1, duree: 3 },
  ];
  const first = await sync(a, actions);
  assert.deepEqual(first.resultats.map((r) => r.statut), ['applied', 'applied', 'applied', 'applied']);
  const replay = await sync(a, actions);
  assert.deepEqual(replay.resultats.map((r) => r.statut), ['duplicate', 'duplicate', 'duplicate', 'duplicate']);
  assert.equal(replay.resultats[2].correct, true, 'le rejeu renvoie le même résultat');
  const etat = (await etatOf(a)).etat;
  assert.equal(etat.minutesParJour[today], 4);
  assert.equal(etat.blancs.length, 1);
  assert.equal(etat.compteurs.questions, 1);
  assert.equal(await PrepTentative.countDocuments({ cleClient: 'd-ten' }), 1);
});

test('deux appareils écrivent en même temps : aucune écriture perdue (écriture conditionnelle)', { skip }, async () => {
  const a = await device('lot5-concurrent');
  await sync(a, [{ cle: 'c-0', type: 'minutes', minutes: 1 }]);
  const batches = Array.from({ length: 6 }, (_, i) => sync(a, [{ cle: `c-${i + 1}`, type: 'minutes', minutes: 1 }]));
  const outs = await Promise.all(batches);
  const statuts = outs.map((o) => o.resultats[0].statut);
  // Chaque envoi est appliqué, ou renvoyé « retry » (le client le renverra) : jamais perdu en silence.
  const retried = outs.flatMap((o, i) => (o.resultats[0].statut === 'retry' ? [`c-${i + 1}`] : []));
  if (retried.length) await sync(a, retried.map((cle) => ({ cle, type: 'minutes', minutes: 1 })));
  assert.ok(statuts.every((s) => s === 'applied' || s === 'retry'), statuts.join());
  const doc = await etatOf(a);
  assert.equal(doc.etat.minutesParJour[today], 7);
  assert.ok(doc.revision >= 2);
});

test('crash entre chacune des étapes : reprise sans perte ni double application', { skip }, async () => {
  const a = await device('lot5-crash');
  await sync(a, [{ cle: 'k-init', type: 'minutes', minutes: 1 }]);
  const doc = await PrepProgression.findOne({ programme: PROG.code, appliquees: 'k-init' });
  const identite = doc.identite;

  // 1. Action réservée puis crash avant tout calcul : le renvoi l'applique.
  await PrepAction.create({ identite, cle: 'k-reserve', type: 'minutes', programme: PROG.code });
  assert.equal((await sync(a, [{ cle: 'k-reserve', type: 'minutes', minutes: 2 }])).resultats[0].statut, 'applied');

  // 2. Tentative enregistrée puis crash avant l'écriture de la progression : pas de seconde tentative.
  await PrepAction.create({ identite, cle: 'k-tent', type: 'tentative', programme: PROG.code });
  await PrepTentative.create({ identite, programme: PROG.code, module: MOD, exercice: QCM.code, correct: true, score: 1, points: 10, jour: today, cleClient: 'k-tent' });
  const before = (await etatOf(a)).etat.compteurs.questions;
  const t = await sync(a, [{ cle: 'k-tent', type: 'tentative', exercice: QCM.code, reponse: { ids: QCM.cle.ids }, essai: 1, indices: 0 }]);
  assert.equal(t.resultats[0].statut, 'applied');
  assert.equal(await PrepTentative.countDocuments({ cleClient: 'k-tent' }), 1);
  assert.equal((await etatOf(a)).etat.compteurs.questions, before + 1);

  // 3. Progression écrite (marqueur appliqué) puis crash avant la finalisation du journal.
  await PrepAction.create({ identite, cle: 'k-applied', type: 'minutes', programme: PROG.code });
  await PrepProgression.updateOne({ _id: doc._id }, { $push: { appliquees: 'k-applied' } });
  const minutes = (await etatOf(a)).etat.minutesParJour[today];
  assert.equal((await sync(a, [{ cle: 'k-applied', type: 'minutes', minutes: 5 }])).resultats[0].statut, 'duplicate');
  assert.equal((await etatOf(a)).etat.minutesParJour[today], minutes, 'pas de double application');
  assert.equal((await PrepAction.findOne({ identite, cle: 'k-applied' })).statut, 'applique', 'journal finalisé');
});

test('acquittement partiel : refus définitifs isolés, les autres actions appliquées', { skip }, async () => {
  const a = await device('lot5-partial');
  const out = await sync(a, [
    { cle: 'p-1', type: 'minutes', minutes: 1 },
    { cle: 'p-2', type: 'lecon', lecon: 'LECON-INEXISTANTE', position: 0.4 },
    { cle: 'p-3', type: 'inconnu' },
    { cle: 'p-4', type: 'lecon', lecon: LESSON, position: 0.4 },
  ]);
  assert.deepEqual(out.resultats.map((r) => r.statut), ['applied', 'rejected', 'rejected', 'applied']);
  assert.equal(out.resultats[1].erreur, 'LECON');
  // Un refus définitif est journalisé : rejoué, il reste refusé sans nouveau calcul.
  assert.equal((await sync(a, [{ cle: 'p-2', type: 'lecon', lecon: 'LECON-INEXISTANTE', position: 0.4 }])).resultats[0].statut, 'duplicate');
});

test('lecture vers le haut : la dernière position est conservée, le plus loin atteint et « terminée » restent acquis', { skip }, async () => {
  const a = await device('lot5-scroll');
  await sync(a, [{ cle: 's-1', type: 'lecon', lecon: LESSON, position: 0.8, terminee: true }]);
  await sync(a, [{ cle: 's-2', type: 'lecon', lecon: LESSON, position: 0.3, terminee: false }]);
  const lecon = (await etatOf(a)).etat.lecons[LESSON];
  assert.equal(lecon.position, 0.8);
  assert.equal(lecon.derniere, 0.3);
  assert.equal(lecon.terminee, true);
  // Ouvrir sans action « terminer » ne termine pas une autre leçon.
  const other = pack.modules[MOD].lecons[1].code;
  await sync(a, [{ cle: 's-3', type: 'lecon', lecon: other, position: 0, terminee: false }]);
  assert.equal((await etatOf(a)).etat.lecons[other].terminee, false);
});

test('reprise entre appareils : le second appareil récupère le parcours, les conflits ne s’écrasent pas', { skip }, async () => {
  const phone = await device('lot5-reprise');
  const reprise = (appareil, seq, vu, lecon, position) => ({ cle: `r-${appareil}-${seq}-${vu}`, type: 'reprise', appareil, seq, vu, cible: { type: 'lecon', module: MOD, lecon, position } });
  const r1 = await sync(phone, [reprise('tel', 1, 0, LESSON, 0.4)]);
  assert.equal(r1.resultats[0].statut, 'applied');
  assert.equal(r1.resultats[0].reprise.version, 1);

  // Second client (même identité) : lecture seule, sans action locale, et sans toucher l'activité.
  const doc = await PrepProgression.findOne({ 'etat.derniereReprise.appareil': 'tel' });
  const activite = doc.derniereActivite.getTime();
  const read = (await call('GET', '/prep/progressions', undefined, phone)).body.data;
  assert.equal(read.progressions[PROG.code].etat.derniereReprise.lecon, LESSON);
  assert.equal(read.progressions[PROG.code].etat.derniereReprise.position, 0.4);
  assert.equal((await PrepProgression.findById(doc._id)).derniereActivite.getTime(), activite);
  assert.equal((await call('GET', '/prep/progressions')).status, 401, 'aucune donnée sans identité');

  // L'ordinateur, resté sur un état ancien (vu = 0), ne peut pas écraser la reprise plus récente.
  const conflict = await sync(phone, [reprise('web', 1, 0, pack.modules[MOD].lecons[2].code, 0.1)]);
  assert.equal(conflict.resultats[0].statut, 'conflict');
  assert.equal(conflict.resultats[0].reprise.appareil, 'tel');
  // Après réconciliation (il a vu la version 1), son choix explicite est accepté.
  const chosen = await sync(phone, [reprise('web', 2, 1, pack.modules[MOD].lecons[2].code, 0.1)]);
  assert.equal(chosen.resultats[0].statut, 'applied');
  // Une séquence plus ancienne du téléphone (file hors ligne en retard) ne remplace rien.
  const late = await sync(phone, [reprise('tel', 1, 2, LESSON, 0.9)]);
  assert.equal(late.resultats[0].statut, 'conflict');
  assert.equal((await etatOf(phone)).etat.derniereReprise.appareil, 'web');
});

test('droits expirés pendant le hors-ligne : refus définitif explicite, rien n’est appliqué', { skip }, async () => {
  const a = await device('lot5-expire');
  const out = await sync(a, [{ cle: 'e-0', type: 'minutes', minutes: 1 }]);
  assert.equal(out.resultats[0].statut, 'applied');
  const identite = { _id: (await PrepProgression.findOne({ appliquees: 'e-0' })).identite };
  const jours = Array.from({ length: 10 }, (_, i) => core.addDays(today, -20 - i)).sort();
  await PrepIdentite.updateOne({ _id: identite._id }, { $set: { 'essai.jours': jours } });
  const refused = await sync(a, [{ cle: 'e-1', type: 'lecon', lecon: LESSON, position: 0.5 }]);
  assert.equal(refused.resultats[0].statut, 'rejected');
  assert.equal(refused.resultats[0].erreur, 'ESSAI_EPUISE');
  assert.equal(refused.droits.accesPreparation, false);
});

test('migration locale du lot 5 : additive, idempotente, refuse une base distante', { skip }, async () => {
  const migration = require('../scripts/migrations/lot5');
  const ancienne = await PrepProgression.collection.insertOne({ identite: new mongoose.Types.ObjectId(), programme: PROG.code, etat: { ...core.emptyProgress(), lecons: { [LESSON]: { position: 0.6, terminee: false } } } });
  const blanc = await migration.migrate();
  assert.equal(blanc.dryRun, true);
  assert.ok(blanc.progressionsSansRevision >= 1);
  assert.equal((await PrepProgression.collection.findOne({ _id: ancienne.insertedId })).revision, undefined, 'à blanc : rien écrit');
  await migration.migrate({ apply: true });
  const migree = await PrepProgression.collection.findOne({ _id: ancienne.insertedId });
  assert.equal(migree.etat.lecons[LESSON].derniere, 0.6);
  assert.equal(migree.etat.lecons[LESSON].position, 0.6);
  assert.deepEqual(migree.appliquees, []);
  const again = await migration.migrate({ apply: true });
  assert.equal(again.progressionsSansRevision, 0);
  assert.equal(again.leconsSansDernierePosition, 0);
  assert.throws(() => assertLocalUri('mongodb+srv://cluster.example.net/fatafalta'));
});
