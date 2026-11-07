const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../services/prep/shared/prepCore');
const { qcm, vf, glisser, entourer, ordre, relier, classer, numerique, surligner, mc } = require('../data/prep/dsl');

const common = { niveau: 1, consigne: 'c', explication: 'e', miniCours: mc('t', 'corps') };

test('QCM simple : juste, faux, et détail par option', () => {
  const ex = qcm({ ...common, code: 'Q', options: ['a', 'b', 'c'], bonne: 1 });
  assert.equal(core.validate(ex, { ids: ['o2'] }).correct, true);
  const faux = core.validate(ex, { ids: ['o1'] });
  assert.equal(faux.correct, false);
  assert.equal(faux.detail.o1, 'faux');
  assert.equal(faux.detail.o2, 'oublie');
});

test('QCM multiple : score partiel avec pénalité', () => {
  const ex = qcm({ ...common, code: 'Q', options: ['a', 'b', 'c', 'd'], bonne: [0, 1], multiple: true });
  assert.equal(core.validate(ex, { ids: ['o1'] }).score, 0.5);
  assert.equal(core.validate(ex, { ids: ['o1', 'o3'] }).score, 0);
  assert.equal(core.validate(ex, { ids: ['o1', 'o2'] }).correct, true);
});

test('Vrai/Faux : score proportionnel', () => {
  const ex = vf({ ...common, code: 'V', affirmations: [['x', true], ['y', false]] });
  const r = core.validate(ex, { valeurs: { a1: true, a2: true } });
  assert.equal(r.score, 0.5);
  assert.equal(core.isComplete(ex, { valeurs: { a1: true } }), false);
});

test('Glisser : trous, distracteurs et étiquettes de même texte interchangeables', () => {
  const ex = glisser({ ...common, code: 'G', texte: '{{x}} et {{y}}', distracteurs: ['z'] });
  assert.deepEqual(ex.contenu.segments, [{ trou: 't1' }, ' et ', { trou: 't2' }]);
  assert.equal(core.validate(ex, { trous: { t1: 'e1', t2: 'e2' } }).correct, true);
  assert.equal(core.validate(ex, { trous: { t1: 'e3', t2: 'e2' } }).score, 0.5);
  const doublon = glisser({ ...common, code: 'G2', texte: '{{0}} puis {{0}}', distracteurs: ['1'] });
  assert.equal(core.validate(doublon, { trous: { t1: 'e2', t2: 'e1' } }).correct, true);
});

test('Entourer, Surligner : bonnes sélections, fautes, oublis, tolérance', () => {
  const ex = entourer({ ...common, code: 'E', elements: [['a', true], ['b', true], ['c', false]] });
  assert.equal(core.validate(ex, { ids: ['x1', 'x3'] }).score, 0);
  assert.equal(core.validate(ex, { ids: ['x1'] }).detail.x2, 'oublie');
  const s = surligner({ ...common, code: 'S', segments: [['a', true], ['b', 'tolere'], ['c', false]] });
  assert.equal(core.validate(s, { ids: ['s1', 's2'] }).correct, true);
  assert.equal(core.validate(s, { ids: ['s1', 's3'] }).correct, false);
});

test('Ordre : partiel ou exact', () => {
  const ex = ordre({ ...common, code: 'O', elements: ['1', '2', '3', '4'] });
  assert.equal(core.validate(ex, { ordre: ['r1', 'r2', 'r4', 'r3'] }).score, 0.5);
  const exact = ordre({ ...common, code: 'O2', elements: ['1', '2'], mode: 'exact' });
  assert.equal(core.validate(exact, { ordre: ['r2', 'r1'] }).score, 0);
});

test('Relier et Classer', () => {
  const r = relier({ ...common, code: 'R', paires: [['a', '1'], ['b', '2']], intrus: ['3'] });
  assert.equal(core.validate(r, { paires: { g1: 'd1', g2: 'd3' } }).score, 0.5);
  const c = classer({ ...common, code: 'C', categories: ['A', 'B'], cartes: [['x', 0], ['y', 1]] });
  assert.equal(core.validate(c, { cartes: { c1: 'k1', c2: 'k1' } }).score, 0.5);
});

