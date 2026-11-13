import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import prepApi from './api';
import { applyPlan, planUpdate, releaseDeferred, sanitizeCache } from './contentRepo';
import { bundleInfo, getContentCache, getProgramme, setContentCache } from './content';

/**
 * Mise à jour des contenus publiés (lot 4) : manifeste → programmes → modules utiles.
 * Le cache est un fichier à part de l'état de progression : s'il est perdu ou tronqué, l'app
 * repart du pack embarqué et retélécharge ; la progression n'est jamais touchée.
 */
const FILE = `${FileSystem.documentDirectory || ''}fatafalta-prepa-contenus.v1.json`;
const KEY = 'fatafalta-prepa-contenus.v1';
const isWeb = Platform.OS === 'web';
const MIN_INTERVAL = 60 * 1000;

let running = null;
let lastRun = 0;

export const hydrateContent = async () => {
  try {
    let raw = null;
    if (isWeb) raw = globalThis.localStorage?.getItem(KEY) || null;
    else if ((await FileSystem.getInfoAsync(FILE)).exists) raw = await FileSystem.readAsStringAsync(FILE);
    if (raw) setContentCache(sanitizeCache(JSON.parse(raw)));
  } catch (error) {
    // Fichier illisible (tronqué, stockage plein lors de l'écriture) : on repart du pack embarqué.
  }
};

const persist = async (cache) => {
  try {
    const raw = JSON.stringify(cache);
    if (isWeb) globalThis.localStorage?.setItem(KEY, raw);
    else {
      // Écriture dans un fichier temporaire puis remplacement : un arrêt brutal ne laisse pas de cache tronqué.
      await FileSystem.writeAsStringAsync(`${FILE}.tmp`, raw);
      await FileSystem.moveAsync({ from: `${FILE}.tmp`, to: FILE });
    }
  } catch (error) {
    // Stockage plein : le cache reste en mémoire pour cette session.
  }
};

/** Codes des modules référencés par une liste de programmes. */
const modulesOf = (codes, fetchedProgrammes) => {
  const out = new Set();
  codes.forEach((code) => {
    const prog = fetchedProgrammes[code] || getProgramme(code);
    prog?.matieres?.forEach((m) => m.modules.forEach((ref) => { if (ref.publie !== false) out.add(ref.code); }));
  });
  return out;
};

const fetchModule = async (entry) => {
  const first = await prepApi.module(entry.code, entry.revision);
  if (!first || first.code !== entry.code || (first.revision && first.revision !== entry.revision)) return null;
  const versions = { [first.version || 'fr']: { ...first, distant: true } };
  for (const v of (first.versions || []).filter((x) => !versions[x])) {
    // eslint-disable-next-line no-await-in-loop
    const mod = await prepApi.module(entry.code, entry.revision, v);
    if (mod?.code === entry.code) versions[v] = { ...mod, distant: true };
  }
  return versions;
};

/**
 * Synchronise le cache avec le manifeste publié.
 * @param {{ programmes: string[], busy: string[], force?: boolean }} params
 *   programmes : programmes suivis (leurs modules sont téléchargés) ;
 *   busy : modules utilisés par une session en cours (leur mise à jour attend la fin de la session).
 * @returns {Promise<{ changed: boolean, raison?: string }>}
 */
export const syncContent = ({ programmes = [], busy = [], force = false } = {}) => {
  if (running) return running;
  if (!force && Date.now() - lastRun < MIN_INTERVAL) return Promise.resolve({ changed: false, raison: 'récent' });
  running = (async () => {
    try {
      const before = getContentCache();
      const plan = planUpdate(before, await prepApi.manifest(), bundleInfo);
      if (plan.action !== 'appliquer') return { changed: false, raison: plan.raison };

      const fetched = { programmes: {}, modules: {} };
      await Promise.all(plan.fetchProgrammes.map(async (e) => {
        try {
          const out = await prepApi.programme(e.code, e.revision);
          if (out?.programme?.code === e.code) fetched.programmes[e.code] = out.programme;
        } catch (error) { /* gardé à l'ancienne révision ; nouvel essai à la prochaine synchronisation */ }
      }));

      const wanted = modulesOf(programmes, fetched.programmes);
      const toFetch = plan.fetchModules.filter((e) => wanted.has(e.code) || before.modules[e.code]);
      for (const e of toFetch) {
        try {
          // eslint-disable-next-line no-await-in-loop
          const versions = await fetchModule(e);
          if (versions) fetched.modules[e.code] = versions;
        } catch (error) {
          // 401/403 (pas de droits) ou réseau : le module reste à sa révision précédente ou indisponible.
          if (!error?.response) break;
        }
      }

      // Une autre synchronisation a pu appliquer une génération plus récente entre-temps.
      const current = getContentCache();
      if (current.generation > plan.generation) return { changed: false, raison: 'génération plus récente déjà appliquée' };
      const next = applyPlan(current, plan, fetched, busy);
      setContentCache(next);
      await persist(next);
      lastRun = Date.now();
      return { changed: true };
    } catch (error) {
      return { changed: false, raison: error?.response ? 'erreur serveur' : 'hors ligne' };
    } finally {
      running = null;
    }
  })();
  return running;
};

/** Fin d'une session : applique les mises à jour de modules qui attendaient. */
export const releaseContent = async (busy = []) => {
  const current = getContentCache();
  const next = releaseDeferred(current, busy);
  if (next === current) return;
  setContentCache(next);
  await persist(next);
};
