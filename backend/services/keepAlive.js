// Auto-ping : sur l'offre gratuite de Render, le service s'endort après une période sans trafic
// entrant. Le serveur appelle sa propre URL publique (SELF_URL) à intervalle régulier pour rester éveillé.
// La requête passe par le proxy de Render, elle compte donc comme du trafic entrant.

const DEFAULT_INTERVAL_MS = 60 * 1000;
const REQUEST_TIMEOUT_MS = 30 * 1000;

const startKeepAlive = ({
  url = process.env.SELF_URL || process.env.RENDER_EXTERNAL_URL,
  intervalMs = Number(process.env.SELF_PING_INTERVAL_MS) || DEFAULT_INTERVAL_MS,
} = {}) => {
  if (!url) {
    console.warn('[self-ping] SELF_URL non défini - auto-ping désactivé.');
    return null;
  }

  const target = `${url.replace(/\/+$/, '')}/api/health`;
  let running = false;
  let failures = 0;

  const ping = async () => {
    // Pas de chevauchement si une requête précédente est encore en cours.
    if (running) return;
    running = true;
    try {
      const res = await fetch(target, {
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        headers: { 'User-Agent': 'self-ping' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (failures) console.log(`[self-ping] Rétabli après ${failures} échec(s).`);
      failures = 0;
    } catch (error) {
      failures += 1;
      console.error(`[self-ping] Échec (${failures}) : ${error.message}`);
    } finally {
      running = false;
    }
  };

  const timer = setInterval(ping, intervalMs);
  console.log(`[self-ping] Actif - ping toutes les ${Math.round(intervalMs / 1000)} s vers ${target}`);
  return timer;
};

module.exports = { startKeepAlive };
