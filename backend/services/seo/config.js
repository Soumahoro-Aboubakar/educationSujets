/*
 * Configuration du service d'indexation (lue à chaque appel : modifiable sans redémarrage en test).
 * Aucun secret n'est renvoyé par ce module ; seulement des booléens « configuré ».
 */
const num = (name, fallback) => {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
};

const siteUrl = () => (process.env.SITE_URL || 'https://fatafalta.com').replace(/\/+$/, '');
const INDEXNOW_KEY_PATTERN = /^[a-zA-Z0-9-]{8,128}$/;
const indexNowKey = () => {
  const key = process.env.INDEXNOW_KEY || '';
  return INDEXNOW_KEY_PATTERN.test(key) ? key : null;
};

module.exports = {
  siteUrl,
  indexNowKey,
  INDEXNOW_KEY_PATTERN,
  indexNowEndpoint: () => process.env.INDEXNOW_ENDPOINT || 'https://api.indexnow.org/indexnow',
  deployHook: () => process.env.FRONTEND_DEPLOY_HOOK_URL || null,
  // Regroupement : la reconstruction part REBUILD_DELAY après le premier changement non intégré.
  rebuildDelayMs: () => num('SEO_REBUILD_DELAY_MS', 10 * 60 * 1000),
  // Cloudflare Pages gratuit : 500 builds/mois, git push compris. 10/jour laisse de la marge.
  maxRebuildsPerDay: () => num('SEO_MAX_REBUILDS_PER_DAY', 10),
  // Au-delà, une reconstruction demandée et jamais vue en ligne est considérée comme perdue.
  rebuildTimeoutMs: () => num('SEO_REBUILD_TIMEOUT_MS', 45 * 60 * 1000),
  tickMs: () => num('SEO_TICK_MS', 60 * 1000),
  // Sans reconstruction attendue, la version en ligne est relue toutes les 15 min (déploiements git push).
  buildPollMs: () => num('SEO_BUILD_POLL_MS', 15 * 60 * 1000),
  maxAttempts: () => num('SEO_INDEXNOW_MAX_ATTEMPTS', 8),
  // Garde-fou : plus de retraits que max(20, 20 %) d'un coup → confirmation manuelle.
  removalGuardRatio: () => num('SEO_REMOVAL_GUARD_RATIO', 0.2),
  requestTimeoutMs: () => num('SEO_REQUEST_TIMEOUT_MS', 30 * 1000),
  // Google Search Console (compte de service, secret) et quota d'inspection quotidien (API : 2 000/jour).
  gscProperty: () => process.env.GSC_PROPERTY || null,
  gscCredentials: () => process.env.GSC_SERVICE_ACCOUNT_JSON || null,
  inspectionsPerDay: () => num('GSC_INSPECTIONS_PER_DAY', 100),
  inspectionDelayMs: () => num('GSC_INSPECTION_DELAY_MS', 3 * 86400000),
  enabled: () => process.env.NODE_ENV !== 'test' && process.env.SEO_INDEXING_DISABLED !== 'true',
};
