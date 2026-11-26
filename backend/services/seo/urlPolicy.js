const { siteUrl } = require('./config');

/*
 * Seules les pages publiques du site peuvent être soumises : même hôte que SITE_URL, HTTPS, sans
 * identifiants, paramètres ni fragment, hors espace personnel, administration, API et téléchargements.
 * La liste blanche finale reste le manifeste de la version en ligne (SeoPage) : cette règle ne fait que
 * rejeter tôt ce qui ne peut jamais être public.
 */
const PRIVATE = /^\/(?:compte|dashboard|app|login|register|recherche|api|admin|telechargement|download|uploads|static)(?:\/|$)|\.(?:pdf|json|js|css|map|txt)$/i;

const toPath = (input) => {
  if (typeof input !== 'string' || input.length > 600) return null;
  let url;
  try { url = new URL(input.trim(), `${siteUrl()}/`); } catch { return null; }
  const site = new URL(siteUrl());
  if (url.protocol !== site.protocol || url.host !== site.host) return null;
  if (url.username || url.password || url.search || url.hash) return null;
  const path = url.pathname.length > 1 ? url.pathname.replace(/\/+$/, '') : '/';
  let decoded;
  try { decoded = decodeURIComponent(path); } catch { return null; }
  if (PRIVATE.test(path) || /[<>"'\\\s]/.test(decoded)) return null;
  return path;
};

const toUrl = (path) => `${siteUrl()}${path === '/' ? '/' : path}`;

module.exports = { toPath, toUrl, PRIVATE };
