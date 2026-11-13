/**
 * Dépôt de contenu de la préparation (lot 4) — logique pure, sans React Native ni réseau.
 *
 * Trois couches, de la plus prioritaire à la moins prioritaire :
 *  1. le cache publié, téléchargé depuis l'API d'après le manifeste (`GET /api/prep/manifest`) ;
 *  2. le pack embarqué (pack de secours, livré avec l'app, clés de correction comprises) ;
 *  3. rien : un contenu retiré par le manifeste disparaît aussi du pack embarqué.
 *
 * Règles :
 *  - un module dont l'empreinte publiée est celle du pack embarqué n'est jamais téléchargé :
 *    l'app garde la version embarquée et corrige donc localement, même hors connexion ;
 *  - un module téléchargé ne contient pas les clés des exercices notés (le serveur les retire) :
 *    ces exercices sont corrigés par le serveur, et hors connexion la réponse attend la correction ;
 *  - une génération plus ancienne que celle du cache est ignorée (deux réponses croisées) ;
 *  - un manifeste d'un schéma inconnu est ignoré : le cache précédent reste utilisé ;
 *  - un module utilisé par une session en cours n'est pas remplacé avant la fin de la session
 *    (pas de mélange de révisions dans une session) : la mise à jour attend dans `differes`.
 */

export const CACHE_FORMAT = 1;
export const SUPPORTED_SCHEMA = 1;
export const DEFAULT_VERSION = 'fr';

const isObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const isRevision = (value) => Number.isInteger(value) && value > 0;

export const emptyCache = () => ({
  format: CACHE_FORMAT,
  generation: 0,
  schemaVersion: SUPPORTED_SCHEMA,
  programmes: {},
  modules: {},
  retraits: { programmes: [], modules: [] },
  differes: {},
  majLe: 0,
});

export const isValidModule = (mod, code) => isObject(mod) && mod.code === code
  && typeof mod.titre === 'string' && Array.isArray(mod.lecons) && Array.isArray(mod.exercices) && Array.isArray(mod.notions)
  && mod.exercices.every((ex) => isObject(ex) && typeof ex.code === 'string' && typeof ex.type === 'string')
  && mod.lecons.every((l) => isObject(l) && typeof l.code === 'string' && Array.isArray(l.blocs));

export const isValidProgramme = (prog, code) => isObject(prog) && prog.code === code
  && typeof prog.titre === 'string' && isObject(prog.organisme) && Array.isArray(prog.matieres)
  && prog.matieres.every((m) => isObject(m) && Array.isArray(m.modules));

const validModuleEntry = (entry, code) => isObject(entry) && isRevision(entry.revision) && typeof entry.hash === 'string'
  && (entry.source === 'bundle'
    || (entry.source === 'remote' && isObject(entry.versions) && Object.keys(entry.versions).length > 0
      && Object.values(entry.versions).every((mod) => isValidModule(mod, code))));

const validProgrammeEntry = (entry, code) => isObject(entry) && isRevision(entry.revision) && typeof entry.hash === 'string'
  && isValidProgramme(entry.data, code);

/**
 * Relit un cache stocké. Un fichier tronqué, d'un autre format ou partiellement corrompu ne
 * fait jamais échouer l'app : les entrées illisibles sont écartées et seront retéléchargées.
 */
export const sanitizeCache = (raw) => {
  if (!isObject(raw) || raw.format !== CACHE_FORMAT || !Number.isInteger(raw.generation) || raw.generation < 0) return emptyCache();
  const cache = emptyCache();
  cache.generation = raw.generation;
  cache.majLe = Number(raw.majLe) || 0;
  Object.entries(isObject(raw.programmes) ? raw.programmes : {}).forEach(([code, entry]) => {
    if (validProgrammeEntry(entry, code)) cache.programmes[code] = entry;
  });
  Object.entries(isObject(raw.modules) ? raw.modules : {}).forEach(([code, entry]) => {
    if (validModuleEntry(entry, code)) cache.modules[code] = entry;
  });
  Object.entries(isObject(raw.differes) ? raw.differes : {}).forEach(([code, entry]) => {
    if (validModuleEntry(entry, code)) cache.differes[code] = entry;
  });
  const retraits = isObject(raw.retraits) ? raw.retraits : {};
  cache.retraits = {
    programmes: Array.isArray(retraits.programmes) ? retraits.programmes.filter((c) => typeof c === 'string') : [],
    modules: Array.isArray(retraits.modules) ? retraits.modules.filter((c) => typeof c === 'string') : [],
  };
  return cache;
};

