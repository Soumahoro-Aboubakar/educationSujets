import axios from 'axios';

/*
 * Session persistante et sécurisée du site.
 *
 * - Le jeton d'accès (15 min) accompagne les appels à l'API. Il est renouvelé sans jamais redemander
 *   le mot de passe, grâce au cookie de renouvellement posé par le serveur : HttpOnly (illisible par
 *   le JavaScript de la page), Secure, SameSite=Strict, limité à /api/auth.
 * - Renouvellement : une minute avant l'expiration (onglet visible), au retour sur l'onglet, et en
 *   rattrapage quand une requête reçoit 401 (la requête est alors rejouée, sans rien perdre).
 * - Un seul renouvellement à la fois, y compris entre onglets (verrou du navigateur) : le serveur
 *   ferme la session si un même cookie est présenté deux fois (protection contre le vol).
 * - Session réellement terminée (déconnexion, mot de passe changé, 30 jours sans visite, compte
 *   suspendu) : l'utilisateur est déconnecté proprement. Une coupure réseau ne déconnecte jamais.
 */
const TOKEN_KEY = 'token';
const LOCK = 'fatafalta-auth-refresh';
const EARLY_MAX_MS = 60 * 1000;
// Appels qui gèrent eux-mêmes leur réponse 401 (identifiants faux, code expiré…).
const NO_RETRY = /\/api\/auth\/(login|register|refresh-token|logout|password|handoff\/exchange)/;

const readToken = () => {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
};

const claims = (token) => {
  try { return JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))); } catch { return {}; }
};
/** Temps restant avant l'échéance de renouvellement : une minute avant l'expiration (un quart de la durée au plus). */
const timeLeft = (token) => {
  const { exp = 0, iat = 0 } = claims(token);
  const early = Math.min(EARLY_MAX_MS, Math.max(0, (exp - iat) * 250));
  return exp * 1000 - early - Date.now();
};

let timer = null;
let onEnded = () => {};
/** Appelé quand la session est terminée côté serveur (ou dans un autre onglet). */
export const onSessionEnded = (callback) => { onEnded = callback; };

const schedule = () => {
  clearTimeout(timer);
  const token = readToken();
  if (!token) return;
  const wait = Math.max(0, timeLeft(token));
  // eslint-disable-next-line no-use-before-define
  timer = setTimeout(() => { if (document.visibilityState === 'visible') refreshSession(token).catch(() => {}); }, wait);
};

export const applyToken = (token) => {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token); else localStorage.removeItem(TOKEN_KEY);
  } catch { /* navigation privée : la session reste en mémoire */ }
  if (token) axios.defaults.headers.common.Authorization = `Bearer ${token}`;
  else delete axios.defaults.headers.common.Authorization;
  schedule();
};

const withLock = (task) => (typeof navigator !== 'undefined' && navigator.locks?.request
  ? navigator.locks.request(LOCK, task)
  : task());

let inflight = null;
/**
 * Renouvelle le jeton d'accès. `previous` : le jeton qui expire ou vient d'être refusé.
 * @returns {Promise<string|null>} le nouveau jeton, ou null si la session est terminée.
 */
export const refreshSession = (previous) => {
  if (inflight) return inflight;
  inflight = withLock(async () => {
    // Un autre onglet vient peut-être de renouveler : son jeton est déjà enregistré.
    const current = readToken();
    if (current && current !== previous && timeLeft(current) > 0) {
      applyToken(current);
      return current;
    }
    try {
      const res = await axios.post('/api/auth/refresh-token', {}, { withCredentials: true });
      applyToken(res.data.token);
      return res.data.token;
    } catch (error) {
      const status = error.response?.status;
      if (status === 401 || status === 403) {
        applyToken(null);
        onEnded();
        return null;
      }
      throw error; // réseau, serveur indisponible, limite de débit : la session est conservée
    }
  }).finally(() => { inflight = null; });
  return inflight;
};

/** Déconnexion : session fermée côté serveur (cookie effacé), puis localement. */
export const endSession = () => {
  const token = readToken();
  if (token) {
    axios.post('/api/auth/logout', {}, { withCredentials: true, headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
  }
  applyToken(null);
};

const headerOf = (config) => {
  const { headers } = config || {};
  if (!headers) return '';
  return (typeof headers.get === 'function' ? headers.get('Authorization') : headers.Authorization) || '';
};

export const installSession = () => {
  // Les cookies de session ne circulent que vers /api/auth (connexion, renouvellement, déconnexion).
  axios.interceptors.request.use((config) => {
    if (/\/api\/auth\//.test(config.url || '')) config.withCredentials = true;
    return config;
  });

  axios.interceptors.response.use(undefined, async (error) => {
    const { config, response } = error;
    const sent = headerOf(config);
    if (response?.status !== 401 || !sent.startsWith('Bearer ') || config._retried || NO_RETRY.test(config.url || '')) {
      throw error;
    }
    let token = null;
    try { token = await refreshSession(sent.slice(7)); } catch { throw error; }
    if (!token) throw error;
    config._retried = true;
    if (typeof config.headers?.set === 'function') config.headers.set('Authorization', `Bearer ${token}`);
    else config.headers = { ...config.headers, Authorization: `Bearer ${token}` };
    return axios(config);
  });

  // Retour sur l'onglet : jeton renouvelé s'il expire bientôt (ordinateur en veille, onglet oublié).
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    const token = readToken();
    if (token && timeLeft(token) <= 0) refreshSession(token).catch(() => {});
    else schedule();
  });

  // Autres onglets : même jeton, même déconnexion.
  window.addEventListener('storage', (event) => {
    if (event.key !== TOKEN_KEY) return;
    if (event.newValue) {
      axios.defaults.headers.common.Authorization = `Bearer ${event.newValue}`;
      schedule();
    } else {
      delete axios.defaults.headers.common.Authorization;
      clearTimeout(timer);
      onEnded();
    }
  });
};
