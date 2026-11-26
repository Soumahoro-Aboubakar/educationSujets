/*
 * 429 (« requêtes trop rapprochées ») : le serveur demande d'attendre. Le téléchargement d'un concours
 * enchaîne des dizaines de requêtes ; on patiente (Retry-After, 10 s au plus) puis on reprend, au lieu
 * de laisser un module manquant (affiché « Téléchargement interrompu »).
 */
const sleep = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });
const RATE_LIMIT_RETRIES = 3;
export const withRateLimitRetry = async (request, wait = sleep) => {
  for (let attempt = 0; ; attempt += 1) {
    try {
      // eslint-disable-next-line no-await-in-loop
      return await request();
    } catch (error) {
      if (error?.response?.status !== 429 || attempt >= RATE_LIMIT_RETRIES) throw error;
      const header = Number(error.response.headers?.['retry-after']);
      // eslint-disable-next-line no-await-in-loop
      await wait(Math.min(Number.isFinite(header) && header > 0 ? header * 1000 : 3000 * (attempt + 1), 10000));
    }
  }
};
