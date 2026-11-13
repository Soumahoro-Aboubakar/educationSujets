import { useSyncExternalStore } from 'react';
import pack from './content/pack.json';
import core from './shared/prepCore';
import {
  emptyCache, listProgrammes, resolveModule, resolveProgramme,
} from './contentRepo';

/**
 * Accès au contenu de préparation. Source : le cache des contenus publiés (téléchargé d'après
 * le manifeste, voir contentSync.js), puis le pack embarqué produit par « npm run prep:pack ».
 * Les accesseurs restent synchrones : les écrans s'abonnent aux changements avec
 * useContentGeneration() et se redessinent quand une nouvelle publication arrive.
 */
const bundle = { modules: pack.modules, programmes: pack.programmes.map((p) => p.code), empreintes: pack.empreintes?.modules || {} };
let cache = emptyCache();
let tick = 0;
const listeners = new Set();
let exercises = new Map();
let lessons = new Map();
const versioned = new Map();

const effectiveModules = () => {
  const codes = new Set([...Object.keys(pack.modules), ...Object.keys(cache.modules)]);
  return [...codes].map((code) => resolveModule(cache, bundle, code)?.module).filter(Boolean);
};
const reindex = () => {
  exercises = new Map();
  lessons = new Map();
  versioned.clear();
  effectiveModules().forEach((mod) => {
    mod.exercices.forEach((ex) => exercises.set(ex.code, { exercice: ex, module: mod }));
    mod.lecons.forEach((lecon, index) => lessons.set(lecon.code, { lecon, module: mod, index }));
  });
};
reindex();

export const bundleInfo = bundle;
export const getContentCache = () => cache;
/** Remplace le cache publié (après hydratation ou mise à jour) et prévient les écrans. */
export const setContentCache = (next) => {
  if (next === cache) return;
  cache = next;
  reindex();
  tick += 1;
  listeners.forEach((listener) => listener());
};
const subscribe = (listener) => { listeners.add(listener); return () => listeners.delete(listener); };
const snapshot = () => tick;
/** Hook : redessine l'écran à chaque changement de contenu publié. */
export const useContentGeneration = () => useSyncExternalStore(subscribe, snapshot, snapshot);

export const getProgrammes = () => listProgrammes(cache, pack.programmes);
export const getProgramme = (code) => (code ? resolveProgramme(cache, pack.programmes, code) : null);

/**
 * Cours de langue étrangère : deux versions (« fr » par défaut, explications en français ;
 * ou la langue étudiée). Les exercices et leurs clés sont communs : seule l'enveloppe change.
 * `version` est un code de langue, ou la table des préférences { [codeModule]: langue }.
 */
const versionFor = (moduleCode, version) => (typeof version === 'string' ? version : version?.[moduleCode]) || core.VERSION_PAR_DEFAUT;
export const moduleVersions = (mod) => (mod?.distant ? mod.versions || [core.VERSION_PAR_DEFAUT] : core.moduleVersions(mod));
export const getModule = (code, version) => {
  const v = versionFor(code, version);
  const resolved = resolveModule(cache, bundle, code, v);
  if (!resolved) return null;
  const mod = resolved.module;
  // Module téléchargé : chaque version est déjà appliquée par le serveur.
  if (resolved.distant) return mod;
  if (!core.moduleVersions(mod).includes(v) || v === core.VERSION_PAR_DEFAUT) return mod;
  const key = `${code}:${v}`;
  if (!versioned.has(key)) versioned.set(key, core.moduleVersion(mod, v));
  return versioned.get(key);
};
export const getExercise = (code, version) => {
  const found = exercises.get(code) || null;
  if (!found || !version) return found;
  const mod = getModule(found.module.code, version);
  return !mod || mod === found.module ? found : { exercice: mod.exercices.find((ex) => ex.code === code) || found.exercice, module: mod };
};
export const getLesson = (code, version) => {
  const found = lessons.get(code) || null;
  if (!found || !version) return found;
  const mod = getModule(found.module.code, version);
  return !mod || mod === found.module ? found : { lecon: mod.lecons[found.index], module: mod, index: found.index };
};

/** Organismes → cycles (même forme que GET /api/prep/catalogue, sans logos). */
export const localCatalogue = () => {
  const groups = new Map();
  getProgrammes().forEach((p) => {
    const key = p.organisme.sigle;
    if (!groups.has(key)) groups.set(key, { sigle: key, nom: key, logo: null, organismeId: null, cycles: [] });
    groups.get(key).cycles.push({
      programme: p.code, nom: p.titre, parcoursType: p.parcoursType, matieres: p.matieres.length,
      modulesPublies: p.stats.modulesPublies, modulesTotal: p.stats.modulesTotal, publie: p.stats.modulesPublies > 0,
    });
  });
  return [...groups.values()];
};

/** Modules d'un programme, avec matière et teinte ; les modules partagés n'apparaissent qu'une fois. */
export const programmeModules = (programme) => {
  if (!programme) return [];
  const seen = new Set();
  const list = [];
  programme.matieres.forEach((matiere) => {
    matiere.modules.forEach((ref) => {
      if (seen.has(ref.code)) return;
      seen.add(ref.code);
      const mod = ref.publie ? getModule(ref.code) : null;
      list.push({
        code: ref.code,
        titre: mod ? mod.titre : ref.titre,
        resume: mod ? mod.resume : ref.notions.map((n) => n.libelle).join(' · '),
        matiere: matiere.nom,
        teinte: matiere.teinte,
        publie: Boolean(ref.publie && mod),
        module: mod,
      });
    });
  });
  return list.map((item, index) => ({ ...item, numero: index + 1 }));
};

export const publishedModuleDefs = (programme) => programmeModules(programme).filter((m) => m.publie).map((m) => m.module);

/** Exercices d'un niveau d'un module (§ 7.2) ; le niveau 2 mélange les notions du module. */
export const levelExercises = (mod, niveau) => mod.exercices.filter((ex) => ex.niveau === niveau);

/**
 * Sélection pour un concours blanc ou un test de positionnement, déterministe pour une graine.
 * Blanc : niveaux 2 et 3 majoritairement (§ 17). Test : niveaux variés, toutes matières (§ 16).
 */
export const pickAcrossProgramme = (programme, { nombre, mode, graine }) => {
  const mods = publishedModuleDefs(programme);
  const pools = mods.map((m) => core.seededShuffle(
    m.exercices.filter((ex) => (mode === 'blanc' ? ex.niveau >= 2 : true)),
    `${graine}:${m.code}`,
  ));
  const picked = [];
  let round = 0;
  while (picked.length < nombre && pools.some((p) => p.length > round)) {
    pools.forEach((pool) => { if (picked.length < nombre && pool[round]) picked.push(pool[round].code); });
    round += 1;
  }
  return core.seededShuffle(picked, `${graine}:ordre`);
};

export const packInfo = { version: pack.version, genereLe: pack.genereLe, provenance: pack.provenance };
export const contentInfo = () => ({ generation: cache.generation, majLe: cache.majLe });
export default pack;