/** Contrôle minimal du manifeste reçu ; `null` si inutilisable. */
export const readManifest = (manifest) => {
  if (!isObject(manifest) || !Number.isInteger(manifest.generation) || manifest.generation < 0 || !Array.isArray(manifest.entries)) return null;
  const entries = manifest.entries.filter((e) => isObject(e) && (e.kind === 'module' || e.kind === 'programme')
    && typeof e.code === 'string' && isRevision(e.revision) && typeof e.hash === 'string');
  if (entries.length !== manifest.entries.length) return null;
  return {
    generation: manifest.generation,
    schemaVersion: Number(manifest.schemaVersion) || 1,
    entries,
    incompatible: (Number(manifest.schemaVersion) || 1) > SUPPORTED_SCHEMA
      || entries.some((e) => (Number(e.schemaVersion) || 1) > SUPPORTED_SCHEMA),
  };
};

/**
 * Ce qu'il faut faire pour passer du cache au manifeste.
 * @param {object} cache cache courant (sanitizeCache)
 * @param {object} manifest réponse de /api/prep/manifest
 * @param {{ empreintes: Record<string,string>, modules: Record<string,object>, programmes: string[] }} bundle
 * @param {{ modulesUtiles?: (codes: string[]) => string[] }} options
 */
export const planUpdate = (cache, manifest, bundle) => {
  const read = readManifest(manifest);
  if (!read) return { action: 'ignorer', raison: 'manifeste illisible' };
  if (read.incompatible) return { action: 'ignorer', raison: 'schéma non pris en charge' };
  // Serveur encore sur le pack historique : le pack embarqué fait foi.
  if (read.generation === 0) return { action: 'ignorer', raison: 'aucune publication' };
  if (read.generation < cache.generation) return { action: 'ignorer', raison: 'génération plus ancienne que le cache' };

  const programmes = read.entries.filter((e) => e.kind === 'programme');
  const modules = read.entries.filter((e) => e.kind === 'module');
  const publishedProgrammes = new Set(programmes.map((e) => e.code));
  const publishedModules = new Set(modules.map((e) => e.code));

  const fetchProgrammes = programmes.filter((e) => {
    const cached = cache.programmes[e.code];
    return !cached || cached.revision !== e.revision || cached.hash !== e.hash;
  });
  const bundleModules = [];
  const fetchModules = [];
  modules.forEach((e) => {
    if (bundle.empreintes?.[e.code] === e.hash && bundle.modules?.[e.code]) { bundleModules.push(e); return; }
    const cached = cache.modules[e.code];
    if (cached && cached.source === 'remote' && cached.revision === e.revision && cached.hash === e.hash) return;
    fetchModules.push(e);
  });
  return {
    action: 'appliquer',
    generation: read.generation,
    fetchProgrammes,
    bundleModules,
    fetchModules,
    retraits: {
      programmes: [...new Set([...Object.keys(cache.programmes), ...(bundle.programmes || [])])].filter((c) => !publishedProgrammes.has(c)),
      modules: [...new Set([...Object.keys(cache.modules), ...Object.keys(bundle.modules || {})])].filter((c) => !publishedModules.has(c)),
    },
  };
};

/**
 * Applique un plan au cache, sans le muter.
 * @param {object} fetched { programmes: { CODE: data }, modules: { CODE: { [version]: data } } } — seuls
 *   les téléchargements réussis et valides sont présents ; les autres gardent leur ancienne révision.
 * @param {Set<string>|string[]} busy modules utilisés par une session en cours
 */
export const applyPlan = (cache, plan, fetched = {}, busy = []) => {
  if (plan.action !== 'appliquer') return cache;
  const inUse = new Set(busy);
  const next = {
    ...cache,
    generation: plan.generation,
    programmes: { ...cache.programmes },
    modules: { ...cache.modules },
    differes: { ...cache.differes },
    retraits: plan.retraits,
    majLe: Date.now(),
  };
  plan.fetchProgrammes.forEach((e) => {
    const data = fetched.programmes?.[e.code];
    if (isValidProgramme(data, e.code)) next.programmes[e.code] = { revision: e.revision, hash: e.hash, data };
  });
  const place = (code, entry) => {
    const current = next.modules[code];
    const same = current && current.revision === entry.revision && current.hash === entry.hash && current.source === entry.source;
    if (same) { delete next.differes[code]; return; }
    if (current && inUse.has(code)) { next.differes[code] = entry; return; }
    next.modules[code] = entry;
    delete next.differes[code];
  };
  plan.bundleModules.forEach((e) => place(e.code, { revision: e.revision, hash: e.hash, source: 'bundle' }));
  plan.fetchModules.forEach((e) => {
    const versions = fetched.modules?.[e.code];
    if (!isObject(versions) || !Object.keys(versions).length) return;
    if (!Object.values(versions).every((mod) => isValidModule(mod, e.code))) return;
    place(e.code, { revision: e.revision, hash: e.hash, source: 'remote', versions });
  });
  // Retrait : le contenu disparaît des listes ; s'il sert à une session en cours, il reste lisible
  // jusqu'à la fin de cette session (la progression déjà acquise n'est jamais supprimée).
  plan.retraits.modules.forEach((code) => { if (!inUse.has(code)) delete next.modules[code]; delete next.differes[code]; });
  plan.retraits.programmes.forEach((code) => { delete next.programmes[code]; });
  return next;
};

