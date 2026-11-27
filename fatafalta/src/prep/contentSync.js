import { useSyncExternalStore } from 'react';
import { withRateLimitRetry } from './rateLimitRetry';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import prepApi from './api';
import { applyPlan, planUpdate, releaseDeferred, sanitizeCache } from './contentRepo';
import { bundleInfo, getContentCache, getProgramme, setContentCache } from './content';

/**
 * Contenus de préparation à la demande : manifeste → programmes (plans des concours, légers) →
 * modules (leçons, exercices) des seuls concours suivis. Rien n'est livré avec l'application ;
 * ce qui a été téléchargé est gardé sur l'appareil et reste consultable hors ligne.
 * Le cache est un fichier à part de l'état de progression : s'il est perdu ou tronqué, l'app
 * retélécharge ; la progression n'est jamais touchée.
 */

// État du dernier téléchargement, pour les écrans (chargement, hors ligne, accès requis).
// phase : 'idle' | 'loading' | 'done' | 'offline' | 'locked' | 'error'
let status = { phase: 'idle', at: 0 };
const statusListeners = new Set();
const setStatus = (next) => { status = { ...next, at: Date.now() }; statusListeners.forEach((listener) => listener()); };
const subscribeStatus = (listener) => { statusListeners.add(listener); return () => statusListeners.delete(listener); };
export const getContentStatus = () => status;
/** Hook : état du téléchargement des contenus. */
export const useContentStatus = () => useSyncExternalStore(subscribeStatus, getContentStatus, getContentStatus);
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
  const first = await withRateLimitRetry(() => prepApi.module(entry.code, entry.revision));
  if (!first || first.code !== entry.code || (first.revision && first.revision !== entry.revision)) return null;
  const versions = { [first.version || 'fr']: { ...first, distant: true } };
  for (const v of (first.versions || []).filter((x) => !versions[x])) {
    // eslint-disable-next-line no-await-in-loop
    const mod = await withRateLimitRetry(() => prepApi.module(entry.code, entry.revision, v));
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
let queued = null;
export const syncContent = ({ programmes = [], busy = [], force = false } = {}) => {
  // Un téléchargement est en cours (démarrage…) : une demande forcée (nouveau concours choisi)
  // est rejouée juste après, pour que ses modules ne soient pas oubliés.
  if (running) {
    if (force) queued = { programmes, busy };
    return running.then(() => {
      if (!queued) return { changed: false, raison: 'en cours' };
      const next = queued;
      queued = null;
      return syncContent({ ...next, force: true });
    });
  }
  if (!force && Date.now() - lastRun < MIN_INTERVAL) return Promise.resolve({ changed: false, raison: 'récent' });
  running = (async () => {
    setStatus({ phase: 'loading' });
    let locked = false;
    let offline = false;
    let identityRejected = false;
    try {
      const before = getContentCache();
      const plan = planUpdate(before, await withRateLimitRetry(() => prepApi.manifest()), bundleInfo);
      if (plan.action !== 'appliquer') { setStatus({ phase: 'done', raison: plan.raison }); return { changed: false, raison: plan.raison }; }

      const fetched = { programmes: {}, modules: {} };
      await Promise.all(plan.fetchProgrammes.map(async (e) => {
        try {
          const out = await withRateLimitRetry(() => prepApi.programme(e.code, e.revision));
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
          // 401 : identité de préparation refusée (jeton périmé) ; 403 : pas de droit d'étude.
          // 401 ou 403 PREP_OWNER (identité d'un compte déconnecté) : identité à rétablir, pas un
          // verrou d'abonnement.
          if (error?.response?.status === 401 || error?.response?.data?.code === 'PREP_OWNER') { identityRejected = true; break; }
          if (error?.response?.status === 403) { locked = true; break; }
          // Coupure réseau : on garde ce qui est déjà arrivé, la suite viendra au prochain passage.
          if (!error?.response) { offline = true; break; }
        }
      }

      // Une autre synchronisation a pu appliquer une génération plus récente entre-temps.
      const current = getContentCache();
      if (current.generation > plan.generation) { setStatus({ phase: 'done' }); return { changed: false, raison: 'génération plus récente déjà appliquée' }; }
      const next = applyPlan(current, plan, fetched, busy);
      setContentCache(next);
      await persist(next);
      lastRun = Date.now();
      setStatus({ phase: locked ? 'locked' : offline ? 'offline' : identityRejected ? 'error' : 'done' });
      return { changed: true, locked, offline, identityRejected };
    } catch (error) {
      const raison = error?.response ? 'erreur serveur' : 'hors ligne';
      setStatus({ phase: error?.response ? 'error' : 'offline', raison });
      return { changed: false, raison };
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
