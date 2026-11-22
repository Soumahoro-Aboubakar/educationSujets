import * as SecureStore from 'expo-secure-store';
import api from './api';

/*
 * Session persistante de l'application.
 *
 * - Jeton d'accès (15 min) et jeton de renouvellement (session de 30 jours, prolongée à chaque
 *   usage, 180 jours au plus) rangés dans le trousseau de l'appareil (SecureStore : Keychain iOS,
 *   Keystore Android).
 * - Une requête refusée (401) déclenche un seul renouvellement, puis est rejouée : l'utilisateur ne
 *   ressaisit jamais son mot de passe tant que sa session est valable.
 * - Le jeton de renouvellement change à chaque usage ; le serveur ferme la session si un ancien est
 *   présenté (vol). Session terminée (déconnexion, mot de passe changé, compte suspendu) : retour
 *   propre à l'état « invité ». Une coupure réseau ne déconnecte jamais.
 */
const ACCESS_KEY = 'authToken';
const REFRESH_KEY = 'authRefresh';
const USER_KEY = 'authUser';
// Appels qui gèrent eux-mêmes leur réponse 401 (identifiants faux, code expiré…).
const NO_RETRY = /\/api\/auth\/(login|register|refresh-token|logout|password|handoff\/exchange)/;

let onEnded = () => {};
/** Appelé quand la session est terminée côté serveur. */
export const onSessionEnded = (callback) => { onEnded = callback; };

export const setAccessHeader = (token) => {
  if (token) api.defaults.headers.common.Authorization = `Bearer ${token}`;
  else delete api.defaults.headers.common.Authorization;
};

/** Enregistre la réponse de connexion / renouvellement ({ token, refreshToken }). */
export const saveSession = async ({ token, refreshToken }) => {
  await SecureStore.setItemAsync(ACCESS_KEY, token);
  if (refreshToken) await SecureStore.setItemAsync(REFRESH_KEY, refreshToken);
  setAccessHeader(token);
};

export const clearSession = async () => {
  await Promise.all([ACCESS_KEY, REFRESH_KEY, USER_KEY].map((key) => SecureStore.deleteItemAsync(key).catch(() => {})));
  setAccessHeader(null);
};

export const readRefreshToken = () => SecureStore.getItemAsync(REFRESH_KEY).catch(() => null);

const endSession = async () => {
  await clearSession();
  onEnded();
  return null;
};

let inflight = null;
/** @returns {Promise<string|null>} le nouveau jeton d'accès, ou null si la session est terminée. */
export const refreshSession = () => {
  if (inflight) return inflight;
  inflight = (async () => {
    const refreshToken = await readRefreshToken();
    // Connexion faite avec une ancienne version de l'app : rien pour renouveler.
    if (!refreshToken) return endSession();
    try {
      const res = await api.post('/api/auth/refresh-token', { refreshToken }, { quietStatuses: [401, 403] });
      await saveSession(res.data);
      return res.data.token;
    } catch (error) {
      const status = error.response?.status;
      if (status === 401 || status === 403) return endSession();
      throw error; // réseau, serveur indisponible, limite de débit : la session est conservée
    }
  })().finally(() => { inflight = null; });
  return inflight;
};

const headerOf = (config) => {
  const headers = config?.headers;
  if (!headers) return '';
  return (typeof headers.get === 'function' ? headers.get('Authorization') : headers.Authorization) || '';
};

api.interceptors.response.use(undefined, async (error) => {
  const { config, response } = error;
  const sent = headerOf(config);
  if (response?.status !== 401 || !sent.startsWith('Bearer ') || config._retried || NO_RETRY.test(config.url || '')) {
    throw error;
  }
  let token = null;
  try { token = await refreshSession(); } catch { throw error; }
  if (!token) throw error;
  config._retried = true;
  if (typeof config.headers?.set === 'function') config.headers.set('Authorization', `Bearer ${token}`);
  else config.headers = { ...config.headers, Authorization: `Bearer ${token}` };
  return api(config);
});
