const fs = require('fs');
const path = require('path');
const Organisme = require('../../models/Organisme');
const ParcoursType = require('../../models/ParcoursType');
const core = require('./shared/prepCore');

/**
 * Contenu de la préparation : lu depuis le pack versionné et validé (data/prep/build/pack.json,
 * produit par « npm run prep:pack »). Le contenu est donc relu et publié comme du code ; un
 * éditeur d'administration en base (§ 27) pourra remplacer cette source sans changer l'API.
 */
const PACK_PATH = path.resolve(__dirname, '../../data/prep/build/pack.json');

let cache = null;
const load = () => {
  if (cache) return cache;
  const pack = JSON.parse(fs.readFileSync(PACK_PATH, 'utf8'));
  const exercices = new Map();
  Object.values(pack.modules).forEach((mod) => {
    mod.exercices.forEach((ex) => exercices.set(ex.code, { exercice: ex, module: mod }));
  });
  cache = { pack, exercices, programmes: new Map(pack.programmes.map((p) => [p.code, p])) };
  return cache;
};

const getProgramme = (code) => load().programmes.get(code) || null;
const getModule = (code) => load().pack.modules[code] || null;
const getExercise = (code) => load().exercices.get(code) || null;

/** Codes des modules publiés d'un programme (dédoublonnés). */
const publishedModules = (programme) => [...new Set(programme.matieres.flatMap((m) => m.modules.filter((x) => x.publie).map((x) => x.code)))];

/**
 * Module sans les clés de correction (§ 29 : jamais de réponse avant la tentative), dans la
 * version demandée (cours de langue : « fr » par défaut, ou la langue étudiée). La version cible
 * brute n'est jamais envoyée : elle contient les explications des exercices.
 */
const publicModule = (mod, version) => {
  const { versionCible, ...applied } = core.moduleVersion(mod, version);
  return {
    ...applied,
    version: applied.version || core.VERSION_PAR_DEFAUT,
    versions: core.moduleVersions(mod),
    exercices: applied.exercices.map(core.publicExercise),
  };
};

/** Exercice dans la version demandée (textes traduits ; clé identique). */
const exerciseIn = (found, version) => {
  if (!found) return null;
  const trad = found.module.versionCible?.langue === version ? found.module.versionCible.exercices?.[found.exercice.code] : null;
  return trad ? core.exerciseVersion(found.exercice, trad) : found.exercice;
};

// ── Rapprochement avec le catalogue existant (logo, identifiants pour l'onglet Sujets) ──
let organismesCache = { at: 0, map: new Map() };
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const resolveCatalogLinks = async () => {
  if (Date.now() - organismesCache.at < 10 * 60 * 1000) return organismesCache.map;
  const map = new Map();
  try {
    for (const prog of load().pack.programmes) {
      const patterns = prog.organisme.recherche.map((r) => new RegExp(`^${escape(r)}(\\b|\\s|-|$)`, 'i'));
      // eslint-disable-next-line no-await-in-loop
      const organisme = await Organisme.findOne({ $or: patterns.map((p) => ({ nom: p })) }).select('nom logo slug').lean();
      let parcours = null;
      if (organisme) {
        // eslint-disable-next-line no-await-in-loop
        parcours = await ParcoursType.findOne({ organismeId: organisme._id, nom: prog.parcoursType }).select('nom').lean();
      }
      map.set(prog.code, {
        organismeId: organisme?._id || null,
        organismeNom: organisme?.nom || prog.organisme.sigle,
        logo: organisme?.logo || null,
        slug: organisme?.slug || null,
        parcoursTypeId: parcours?._id || null,
      });
    }
    organismesCache = { at: Date.now(), map };
  } catch (error) {
    // Base indisponible : le catalogue reste servi sans logos.
  }
  return organismesCache.map.size ? organismesCache.map : map;
};

/** Catalogue « Quel concours ? » : organismes → cycles disposant d'un programme (§ 29). */
const catalogue = async () => {
  const links = await resolveCatalogLinks();
  const groups = new Map();
  load().pack.programmes.forEach((prog) => {
    const link = links.get(prog.code) || {};
    const key = prog.organisme.sigle;
    if (!groups.has(key)) groups.set(key, { sigle: key, nom: link.organismeNom || key, logo: link.logo || null, organismeId: link.organismeId || null, cycles: [] });
    groups.get(key).cycles.push({
      programme: prog.code,
      nom: prog.titre,
      parcoursType: prog.parcoursType,
      parcoursTypeId: link.parcoursTypeId || null,
      matieres: prog.matieres.length,
      modulesPublies: prog.stats.modulesPublies,
      modulesTotal: prog.stats.modulesTotal,
      publie: prog.stats.modulesPublies > 0,
    });
  });
  return [...groups.values()];
};

const resetCache = () => { cache = null; organismesCache = { at: 0, map: new Map() }; };

module.exports = { load, getProgramme, getModule, getExercise, publishedModules, publicModule, exerciseIn, catalogue, resetCache };
