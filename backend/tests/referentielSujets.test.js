const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const lib = require('../scripts/referentiel/lib');
const { verifyBatch, exitCodeFor } = require('../scripts/referentiel/verify');
const { mergeWithPrevious, buildDuplicateIndex, toCsv } = require('../scripts/referentiel/sync');
const { recordFingerprint } = require('../scripts/referentiel/record');

const ORG = { id: 'a00000000000000000000001', nom: 'inphb', alias: ['INP-HB', 'INPHB'], source: 'catalogue_dynamique' };
const ENSEA = { id: 'a00000000000000000000002', nom: 'ENSEA', alias: ['ensea'], source: 'catalogue_dynamique' };

const entry = (id, overrides = {}) => ({
  id,
  modele: 'catalogue_dynamique',
  type: 'sujet',
  statut: 'approved',
  titre: 'Titre',
  description: '',
  organisme: ORG,
  parcoursType: { id: 'p1', nom: 'CAE' },
  annee: { valeur: '2024', source: 'catalogue' },
  session: null,
  matiere: { id: 'm1', nom: 'Mathématiques 1' },
  fichier: { nomStocke: `${id}.pdf`, cleStockage: `documents/u/${id}.pdf`, nomOrigine: `${id}.pdf`, tailleOctets: 100000 + Number.parseInt(id.slice(-4), 16), extension: '.pdf' },
  corrige: { inclusDansPdf: false, corrigesSeparesIds: [] },
  sujetParentId: null,
  anomalies: [],
  presentSurServeur: true,
  ...overrides,
});

const SUBJECT_ID = 'b00000000000000000000001';
const SUBJECT_WITH_CORRECTION = 'b00000000000000000000002';
const SUBJECT_ECO_ID = 'b00000000000000000000003';
const LEGACY_ID = 'b00000000000000000000004';
const KNOWN_HASH = 'a'.repeat(64);

const makeReferentiel = () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'referentiel-'));
  const ressources = [
    entry(SUBJECT_ID, { titre: 'Mathématiques — Concours INP-HB 2024', fichier: { nomStocke: 's1.pdf', cleStockage: 'documents/u/s1.pdf', nomOrigine: 'maths_inphb_2024.pdf', tailleOctets: 543210, extension: '.pdf' } }),
    entry(SUBJECT_WITH_CORRECTION, { titre: 'INP-HB 2024 – Concours CAE : Physique 1', matiere: { id: 'm2', nom: 'Physique 1' }, corrige: { inclusDansPdf: false, corrigesSeparesIds: ['c00000000000000000000001'] } }),
    entry('c00000000000000000000001', { type: 'corrige', titre: null, titreHerite: 'Corrigé — INP-HB 2024 – Concours CAE : Physique 1', matiere: { id: 'm2', nom: 'Physique 1' }, corrige: null, sujetParentId: SUBJECT_WITH_CORRECTION }),
    entry(SUBJECT_ECO_ID, { titre: 'ENSEA 2024 – ISE Option Économie : Ordre général', organisme: ENSEA, parcoursType: { id: 'p2', nom: 'ISE Option Économie' }, matiere: { id: 'm3', nom: 'Ordre général' } }),
    entry(LEGACY_ID, { modele: 'legacy', titre: "Examen d'Algèbre 4B avec Proposition de Correction Détaillée - Année académique 2022-2023", organisme: { id: 'u1', nom: 'Université Alassane Ouattara (Bouaké)', alias: ['UAO'], source: 'legacy_universite' }, parcoursType: null, matiere: null, annee: { valeur: '2022-2023', source: 'deduite_titre' } }),
  ];
  const write = (name, value) => fs.writeFileSync(path.join(dir, name), JSON.stringify(value));
  write('inventaire-complet.json', { genereLe: new Date().toISOString(), ressources });
  write('organismes.json', { organismes: [ORG, ENSEA, ressources[4].organisme] });
  write('taxonomie.json', {
    catalogueDynamique: {
      organismes: [{
        id: ORG.id, nom: ORG.nom,
        matieres: [{ nom: 'Mathématiques 1' }, { nom: 'Physique 1' }, { nom: 'Mathématiques 2' }],
        parcoursTypes: [{ nom: 'CAE' }],
        noeuds: [{ nom: '2024' }, { nom: '2025' }],
      }],
    },
  });
  write('empreintes-fichiers.json', { empreintes: [{ id: SUBJECT_ID, sha256: KNOWN_HASH }] });
  write('index-doublons.json', { decisionsManuelles: [] });
  return dir;
};

