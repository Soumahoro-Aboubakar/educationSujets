const { invalidateSeoCatalog } = require('./seoCatalogService');

/*
 * Après une publication, une modification ou une suppression de sujet :
 *  1. le flux SEO est recalculé à la prochaine demande ;
 *  2. le site web est reconstruit (hook de déploiement Render du site statique), pour que ses
 *     pages pré-rendues et son sitemap reflètent le catalogue ;
 *  3. une fois la nouvelle version en ligne, les adresses concernées sont signalées via IndexNow
 *     (Bing, Yandex, Seznam… ; Google n'utilise pas IndexNow).
 *
 * Les changements sont regroupés : une série de publications ne déclenche qu'une reconstruction.
 * Sans FRONTEND_DEPLOY_HOOK_URL ni INDEXNOW_KEY, seul le cache est invalidé.
 *
 * Variables : SITE_URL, FRONTEND_DEPLOY_HOOK_URL (secret), INDEXNOW_KEY,
 * SEO_REBUILD_DELAY_MS (10 min par défaut), INDEXNOW_DELAY_MS (10 min après la reconstruction).
 */
const SITE_URL = () => (process.env.SITE_URL || 'https://fatafalta.onrender.com').replace(/\/+$/, '');
const REQUEST_TIMEOUT_MS = 30 * 1000;
const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';
const INDEXNOW_KEY_PATTERN = /^[a-zA-Z0-9-]{8,128}$/;

const pendingUrls = new Set();
let rebuildTimer = null;

const delay = (name, fallback) => {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
};

const enabled = () => process.env.NODE_ENV !== 'test';

const documentUrl = (documentId) => `${SITE_URL()}/sujets/document/${documentId}`;

const triggerRebuild = async () => {
  const hook = process.env.FRONTEND_DEPLOY_HOOK_URL;
  if (!hook) return false;
  try {
    const res = await fetch(hook, { method: 'POST', signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    console.log('[SEO] Reconstruction du site demandée.');
    return true;
  } catch (error) {
    // L'URL du hook est secrète : jamais affichée dans les journaux.
    console.error(`[SEO] Reconstruction du site impossible : ${error.message}`);
    return false;
  }
};

/** Signale des adresses du site à IndexNow (au plus 10 000 par envoi, selon le protocole). */
const submitIndexNow = async (urls) => {
  const key = process.env.INDEXNOW_KEY;
  if (!key || !urls.length) return null;
  if (!INDEXNOW_KEY_PATTERN.test(key)) {
    console.error('[SEO] INDEXNOW_KEY invalide (8 à 128 caractères : lettres, chiffres, tirets).');
    return null;
  }
  const site = new URL(SITE_URL());
  const urlList = [...new Set(urls)].filter((url) => new URL(url).host === site.host).slice(0, 10000);
  if (!urlList.length) return null;
  try {
    const res = await fetch(INDEXNOW_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ host: site.host, key, keyLocation: `${site.origin}/${key}.txt`, urlList }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    // 200 : reçu ; 202 : reçu, clé en cours de vérification. 403/422/429 : voir la documentation IndexNow.
    if (res.status === 200 || res.status === 202) {
      console.log(`[SEO] IndexNow : ${urlList.length} adresse(s) signalée(s) (HTTP ${res.status}).`);
    } else {
      console.error(`[SEO] IndexNow a refusé l'envoi (HTTP ${res.status}).`);
    }
    return res.status;
  } catch (error) {
    console.error(`[SEO] IndexNow injoignable : ${error.message}`);
    return null;
  }
};

const flush = async () => {
  rebuildTimer = null;
  const urls = [...pendingUrls];
  pendingUrls.clear();
  const rebuilt = await triggerRebuild();
  // Les pages pré-rendues n'existent qu'après la reconstruction : IndexNow attend qu'elle soit en ligne.
  const wait = rebuilt ? delay('INDEXNOW_DELAY_MS', 10 * 60 * 1000) : 0;
  const timer = setTimeout(() => submitIndexNow([...urls, `${SITE_URL()}/sujets`]), wait);
  timer.unref?.();
};

/**
 * À appeler après tout changement visible du catalogue public.
 * @param {Array<string|object>} documentIds sujets concernés (identifiants ou documents)
 */
const notifyCatalogChange = (documentIds = []) => {
  invalidateSeoCatalog();
  if (!enabled()) return;
  documentIds
    .map((value) => (value && typeof value === 'object' ? value._id : value))
    .filter(Boolean)
    .forEach((documentId) => pendingUrls.add(documentUrl(documentId)));
  if (!process.env.FRONTEND_DEPLOY_HOOK_URL && !process.env.INDEXNOW_KEY) return;
  if (rebuildTimer) return;
  rebuildTimer = setTimeout(() => {
    flush().catch((error) => console.error(`[SEO] ${error.message}`));
  }, delay('SEO_REBUILD_DELAY_MS', 10 * 60 * 1000));
  rebuildTimer.unref?.();
};

module.exports = { notifyCatalogChange, submitIndexNow, documentUrl };
