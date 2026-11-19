/*
 * Provenance d'une visite : d'où vient la personne qui arrive sur Fatafalta.
 * Indices, du plus sûr au moins sûr :
 *   1. paramètre utm_source (liens de campagne ; ChatGPT ajoute lui-même utm_source=chatgpt.com) ;
 *   2. navigateur intégré d'une application (Facebook, Instagram, TikTok… : visible dans le User-Agent) ;
 *   3. site d'origine (référent), réduit à son nom de domaine ;
 *   4. application installée (PWA) ouverte depuis l'écran d'accueil ;
 *   5. sinon « Accès direct » (adresse tapée, favori… et la plupart des liens WhatsApp, qui n'indiquent
 *      pas leur origine : pour les mesurer, partager des liens avec ?utm_source=whatsapp).
 */

const CATEGORIES = {
  ia: 'Assistants IA',
  recherche: 'Moteurs de recherche',
  social: 'Réseaux sociaux',
  messagerie: 'Messageries',
  campagne: 'Campagnes',
  site: 'Autres sites',
  application: 'Application installée',
  direct: 'Accès direct',
};

// [clé, libellé, catégorie, domaines (suffixes), alias utm_source]
const SOURCES = [
  ['chatgpt', 'ChatGPT', 'ia', ['chatgpt.com', 'chat.openai.com', 'openai.com'], ['chatgpt', 'chatgpt.com', 'openai']],
  ['gemini', 'Gemini', 'ia', ['gemini.google.com', 'bard.google.com'], ['gemini', 'bard']],
  ['perplexity', 'Perplexity', 'ia', ['perplexity.ai'], ['perplexity', 'perplexity.ai']],
  ['copilot', 'Copilot', 'ia', ['copilot.microsoft.com', 'copilot.cloud.microsoft'], ['copilot']],
  ['claude', 'Claude', 'ia', ['claude.ai'], ['claude', 'claude.ai']],
  ['deepseek', 'DeepSeek', 'ia', ['chat.deepseek.com', 'deepseek.com'], ['deepseek']],
  ['meta-ai', 'Meta AI', 'ia', ['meta.ai'], ['meta.ai', 'metaai']],
  // Avant Google et Yahoo : leurs webmails partagent le domaine.
  ['email', 'E-mail', 'messagerie', ['mail.google.com', 'outlook.live.com', 'mail.yahoo.com'], ['email', 'mail', 'newsletter']],
  ['google', 'Google', 'recherche', ['google.com', 'google.ci', 'google.fr', 'google.co', 'google.'], ['google']],
  ['bing', 'Bing', 'recherche', ['bing.com'], ['bing']],
  ['yahoo', 'Yahoo', 'recherche', ['yahoo.com', 'search.yahoo.com'], ['yahoo']],
  ['duckduckgo', 'DuckDuckGo', 'recherche', ['duckduckgo.com'], ['duckduckgo']],
  ['ecosia', 'Ecosia', 'recherche', ['ecosia.org'], ['ecosia']],
  ['yandex', 'Yandex', 'recherche', ['yandex.ru', 'yandex.com'], ['yandex']],
  ['facebook', 'Facebook', 'social', ['facebook.com', 'fb.com', 'fb.me', 'm.facebook.com', 'l.facebook.com', 'lm.facebook.com'], ['facebook', 'fb']],
  ['instagram', 'Instagram', 'social', ['instagram.com', 'l.instagram.com'], ['instagram', 'ig']],
  ['tiktok', 'TikTok', 'social', ['tiktok.com'], ['tiktok']],
  ['youtube', 'YouTube', 'social', ['youtube.com', 'youtu.be', 'm.youtube.com'], ['youtube']],
  ['x', 'X (Twitter)', 'social', ['x.com', 'twitter.com', 't.co'], ['x', 'twitter']],
  ['linkedin', 'LinkedIn', 'social', ['linkedin.com', 'lnkd.in'], ['linkedin']],
  ['snapchat', 'Snapchat', 'social', ['snapchat.com'], ['snapchat']],
  ['whatsapp', 'WhatsApp', 'messagerie', ['whatsapp.com', 'wa.me', 'web.whatsapp.com'], ['whatsapp', 'wa']],
  ['telegram', 'Telegram', 'messagerie', ['t.me', 'telegram.org', 'web.telegram.org'], ['telegram']],
  ['messenger', 'Messenger', 'messagerie', ['messenger.com'], ['messenger']],
];

