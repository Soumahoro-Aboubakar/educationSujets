#!/usr/bin/env node
/**
 * Construit le pack de contenu de la préparation et le copie dans l'application mobile.
 *
 *   npm run prep:pack            contrôle + écriture
 *   npm run prep:pack -- --check contrôle seulement (code de sortie 1 si erreur)
 *
 * Étapes (cahier des charges § 26.2, étape 3 « contrôles automatiques ») :
 *  1. charge la bibliothèque de modules et les programmes pilotes ;
 *  2. valide chaque exercice (schéma, clés, mini-cours ≤ 150 mots, raisonnement) ;
 *  3. vérifie que chaque bonne réponse est bien acceptée par le validateur partagé ;
 *  4. écrit backend/data/prep/build/pack.json (source du seed MongoDB) ;
 *  5. copie le pack et prepCore.js dans fatafalta/src/prep/ (mode hors ligne, § 22).
 */
const fs = require('fs');
const path = require('path');
const core = require('../../services/prep/shared/prepCore');

const ROOT = path.resolve(__dirname, '../..');
const DATA = path.join(ROOT, 'data/prep');
const MOBILE = path.resolve(ROOT, '../fatafalta/src/prep');
const checkOnly = process.argv.includes('--check');

const bibliotheque = fs.readdirSync(path.join(DATA, 'bibliotheque'))
  .filter((file) => file.endsWith('.js'))
  .flatMap((file) => require(path.join(DATA, 'bibliotheque', file)));
const programmes = require(path.join(DATA, 'programmes'));

const errors = [];
const warn = [];
const fail = (where, message) => errors.push(`${where} : ${message}`);

/** Réponse « parfaite » construite depuis la clé, pour vérifier que le validateur l'accepte. */
const perfectAnswer = (ex) => {
  const k = ex.cle;
  switch (ex.type) {
    case 'qcm': case 'entourer': case 'surligner': return { ids: k.ids };
    case 'vraiFaux': return { valeurs: k.valeurs };
    case 'glisser': return { trous: Object.fromEntries(Object.entries(k.trous).map(([t, ids]) => [t, ids[0]])) };
    case 'ordre': return { ordre: k.ordre };
    case 'relier': return { paires: k.paires };
    case 'classer': return { cartes: k.cartes };
    case 'numerique': return { valeur: k.valeur };
    default: return {};
  }
};

const checkPerfect = (ex, where) => {
  const result = core.validate(ex, perfectAnswer(ex));
  if (!result.correct || result.score !== 1) fail(where, 'la bonne réponse n’est pas acceptée par le validateur');
  if (!core.isComplete(ex, perfectAnswer(ex))) fail(where, 'la bonne réponse n’active pas « Vérifier »');
};

// ── Cours de langue étrangère : deux versions obligatoires ───────────────
// Matières de langue étrangère : le cours est expliqué en français par défaut et doit aussi
// exister entièrement dans la langue étudiée (module.versionCible).
const MATIERES_LANGUE = { Anglais: 'en', Espagnol: 'es', Allemand: 'de', Arabe: 'ar', Portugais: 'pt', Italien: 'it', Chinois: 'zh', Russe: 'ru' };
const CHAMPS_EXERCICE = new Set([...core.TRADUISIBLES.exercice, ...core.TRADUISIBLES.contenu]);

const checkMiniQuestions = (blocs, where) => {
  (blocs || []).forEach((bloc) => {
    if (bloc.type !== 'miniQuestion') return;
    const ex = bloc.exercice;
    if (seenCodes.has(ex.code)) fail(ex.code, 'code de mini-question en double');
    seenCodes.add(ex.code);
    core.checkExercise({ ...ex, miniCours: ex.miniCours || { corps: 'non noté' } }).forEach((e) => fail(`${where} ${ex.code}`, e));
    checkPerfect(ex, ex.code);
  });
};

