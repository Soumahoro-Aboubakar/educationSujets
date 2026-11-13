import axios from 'axios';

/**
 * Préparation sur le site (lot 6) : mêmes API et même protocole que l'application mobile.
 * - Identité : un compte connecté reçoit l'identité canonique de son compte (POST /api/prep/appareils),
 *   celle que l'application rattache au même compte. Le jeton passe dans l'en-tête X-Prep-Token,
 *   jamais dans une adresse.
 * - Actions : file locale persistée, clés idempotentes, statut par action (applied, duplicate,
 *   rejected, retry, conflict). Aucune note n'est calculée par le navigateur : les modules servis
 *   ne contiennent pas les clés des exercices notés.
 */
const TOKEN_KEY = 'fatafalta.prep.token';
const DEVICE_KEY = 'fatafalta.prep.appareil';
const QUEUE_KEY = 'fatafalta.prep.file';
const SEQ_KEY = 'fatafalta.prep.sequence';

const storage = {
  get: (key) => { try { return window.localStorage.getItem(key); } catch (error) { return null; } },
  set: (key, value) => { try { window.localStorage.setItem(key, value); return true; } catch (error) { return false; } },
  remove: (key) => { try { window.localStorage.removeItem(key); } catch (error) { /* rien */ } },
};

const randomId = () => (window.crypto?.randomUUID ? window.crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`);
let counter = 0;
export const newKey = () => `w-${Date.now().toString(36)}-${(counter += 1).toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export const deviceId = () => {
  let id = storage.get(DEVICE_KEY);
  if (!id) { id = `web-${randomId()}`; storage.set(DEVICE_KEY, id); }
  return id;
};

const headers = () => {
  const token = storage.get(TOKEN_KEY);
  return token ? { 'X-Prep-Token': token } : {};
};
const data = (response) => response.data?.data;

/** Jour calendaire local (même calcul que le mobile) ; le serveur le recale de toute façon. */
export const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const prepApi = {
  /** Identité du compte connecté (canonique) ; renvoie droits et progressions. */
  declare: async () => {
    const out = data(await axios.post('/api/prep/appareils', { appareilId: deviceId() }, { headers: headers() }));
    if (out?.token) storage.set(TOKEN_KEY, out.token);
    return out;
  },
  catalogue: async () => {
    const all = [];
    for (let page = 1; page <= 20; page += 1) {
      // eslint-disable-next-line no-await-in-loop
      const r = await axios.get('/api/prep/catalogue', { params: { page, limit: 100 } });
      all.push(...(r.data?.data || []));
      const p = r.data?.meta?.pagination;
      if (!p || page >= p.pages) break;
    }
    return all;
  },
  programme: (code) => axios.get(`/api/prep/programmes/${encodeURIComponent(code)}`).then(data),
  module: (code, version) => axios.get(`/api/prep/modules/${encodeURIComponent(code)}`, { params: version ? { version } : {}, headers: headers() }).then(data),
  progressions: () => axios.get('/api/prep/progressions', { headers: headers() }).then(data),
  sync: (actions) => axios.post('/api/prep/sync', { actions }, { headers: headers(), timeout: 20000 }).then(data),
};

/** Oublie l'identité locale (déconnexion) : la file non envoyée est conservée pour ce navigateur. */
export const forgetIdentity = () => storage.remove(TOKEN_KEY);
export const hasIdentity = () => Boolean(storage.get(TOKEN_KEY));

// ── File d'actions ──────────────────────────────────────────────────────────
const readQueue = () => {
  try { return JSON.parse(storage.get(QUEUE_KEY) || '[]').filter((a) => a && a.cle && a.type); } catch (error) { return []; }
};
let queue = readQueue();
let storageFull = false;
const listeners = new Set();
const notify = () => listeners.forEach((fn) => fn());
const persist = () => { storageFull = !storage.set(QUEUE_KEY, JSON.stringify(queue)); notify(); };

export const queueState = () => ({ pending: queue.length, storageFull });
export const subscribeQueue = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };

/** Ajoute une action ; seules les reprises non envoyées d'un même programme sont compactées. */
export const enqueue = (action) => {
  const entry = { cle: action.cle || newKey(), jour: todayKey(), ...action };
  if (entry.type === 'reprise') queue = queue.filter((a) => !(a.type === 'reprise' && a.programme === entry.programme && !inFlight.has(a.cle)));
  queue = [...queue, entry];
  persist();
  return entry.cle;
};

const waiters = new Map();
let inFlight = new Set();
let flushing = null;
let retryDelay = 1000;
let retryTimer = null;

/**
 * Envoie la file. Retirées : appliquées, doublons, refus définitifs, conflits. Gardées : erreurs
 * temporaires ou réseau, renvoyées avec un délai croissant.
 * @returns {Promise<{ resultats: Array, progressions: object, droits: object } | null>}
 */
export const flush = () => {
  if (flushing) return flushing;
  if (!queue.length || !hasIdentity()) return Promise.resolve(null);
  flushing = (async () => {
    const batch = queue.slice(0, 200);
    inFlight = new Set(batch.map((a) => a.cle));
    try {
      const out = await prepApi.sync(batch);
      const byKey = new Map((out.resultats || []).filter((r) => r?.cle).map((r) => [r.cle, r]));
      const done = new Set(batch.filter((a) => byKey.has(a.cle) && byKey.get(a.cle).statut !== 'retry').map((a) => a.cle));
      queue = queue.filter((a) => !done.has(a.cle));
      persist();
      done.forEach((cle) => { (waiters.get(cle) || []).forEach((fn) => fn(byKey.get(cle))); waiters.delete(cle); });
      if (done.size < batch.length) scheduleRetry();
      else { retryDelay = 1000; if (queue.length) setTimeout(flush, 300); }
      return out;
    } catch (error) {
      scheduleRetry();
      return null;
    } finally {
      inFlight = new Set();
      flushing = null;
    }
  })();
  return flushing;
};

function scheduleRetry() {
  clearTimeout(retryTimer);
  retryTimer = setTimeout(flush, retryDelay);
  retryDelay = Math.min(60000, retryDelay * 2);
}

/** Attend le résultat serveur d'une action ; `null` au-delà du délai (hors connexion). */
export const awaitResult = (cle, delai = 9000) => new Promise((resolve) => {
  const timer = setTimeout(() => {
    waiters.set(cle, (waiters.get(cle) || []).filter((fn) => fn !== done));
    resolve(null);
  }, delai);
  function done(result) { clearTimeout(timer); resolve(result); }
  waiters.set(cle, [...(waiters.get(cle) || []), done]);
  flush();
});

/** Reprise partagée : le serveur refuse d'écraser une reprise plus récente d'un autre appareil. */
export const shareResume = (programme, cible, vu = 0) => {
  const seq = Number(storage.get(SEQ_KEY) || 0) + 1;
  storage.set(SEQ_KEY, String(seq));
  return enqueue({ type: 'reprise', programme, appareil: deviceId(), seq, vu, cible });
};

// Envoi au retour de la connexion et quand l'onglet redevient visible.
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => { retryDelay = 1000; flush(); });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') flush(); });
}