test('Numérique : virgule française, tolérance absolue et relative', () => {
  const ex = numerique({ ...common, code: 'N', valeur: 1.0986, tolerance: { type: 'abs', valeur: 0.006 } });
  assert.equal(core.validate(ex, { valeur: '1,10' }).correct, true);
  assert.equal(core.validate(ex, { valeur: '1,2' }).correct, false);
  assert.equal(core.validate(ex, { valeur: 'abc' }).correct, false);
  const pct = numerique({ ...common, code: 'N2', valeur: 200, tolerance: { type: 'pct', valeur: 5 } });
  assert.equal(core.validate(pct, { valeur: '209' }).correct, true);
});

test('Clé jamais exposée par publicExercise', () => {
  const ex = qcm({ ...common, code: 'Q', options: ['a', 'b'], bonne: 0, raisonnement: { reference: 'r', etapes: ['e'] } });
  const pub = core.publicExercise(ex);
  assert.equal(pub.cle, undefined);
  assert.equal(pub.explication, undefined);
  assert.deepEqual(pub.raisonnement, { actif: true });
});

test('Barème § 10.2 : seconde chance 50 %, indice −20 %', () => {
  assert.equal(core.pointsTentative({ score: 1, essai: 1, indices: 0 }), 1);
  assert.equal(core.pointsTentative({ score: 1, essai: 2, indices: 0 }), 0.5);
  assert.equal(core.pointsTentative({ score: 1, essai: 1, indices: 1 }), 0.8);
  assert.equal(core.pointsTentative({ score: 1, essai: 2, indices: 1 }), 0.4);
});

test('Mélange déterministe : stable pour une graine, différent pour une autre', () => {
  const list = Array.from({ length: 10 }, (_, i) => i);
  assert.deepEqual(core.seededShuffle(list, 'a'), core.seededShuffle(list, 'a'));
  assert.notDeepEqual(core.seededShuffle(list, 'a'), core.seededShuffle(list, 'b'));
});

test('Révision espacée J+1, J+3, J+7, J+14 puis maîtrise ; échec → J+1', () => {
  let card = core.newReviewCard({ exercice: 'X' }, '2026-11-05');
  assert.equal(card.echeance, '2026-11-06');
  card = core.reviewCard(card, true, '2026-11-06');
  assert.equal(card.echeance, '2026-11-09');
  card = core.reviewCard(card, true, '2026-11-09');
  assert.equal(card.echeance, '2026-11-16');
  card = core.reviewCard(card, true, '2026-11-16');
  assert.equal(card.echeance, '2026-11-30');
  card = core.reviewCard(card, true, '2026-11-30');
  assert.equal(card.maitrisee, true);
  const rate = core.reviewCard({ ...card, maitrisee: false, palier: 2 }, false, '2026-12-01');
  assert.equal(rate.echeance, '2026-12-02');
});

test('Cahier d’erreurs : sortie après 2 réussites espacées d’au moins un jour', () => {
  let e = core.errorNotebookStep({ rates: 1 }, true, '2026-11-05');
  e = core.errorNotebookStep(e, true, '2026-11-05');
  assert.equal(e.sortie, false, 'deux réussites le même jour ne suffisent pas');
  e = core.errorNotebookStep(e, true, '2026-11-06');
  assert.equal(e.sortie, true);
});

test('Essai : 7 jours d’interaction distincts, absence non décomptée, dernier jour terminé', () => {
  let jours = [];
  jours = core.consumeTrialDay(jours, '2026-11-01');
  jours = core.consumeTrialDay(jours, '2026-11-01');
  assert.equal(jours.length, 1);
  ['2026-11-02', '2026-11-03', '2026-12-20', '2026-12-21', '2026-12-22', '2026-12-23'].forEach((d) => { jours = core.consumeTrialDay(jours, d); });
  assert.equal(jours.length, 7);
  assert.equal(core.trialState(jours, 0, '2026-12-23').actif, true, 'le 7ᵉ jour reste utilisable');
  assert.equal(core.trialState(jours, 0, '2026-12-24').actif, false);
  assert.equal(core.consumeTrialDay(jours, '2026-12-24').length, 7);
  assert.equal(core.trialState(jours, 2, '2026-12-24').iaRestantes, 1);
});