const checkVersionCible = (mod) => {
  const attendue = MATIERES_LANGUE[mod.matiere];
  if (attendue && mod.langueCible !== attendue) fail(mod.code, `cours de langue (${mod.matiere}) : déclarer langueCible « ${attendue} » et sa version cible`);
  if (!mod.langueCible) {
    if (mod.versionCible) fail(mod.code, 'versionCible sans langueCible');
    return;
  }
  const v = mod.versionCible;
  if (!/^[a-z]{2}$/.test(mod.langueCible) || mod.langueCible === core.VERSION_PAR_DEFAUT) fail(mod.code, `langueCible invalide : ${mod.langueCible}`);
  if (!v) { fail(mod.code, 'cours de langue : versionCible manquante (deux versions obligatoires)'); return; }
  if (v.langue !== mod.langueCible) fail(mod.code, 'versionCible.langue doit être égale à langueCible');
  if (!v.titre || !v.resume) fail(mod.code, 'versionCible : titre et résumé obligatoires');
  // Notions : toutes traduites, aucune inconnue.
  const notionCodes = mod.notions.map((n) => n.code);
  notionCodes.forEach((c) => { if (!v.notions?.[c]) fail(mod.code, `versionCible : notion ${c} non traduite`); });
  Object.keys(v.notions || {}).forEach((c) => { if (!notionCodes.includes(c)) fail(mod.code, `versionCible : notion inconnue ${c}`); });
  // Leçons : mêmes codes, chacune complète.
  const leconCodes = mod.lecons.map((l) => l.code);
  leconCodes.forEach((c) => {
    const l = v.lecons?.[c];
    if (!l) { fail(mod.code, `versionCible : leçon ${c} manquante`); return; }
    if (!l.titre || !(l.duree > 0) || !Array.isArray(l.blocs) || !l.blocs.length) fail(c, 'versionCible : titre, durée et blocs obligatoires');
    checkMiniQuestions(l.blocs, `${c} (${v.langue})`);
  });
  Object.keys(v.lecons || {}).forEach((c) => { if (!leconCodes.includes(c)) fail(mod.code, `versionCible : leçon inconnue ${c}`); });
  // Exercices : tous traduits ; seuls les textes pédagogiques peuvent changer.
  mod.exercices.forEach((ex) => {
    const trad = v.exercices?.[ex.code];
    if (!trad) { fail(ex.code, `versionCible : exercice non traduit (${v.langue})`); return; }
    Object.keys(trad).forEach((k) => { if (!CHAMPS_EXERCICE.has(k)) fail(ex.code, `versionCible : champ non traduisible « ${k} »`); });
    if (Array.isArray(trad.categories) && trad.categories.length !== (ex.contenu.categories || []).length) fail(ex.code, 'versionCible : catégories incomplètes');
    if (Array.isArray(trad.affirmations) && trad.affirmations.length !== (ex.contenu.affirmations || []).length) fail(ex.code, 'versionCible : affirmations incomplètes');
    const traduit = core.exerciseVersion(ex, trad);
    core.checkExercise(traduit).forEach((e) => fail(`${ex.code} (${v.langue})`, e));
    checkPerfect(traduit, `${ex.code} (${v.langue})`);
  });
  Object.keys(v.exercices || {}).forEach((c) => { if (!mod.exercices.some((ex) => ex.code === c)) fail(mod.code, `versionCible : exercice inconnu ${c}`); });
};