const BY_KEY = new Map(SOURCES.map(([key, label, category]) => [key, { key, label, category }]));
const SPECIAL = {
  direct: { key: 'direct', label: 'Accès direct', category: 'direct' },
  pwa: { key: 'pwa', label: 'Application installée (PWA)', category: 'application' },
};

// Navigateurs intégrés des applications : la page s'ouvre dans l'app, souvent sans référent.
const IN_APP = [
  [/FBAN|FBAV|FB_IAB|FBIOS/i, 'facebook'],
  [/Instagram/i, 'instagram'],
  [/musical_ly|BytedanceWebview|TikTok/i, 'tiktok'],
  [/LinkedInApp/i, 'linkedin'],
  [/Snapchat/i, 'snapchat'],
  [/Telegram/i, 'telegram'],
];

const BOT = /bot|crawl|spider|slurp|preview|headless|lighthouse|pagespeed|facebookexternalhit|whatsapp\/|curl|wget|python|axios|node-fetch|monitor/i;

const clean = (value, max = 80) => String(value || '').trim().toLowerCase().slice(0, max);
const hostMatches = (host, domain) => (domain.endsWith('.') ? host.startsWith(domain) || host.includes(`.${domain}`) : host === domain || host.endsWith(`.${domain}`));

const byHost = (host) => SOURCES.find(([, , , domains]) => domains.some((domain) => hostMatches(host, domain)));
const byAlias = (utm) => SOURCES.find(([key, , , , aliases]) => key === utm || aliases.includes(utm));

const isBot = (userAgent = '') => !userAgent || BOT.test(userAgent);

/**
 * @param {{ referrerHost?: string, utmSource?: string, userAgent?: string, standalone?: boolean, siteHost?: string }} visit
 * @returns {{ key: string, label: string, category: string }}
 */
const classify = ({ referrerHost, utmSource, userAgent = '', standalone = false, siteHost = 'fatafalta.com' } = {}) => {
  const utm = clean(utmSource, 60).replace(/^https?:\/\//, '').replace(/^www\./, '');
  if (utm) {
    const known = byAlias(utm) || byHost(utm);
    if (known) return BY_KEY.get(known[0]);
    // Campagne nommée librement (affiche, partenaire…) : gardée telle quelle, assainie.
    const name = utm.replace(/[^a-z0-9._-]/g, '').slice(0, 40);
    if (name) return { key: `campagne:${name}`, label: `Campagne « ${name} »`, category: 'campagne' };
  }
  const inApp = IN_APP.find(([pattern]) => pattern.test(userAgent));
  if (inApp) return BY_KEY.get(inApp[1]);

  const host = clean(referrerHost, 120).replace(/^www\./, '');
  if (host && !hostMatches(host, siteHost) && host !== 'localhost') {
    const known = byHost(host);
    if (known) return BY_KEY.get(known[0]);
    const domain = host.replace(/[^a-z0-9.-]/g, '').split('.').slice(-2).join('.');
    if (domain.includes('.')) return { key: `site:${domain}`, label: domain, category: 'site' };
  }
  if (standalone) return SPECIAL.pwa;
  return SPECIAL.direct;
};

/** Libellé d'une clé enregistrée (le rapport ne stocke que la clé). */
const describe = (key) => {
  if (BY_KEY.has(key)) return BY_KEY.get(key);
  if (SPECIAL[key]) return SPECIAL[key];
  if (key.startsWith('campagne:')) return { key, label: `Campagne « ${key.slice(9)} »`, category: 'campagne' };
  if (key.startsWith('site:')) return { key, label: key.slice(5), category: 'site' };
  return { key, label: key, category: 'site' };
};

/** Rubrique d'arrivée (chemin seul) : utile pour savoir ce qui attire depuis chaque source. */
const sectionOf = (path = '/') => {
  const value = String(path || '/');
  if (value === '/' || value === '') return 'accueil';
  if (value.startsWith('/sujets')) return 'sujets';
  if (value.startsWith('/preparation')) return 'preparation';
  if (value.startsWith('/abonnement')) return 'abonnement';
  return 'autre';
};

module.exports = { CATEGORIES, classify, describe, isBot, sectionOf };
