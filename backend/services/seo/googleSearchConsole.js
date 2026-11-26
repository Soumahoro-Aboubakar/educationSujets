const crypto = require('crypto');
const config = require('./config');

/*
 * Client officiel minimal de l'API Google Search Console (webmasters v3 + URL Inspection v1), sans
 * dépendance : jeton OAuth 2.0 d'un compte de service (JWT RS256 signé localement).
 *
 * Usages autorisés et seuls utilisés : lire / soumettre un sitemap, inspecter une URL (2 000/jour et
 * 600/min par propriété). Pas d'API Indexing (réservée aux offres d'emploi et diffusions en direct),
 * pas d'ancien « ping » de sitemap (supprimé par Google en 2023).
 *
 * Variables : GSC_SERVICE_ACCOUNT_JSON (clé JSON du compte de service, brute ou en base64 — secret),
 * GSC_PROPERTY (« sc-domain:fatafalta.com » ou « https://fatafalta.com/ »). Le compte de service doit
 * être ajouté comme utilisateur « Propriétaire » (soumission de sitemap) dans Search Console.
 */
const SCOPE = 'https://www.googleapis.com/auth/webmasters';
let cachedToken = null;
let deps = { fetch: (...args) => fetch(...args), now: () => Date.now() };
const setDeps = (next) => { deps = { ...deps, ...next }; cachedToken = null; };

const credentials = () => {
  const raw = config.gscCredentials();
  if (!raw) return null;
  try {
    const json = JSON.parse(raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8'));
    return json.client_email && json.private_key ? json : null;
  } catch {
    return null;
  }
};

const configured = () => Boolean(config.gscProperty() && credentials());

const b64url = (value) => Buffer.from(typeof value === 'string' ? value : JSON.stringify(value)).toString('base64url');

const accessToken = async () => {
  if (cachedToken && cachedToken.expiresAt > deps.now() + 60000) return cachedToken.value;
  const creds = credentials();
  if (!creds) throw new Error('Search Console non configurée');
  const iat = Math.floor(deps.now() / 1000);
  const tokenUri = creds.token_uri || 'https://oauth2.googleapis.com/token';
  const unsigned = `${b64url({ alg: 'RS256', typ: 'JWT' })}.${b64url({ iss: creds.client_email, scope: SCOPE, aud: tokenUri, iat, exp: iat + 3600 })}`;
  const signature = crypto.createSign('RSA-SHA256').update(unsigned).sign(creds.private_key).toString('base64url');
  const res = await deps.fetch(tokenUri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${unsigned}.${signature}` }),
    signal: AbortSignal.timeout(config.requestTimeoutMs()),
  });
  const data = await res.json().catch(() => ({}));
  // Jamais de clé ni de jeton dans les messages d'erreur.
  if (!res.ok || !data.access_token) throw new Error(`Authentification Google refusée (HTTP ${res.status})`);
  cachedToken = { value: data.access_token, expiresAt: deps.now() + (Number(data.expires_in) || 3600) * 1000 };
  return cachedToken.value;
};

const call = async (method, url, body) => {
  const res = await deps.fetch(url, {
    method,
    headers: { Authorization: `Bearer ${await accessToken()}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(config.requestTimeoutMs()),
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) {
    const reason = data?.error?.message ? String(data.error.message).slice(0, 200) : '';
    const error = new Error(`Search Console : HTTP ${res.status}${reason ? ` — ${reason}` : ''}`);
    error.status = res.status;
    throw error;
  }
  return data;
};

const site = () => encodeURIComponent(config.gscProperty());
const sitemapUrl = () => `${config.siteUrl()}/sitemap.xml`;

/** Soumet (ou resoumet) l'index de sitemaps. */
const submitSitemap = () => call('PUT', `https://www.googleapis.com/webmasters/v3/sites/${site()}/sitemaps/${encodeURIComponent(sitemapUrl())}`);

/** État du sitemap selon Google : dernière lecture, erreurs, avertissements, URL envoyées. */
const getSitemap = async () => {
  const data = await call('GET', `https://www.googleapis.com/webmasters/v3/sites/${site()}/sitemaps/${encodeURIComponent(sitemapUrl())}`);
  return {
    lastSubmitted: data.lastSubmitted || null,
    lastDownloaded: data.lastDownloaded || null,
    isPending: Boolean(data.isPending),
    errors: Number(data.errors) || 0,
    warnings: Number(data.warnings) || 0,
    submitted: (data.contents || []).reduce((sum, item) => sum + (Number(item.submitted) || 0), 0),
  };
};

/**
 * État de l'URL dans l'index Google (version connue de Google, pas un test en direct).
 * lastCrawlTime = dernière exploration par Google ; à distinguer de la date de l'inspection.
 */
const inspectUrl = async (url) => {
  const data = await call('POST', 'https://searchconsole.googleapis.com/v1/urlInspection/index:inspect', {
    inspectionUrl: url, siteUrl: config.gscProperty(), languageCode: 'fr',
  });
  const result = data.inspectionResult?.indexStatusResult || {};
  return {
    verdict: result.verdict || null,
    coverageState: result.coverageState || null,
    indexingState: result.indexingState || null,
    lastCrawlTime: result.lastCrawlTime ? new Date(result.lastCrawlTime) : null,
    googleCanonical: result.googleCanonical || null,
  };
};

module.exports = { configured, submitSitemap, getSitemap, inspectUrl, setDeps };