// ── Bibliothèque ─────────────────────────────────────────────────────────
const modules = {};
const seenCodes = new Set();
bibliotheque.forEach((mod) => {
  if (modules[mod.code]) fail(mod.code, 'module en double');
  const notionCodes = mod.notions.map((n) => n.code);
  mod.lecons.forEach((lecon) => {
    if (seenCodes.has(lecon.code)) fail(lecon.code, 'code de leçon en double');
    seenCodes.add(lecon.code);
    lecon.blocs.forEach((bloc) => {
      if (bloc.type !== 'miniQuestion') return;
      const ex = bloc.exercice;
      // Mini-question : non notée, sans mini-cours (§ 9.2).
      const errs = core.checkExercise({ ...ex, miniCours: ex.miniCours || { corps: 'non noté' } });
      errs.forEach((e) => fail(ex.code, e));
      checkPerfect(ex, ex.code);
    });
  });
  const parNiveau = { 1: 0, 2: 0, 3: 0 };
  mod.exercices.forEach((ex) => {
    if (seenCodes.has(ex.code)) fail(ex.code, 'code d’exercice en double');
    seenCodes.add(ex.code);
    core.checkExercise(ex).forEach((e) => fail(ex.code, e));
    (ex.notions || []).forEach((n) => { if (!notionCodes.includes(n)) fail(ex.code, `notion inconnue ${n}`); });
    if (!ex.notions || !ex.notions.length) warn.push(`${ex.code} : aucune notion rattachée`);
    checkPerfect(ex, ex.code);
    parNiveau[ex.niveau] += 1;
  });
  [1, 2, 3].forEach((n) => { if (!parNiveau[n]) fail(mod.code, `aucun exercice de niveau ${n}`); });
  checkVersionCible(mod);
  modules[mod.code] = {
    ...mod,
    publie: true,
    duree: mod.lecons.reduce((sum, l) => sum + l.duree, 0),
    versions: core.moduleVersions(mod),
    stats: { lecons: mod.lecons.length, exercices: mod.exercices.length, parNiveau },
  };
});

// ── Programmes ───────────────────────────────────────────────────────────
const packProgrammes = programmes.map((prog) => {
  const matieres = prog.matieres.map((matiere, index) => ({
    nom: matiere.nom,
    teinte: index,
    modules: matiere.modules.map((ref) => {
      if (typeof ref === 'string') {
        if (!modules[ref]) fail(prog.code, `module inconnu ${ref}`);
        return { code: ref, publie: true };
      }
      return { code: ref.code, titre: ref.titre, notions: ref.notions.map((libelle, i) => ({ code: `N${i + 1}`, libelle })), publie: false };
    }),
  }));
  const publies = matieres.flatMap((m) => m.modules).filter((m) => m.publie).length;
  if (!publies) fail(prog.code, 'aucun module publié');
  return { ...prog, matieres, stats: { modulesPublies: publies, modulesTotal: matieres.flatMap((m) => m.modules).length } };
});

if (warn.length) console.warn(`⚠️  ${warn.length} avertissement(s)\n  ${warn.join('\n  ')}`);
if (errors.length) {
  console.error(`❌ ${errors.length} erreur(s) de contenu :\n  ${errors.join('\n  ')}`);
  process.exit(1);
}

const totalEx = Object.values(modules).reduce((s, m) => s + m.exercices.length, 0);
const totalLecons = Object.values(modules).reduce((s, m) => s + m.lecons.length, 0);
console.log(`✅ Contenu valide : ${Object.keys(modules).length} modules, ${totalLecons} leçons, ${totalEx} exercices, ${packProgrammes.length} programmes.`);
if (checkOnly) process.exit(0);

const pack = {
  version: 1,
  genereLe: new Date().toISOString(),
  provenance: {
    redaction: 'Claude (Anthropic) — modèle A',
    relecture: 'À faire par un second modèle d’une autre famille puis par le propriétaire (§ 26.2, étapes 4 à 6)',
    statut: 'brouillon-pilote',
  },
  programmes: packProgrammes,
  modules,
};

fs.mkdirSync(path.join(DATA, 'build'), { recursive: true });
fs.writeFileSync(path.join(DATA, 'build/pack.json'), `${JSON.stringify(pack, null, 1)}\n`);

fs.mkdirSync(path.join(MOBILE, 'shared'), { recursive: true });
fs.mkdirSync(path.join(MOBILE, 'content'), { recursive: true });
fs.copyFileSync(path.join(ROOT, 'services/prep/shared/prepCore.js'), path.join(MOBILE, 'shared/prepCore.js'));
fs.writeFileSync(path.join(MOBILE, 'content/pack.json'), JSON.stringify(pack));
const size = fs.statSync(path.join(MOBILE, 'content/pack.json')).size;
console.log(`📦 Pack écrit (${(size / 1024).toFixed(0)} Ko) : backend/data/prep/build/pack.json et fatafalta/src/prep/content/pack.json`);