test('Score de classement : le volume au hasard ne fait pas monter', () => {
  const prudent = core.rankingScore({ premierCoupParNiveau: { 1: [45, 50], 2: [40, 50] }, modulesValides: 2, modulesTotal: 10, joursActifs30: 10 });
  const auHasard = core.rankingScore({ premierCoupParNiveau: { 1: [300, 1200], 2: [0, 0] }, modulesValides: 2, modulesTotal: 10, joursActifs30: 10 });
  assert.ok(prudent > auHasard);
  assert.ok(prudent <= 100);
});

test('Statut de module : validé quand toutes les leçons sont lues et N2 ≥ 70 %', () => {
  const mod = { code: 'M', lecons: [{ code: 'L1' }, { code: 'L2' }] };
  const prog = { lecons: { L1: { terminee: true }, L2: { terminee: true } }, scores: { M: { 2: 0.7 } } };
  const st = core.moduleStatus(mod, prog);
  assert.equal(st.valide, true);
  assert.equal(st.niveau3Debloque, true);
  assert.equal(core.moduleStatus(mod, { lecons: {}, scores: {} }).statut, 'nonCommence');
});

test('Pseudonyme automatique stable', () => {
  assert.equal(core.pseudonymFromSeed('abc'), core.pseudonymFromSeed('abc'));
  assert.match(core.pseudonymFromSeed('abc'), /^[\p{L}-]+-\d{4}$/u);
});

test('Réducteurs : seconde chance ratée → cahier d’erreurs et révision J+1, puis sortie après révisions', () => {
  let s = core.emptyProgress();
  const base = { exercice: 'X', module: 'M', niveau: 2, notion: 'N', contexte: 'niveau', jour: '2026-11-05' };
  s = core.applyAttempt(s, { ...base, essai: 1, correct: false });
  assert.equal(Object.keys(s.erreurs).length, 0, 'pas encore au cahier : seconde chance en attente');
  s = core.applyAttempt(s, { ...base, essai: 2, correct: false });
  assert.ok(s.erreurs.X);
  assert.equal(s.revisions.X.echeance, '2026-11-06');
  assert.deepEqual(s.premierCoup[2], [0, 1]);
  assert.equal(core.dueReviews(s, '2026-11-06').codes[0], 'X');
  s = core.applyAttempt(s, { ...base, contexte: 'revision', essai: 1, correct: true, jour: '2026-11-06' });
  s = core.applyAttempt(s, { ...base, contexte: 'revision', essai: 1, correct: true, jour: '2026-11-09' });
  assert.equal(s.erreurs.X, undefined);
  assert.equal(s.compteurs.erreursCorrigees, 1);
});

test('Réducteurs : série de jours et objectif quotidien', () => {
  let s = core.emptyProgress(10);
  s = core.applyMinutes(s, '2026-11-05', 6);
  assert.equal(s.serie.actuelle, 0);
  s = core.applyMinutes(s, '2026-11-05', 5);
  s = core.applyMinutes(s, '2026-11-06', 10);
  assert.equal(s.serie.actuelle, 2);
  assert.equal(core.currentStreak(s, '2026-11-07'), 2);
  assert.equal(core.currentStreak(s, '2026-11-12'), 0);
});

test('Réducteurs : session de niveau, meilleur score retenu et module validé', () => {
  const mod = { code: 'M', lecons: [{ code: 'L1' }] };
  let s = core.applyLesson(core.emptyProgress(), 'L1', 1, true, '2026-11-05');
  s = core.applySessionResult(s, mod, 2, 0.8);
  s = core.applySessionResult(s, mod, 2, 0.4);
  assert.equal(s.scores.M[2], 0.8);
  assert.deepEqual(s.modulesValides, ['M']);
});
