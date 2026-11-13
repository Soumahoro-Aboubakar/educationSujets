const fs = require('fs');
const path = require('path');
const Organisme = require('../../models/Organisme');
const ParcoursType = require('../../models/ParcoursType');
const core = require('./shared/prepCore');
const { AsyncLocalStorage } = require('node:async_hooks');
const mongoose = require('mongoose');
const publication = require('./publicationService');
const context = new AsyncLocalStorage();
const snapshots = new Map();
const freeze = value => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
};
const indexPack = (pack, manifest = { generation: 0, schemaVersion: 1, entries: [], tombstones: [] }) => ({
  pack, manifest, exercices: new Map(Object.values(pack.modules).flatMap(mod => mod.exercices.map(ex => [ex.code, { exercice: ex, module: mod }]))),
  programmes: new Map(pack.programmes.map(p => [p.code, p])),
});
const snapshot = async () => {
  if (mongoose.connection.readyState !== 1) throw new (require('../../utils/errors'))('Contenu temporairement indisponible', 503);
  const active = await publication.current();
  if (!active.generation) return loadLegacy(); // transition avant l'import explicite uniquement
  const cacheKey = `${mongoose.connection.name}:${active.generation}:${publication.hash(active.entries)}`;
  if (snapshots.has(cacheKey)) return snapshots.get(cacheKey);
  const rows = await publication.readEntries(active.entries);
  const checked = await publication.validateRows(rows);
  const pack = { version: 1, generation: active.generation, modules: checked.modules, programmes: checked.programmes };
  for (const row of rows) {
    const value = row.kind === 'module' ? pack.modules[row.code] : pack.programmes.find(p => p.code === row.code);
    value.revision = row.revision; value.hash = row.hash;
  }
  freeze(pack);
  const result = indexPack(pack, { generation: active.generation, schemaVersion: 1, entries: active.entries, tombstones: active.tombstones });
  freeze(result.manifest);
  snapshots.set(cacheKey, result);
  if (snapshots.size > 4) snapshots.delete(snapshots.keys().next().value);
  return result;
};
const withSnapshot = async fn => context.getStore() ? fn() : context.run(await snapshot(), fn);
const middleware = (req, res, next) => withSnapshot(() => next()).catch(next);
const programmeModules = async (programme, revision) => {
  if (revision === undefined) return Object.fromEntries(publishedModules(programme).map(code => [code, getModule(code)]));
  const active = await publication.current();
  const manifest = active.history.find(h => h.entries.some(r => r.kind === 'programme' && r.code === programme.code && r.revision === Number(revision)));
  if (!manifest) return {};
  const codes = publishedModules(programme);
  const rows = await publication.readEntries(manifest.entries.filter(r => r.kind === 'module' && codes.includes(r.code)));
  return Object.fromEntries(rows.map(r => [r.code, { ...r.payload, revision: r.revision, hash: r.hash }]));
};
const historical = async (kind, code, revision) => {
  if (revision === undefined) return kind === 'module' ? getModule(code) : getProgramme(code);
  if (!/^[1-9]\d*$/.test(String(revision))) throw new (require('../../utils/errors'))('Révision invalide', 400);
  const active = await publication.current();
  if (!active.history.some(h => h.entries.some(r => r.kind === kind && r.code === code && r.revision === Number(revision)))) return null;
  const [row] = await publication.readEntries([{ kind, code, revision: Number(revision) }]);
  const payload = kind === 'module' ? require('./contentValidator').validateContent([row.payload]).modules[code] : row.payload;
  return { ...payload, revision: row.revision, hash: row.hash };
};

/** Pack historique réservé à la transition avant l'import et aux outils hors ligne.
 * Les requêtes et la notation utilisent ensuite uniquement leur snapshot Mongo épinglé.
 */
const PACK_PATH = path.resolve(__dirname, '../../data/prep/build/pack.json');

let cache = null;
const loadLegacy = () => {
  if (cache) return cache;
  const pack = JSON.parse(fs.readFileSync(PACK_PATH, 'utf8'));
  const exercices = new Map();
  Object.values(pack.modules).forEach((mod) => {
    mod.exercices.forEach((ex) => exercices.set(ex.code, { exercice: ex, module: mod }));
  });
  cache = { pack, exercices, programmes: new Map(pack.programmes.map((p) => [p.code, p])) };
  cache.manifest = { generation: 0, schemaVersion: 1, entries: [], tombstones: [] };
  return cache;
};

const load = () => context.getStore() || loadLegacy();

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
  if (load().manifest.generation) {
    const pairs = await Promise.all(load().pack.programmes.map(async prog => {
      const org = prog.organismeId && await Organisme.findById(prog.organismeId).select('nom logo slug').lean();
      return [prog.code, { organismeId: prog.organismeId || null, parcoursTypeId: prog.parcoursTypeId || null, organismeNom: org?.nom || prog.organisme.sigle, logo: org?.logo || null, slug: org?.slug || null }];
    }));
    return new Map(pairs);
  }
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
      revision: prog.revision || 0,
      hash: prog.hash,
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

const resetCache = () => { snapshots.clear(); cache = null; organismesCache = { at: 0, map: new Map() }; };

module.exports = { programmeModules, snapshot, withSnapshot, middleware, historical, load, getProgramme, getModule, getExercise, publishedModules, publicModule, exerciseIn, catalogue, resetCache };