const verifyOne = (dir, item) => verifyBatch([item], { dir, baseDir: dir }).resultats[0];

test('normalisation : variantes de titre et jetons discriminants', () => {
  assert.equal(lib.similarity('Mathématiques — Concours INP-HB 2024', 'Sujet de mathématiques du concours INP-HB, session 2024'), 1);
  assert.equal(lib.numericConflict('Mathématiques 1 INP-HB 2025', 'Mathématiques 2 INP-HB 2025'), true);
  assert.equal(lib.numericConflict("Devoir d'Analyse 3-A 2022", "Devoir d'Analyse 3-B 2022"), true);
  assert.equal(lib.numericConflict('Bac Série C 2024', 'Bac Série D 2024'), true);
  assert.equal(lib.extractYear('Année académique 2022/2023'), '2022-2023');
  assert.equal(lib.compareYears('2023', '2022-2023'), 'compatible');
});

test('fichier déjà enregistré (même empreinte) : doublon confirmé', () => {
  const dir = makeReferentiel();
  const result = verifyOne(dir, { titre: 'Mathématiques INP-HB 2024', organisme: 'INP-HB', annee: '2024', matiere: 'Mathématiques 1', sha256: KNOWN_HASH });
  assert.equal(result.statut, 'doublon_confirme');
  assert.equal(result.correspondances[0].existant.id, SUBJECT_ID);
});

test('même fichier sous un titre différent : confirmé par empreinte, probable par taille seule', () => {
  const dir = makeReferentiel();
  const pdf = path.join(dir, 'copie.pdf');
  fs.writeFileSync(pdf, 'contenu');
  recordFingerprint({ id: SUBJECT_ECO_ID, filePath: pdf, dir });
  const byHash = verifyOne(dir, { titre: 'Épreuve totalement renommée', fichier: 'copie.pdf' });
  assert.equal(byHash.statut, 'doublon_confirme');
  assert.equal(byHash.correspondances[0].existant.id, SUBJECT_ECO_ID);

  const bySize = verifyOne(dir, { titre: 'Autre intitulé', organisme: 'INP-HB', tailleOctets: 543210 });
  assert.equal(bySize.statut, 'doublon_probable');
  assert.match(bySize.correspondances[0].raisons.join(' '), /taille identique/);
});

test('variante de titre pour la même épreuve : doublon probable, jamais confirmé', () => {
  const dir = makeReferentiel();
  const result = verifyOne(dir, { titre: 'Sujet de mathématiques du concours INP-HB, session 2024', organisme: 'INPHB', parcoursType: 'CAE', annee: '2024', matiere: 'Mathématiques 1' });
  assert.equal(result.statut, 'doublon_probable');
  assert.equal(result.correspondances[0].existant.id, SUBJECT_ID);
});

test('même titre pour deux épreuves différentes : nouvelle ressource', () => {
  const dir = makeReferentiel();
  const otherYear = verifyOne(dir, { titre: 'Mathématiques — Concours INP-HB 2025', organisme: 'INP-HB', annee: '2025', matiere: 'Mathématiques 1' });
  assert.equal(otherYear.statut, 'nouvelle_ressource');
  const otherOption = verifyOne(dir, { titre: 'ENSEA 2024 – ISE Option Mathématiques : Ordre général', organisme: 'ENSEA', parcoursType: 'ISE Option Mathématiques', annee: '2024', matiere: 'Ordre général' });
  assert.equal(otherOption.statut, 'nouvelle_ressource');
  const otherNumber = verifyOne(dir, { titre: 'Mathématiques 2 — Concours INP-HB 2024', organisme: 'INP-HB', annee: '2024', matiere: 'Mathématiques 2' });
  assert.equal(otherNumber.statut, 'nouvelle_ressource');
});