/** Promeut les mises à jour différées des modules qui ne sont plus utilisés par une session. */
export const releaseDeferred = (cache, busy = []) => {
  const inUse = new Set(busy);
  const codes = Object.keys(cache.differes || {}).filter((code) => !inUse.has(code));
  if (!codes.length) return cache;
  const next = { ...cache, modules: { ...cache.modules }, differes: { ...cache.differes } };
  codes.forEach((code) => { next.modules[code] = next.differes[code]; delete next.differes[code]; });
  return next;
};

/** Résout un module : cache publié, puis pack embarqué ; `null` s'il a été retiré. */
export const resolveModule = (cache, bundle, code, version = DEFAULT_VERSION) => {
  const entry = cache.modules[code];
  if (entry?.source === 'remote') {
    const mod = entry.versions[version] || entry.versions[DEFAULT_VERSION] || Object.values(entry.versions)[0];
    return { module: mod, distant: true, revision: entry.revision, hash: entry.hash, versionAppliquee: entry.versions[version] ? version : mod.version || DEFAULT_VERSION };
  }
  if (!entry && cache.retraits.modules.includes(code)) return null;
  const mod = bundle.modules?.[code];
  return mod ? { module: mod, distant: false, revision: entry?.revision || 0, hash: entry?.hash || bundle.empreintes?.[code] || null } : null;
};

/** Résout un programme : cache publié, puis pack embarqué ; `null` s'il a été retiré. */
export const resolveProgramme = (cache, bundleProgrammes, code) => {
  if (cache.programmes[code]) return cache.programmes[code].data;
  if (cache.retraits.programmes.includes(code)) return null;
  return bundleProgrammes.find((p) => p.code === code) || null;
};

/** Liste effective des programmes (ordre du pack, puis nouveaux programmes publiés). */
export const listProgrammes = (cache, bundleProgrammes) => {
  const seen = new Set();
  const out = [];
  bundleProgrammes.forEach((p) => {
    const prog = resolveProgramme(cache, bundleProgrammes, p.code);
    if (prog) { out.push(prog); seen.add(p.code); }
  });
  Object.keys(cache.programmes).sort().forEach((code) => { if (!seen.has(code)) out.push(cache.programmes[code].data); });
  return out;
};

/**
 * Exercice noté dont la clé n'est pas sur l'appareil (module téléchargé) : sa correction vient
 * du serveur. Les mini-questions non notées des leçons gardent leur correction.
 */
export const needsServerGrading = (exercice) => Boolean(exercice) && !Object.prototype.hasOwnProperty.call(exercice, 'cle');

/**
 * Fusion catalogue embarqué/cache + catalogue publié : les organismes et cycles publiés après la
 * sortie de l'app apparaissent ; un cycle retiré du catalogue publié disparaît.
 */
export const mergeCatalogue = (local, remote) => {
  if (!Array.isArray(remote) || !remote.length) return local;
  const remoteCycles = new Set(remote.flatMap((o) => o.cycles.map((c) => c.programme)));
  const merged = local.map((o) => {
    const r = remote.find((x) => x.sigle === o.sigle);
    if (!r) return { ...o, cycles: o.cycles.filter((c) => remoteCycles.has(c.programme)) };
    const known = new Set(o.cycles.map((c) => c.programme));
    const cycles = [
      ...o.cycles.filter((c) => remoteCycles.has(c.programme)).map((c) => ({ ...c, parcoursTypeId: r.cycles.find((rc) => rc.programme === c.programme)?.parcoursTypeId || null })),
      ...r.cycles.filter((c) => !known.has(c.programme)),
    ];
    return { ...o, nom: r.nom || o.nom, logo: r.logo || o.logo || null, organismeId: r.organismeId || o.organismeId, cycles };
  }).filter((o) => o.cycles.length);
  remote.forEach((r) => { if (!merged.some((o) => o.sigle === r.sigle) && r.cycles?.length) merged.push(r); });
  return merged;
};