test('un sujet et son corrigé ne sont pas des doublons ; un second corrigé est signalé', () => {
  const dir = makeReferentiel();
  const correctionOfFresh = verifyOne(dir, { type: 'corrige', sujetParentId: SUBJECT_ID });
  assert.equal(correctionOfFresh.statut, 'nouvelle_ressource');
  assert.equal(correctionOfFresh.contexte.annee, '2024'); // contexte hérité du sujet parent

  const secondCorrection = verifyOne(dir, { type: 'corrige', sujetParentId: SUBJECT_WITH_CORRECTION });
  assert.equal(secondCorrection.statut, 'a_verifier');
  const reasons = secondCorrection.correspondances.flatMap((match) => match.raisons).join(' ');
  assert.match(reasons, /déjà un corrigé/);
  assert.match(reasons, /corrigé du même sujet parent/);
});

test('nouvelle ressource sans correspondance', () => {
  const dir = makeReferentiel();
  const result = verifyOne(dir, { titre: 'ESATIC 2023 – Concours Bacheliers : Anglais', organisme: 'ESATIC', annee: '2023', matiere: 'Anglais' });
  assert.equal(result.statut, 'nouvelle_ressource');
  assert.match(result.avertissements.join(' '), /ESATIC.*inconnu/);
});

test('métadonnées absentes : incertitude explicite, pas de doublon certain', () => {
  const dir = makeReferentiel();
  const result = verifyOne(dir, { titre: "Examen d'Algèbre 4B avec correction 2022-2023" });
  assert.equal(result.statut, 'a_verifier');
  assert.match(result.avertissements.join(' '), /métadonnées absentes : organisme, matiere/);
  const sameExam = verifyOne(dir, { titre: "Examen d'Algèbre 4B avec Proposition de Correction Détaillée - Année académique 2022-2023", organisme: 'UAO' });
  assert.equal(sameExam.statut, 'doublon_probable');
});

test('doublons internes au lot et codes de sortie', () => {
  const dir = makeReferentiel();
  const report = verifyBatch([
    { ref: 'x', titre: 'ESATIC 2022 – Mathématiques', organisme: 'ESATIC', annee: '2022', matiere: 'Mathématiques', tailleOctets: 4242 },
    { ref: 'y', titre: 'ESATIC 2022 : épreuve de Mathématiques', organisme: 'ESATIC', annee: '2022', matiere: 'Mathématiques', tailleOctets: 4242 },
  ], { dir, baseDir: dir });
  assert.equal(report.resultats[0].statut, 'doublon_probable');
  assert.equal(report.resultats[0].correspondances[0].existant.dansLeLot, true);
  assert.equal(exitCodeFor(report), 1);
  assert.equal(exitCodeFor(verifyBatch([{ titre: 'ERNAM 2023 Physique', organisme: 'ERNAM', annee: '2023', matiere: 'Physique' }], { dir })), 0);
});

test('synchronisation : rien n\'est supprimé, les décisions manuelles sont conservées', () => {
  const previous = { ressources: [entry(SUBJECT_ID, { titre: 'Ancien titre' }), entry(SUBJECT_ECO_ID)] };
  const { merged, events } = mergeWithPrevious([entry(SUBJECT_ID, { titre: 'Nouveau titre' }), entry('b0000000000000000000000f')], previous, '2026-10-10T00:00:00Z');
  assert.equal(merged.length, 3);
  assert.equal(merged.find((item) => item.id === SUBJECT_ECO_ID).presentSurServeur, false);
  assert.deepEqual(events.map((event) => event.action).sort(), ['ajout', 'disparition', 'modification']);

  const twins = [entry('b000000000000000000000a1', { titre: 'INP-HB 2024 Maths 1' }), entry('b000000000000000000000a2', { titre: 'INP-HB 2024 : Mathématiques 1' })];
  assert.equal(buildDuplicateIndex(twins, null, null, 'now').correspondances[0].statut, 'doublon_probable');
  const decisions = { decisionsManuelles: [{ ids: ['b000000000000000000000a2', 'b000000000000000000000a1'], statut: 'distinct' }] };
  const index = buildDuplicateIndex(twins, decisions, null, 'now');
  assert.equal(index.correspondances.length, 0);
  assert.equal(index.decisionsManuelles.length, 1);
});

test('CSV : une ligne par ressource, guillemets échappés', () => {
  const csv = toCsv([entry(SUBJECT_ID, { titre: 'Titre, avec "guillemets"' }), entry(SUBJECT_ECO_ID)]);
  const lines = csv.trim().split('\n');
  assert.equal(lines.length, 3);
  assert.match(lines[1], /"Titre, avec ""guillemets"""/);
});
