/*
 * Mesure d'audience Google Analytics 4, facultative : rien n'est chargé tant que
 * REACT_APP_GA_MEASUREMENT_ID (G-XXXXXXXXXX) n'est pas défini au moment de la construction.
 *
 * Aucune donnée personnelle : ni nom, ni e-mail, ni identifiant de compte, ni montant ou moyen de
 * paiement. Signaux Google et personnalisation publicitaire désactivés. Les pages vues sont
 * envoyées à chaque navigation (application monopage), une seule fois par adresse affichée.
 */
const MEASUREMENT_ID = process.env.REACT_APP_GA_MEASUREMENT_ID;
const enabled = Boolean(MEASUREMENT_ID) && typeof window !== 'undefined' && /^G-[A-Z0-9]+$/.test(MEASUREMENT_ID);
let started = false;
let lastPage = null;

const start = () => {
  if (!enabled || started) return;
  started = true;
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
  document.head.appendChild(script);
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtagProxy() { window.dataLayer.push(arguments); }; // eslint-disable-line prefer-rest-params
  window.gtag('js', new Date());
  window.gtag('config', MEASUREMENT_ID, {
    send_page_view: false,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
  });
};

/**
 * Texte libre (recherche, paramètres de campagne) : jamais envoyé s'il ressemble à une donnée
 * personnelle saisie par erreur (adresse e-mail, numéro de téléphone ou d'identité).
 */
export const safeText = (value, max = 100) => {
  const text = String(value || '').trim().slice(0, max);
  if (!text || /@|\d[\d\s.-]{5,}\d/.test(text)) return null;
  return text;
};

/** Page vue : chemin seul (sans paramètres d'un lien de connexion, de paiement…), sauf UTM. */
export const trackPageView = (location) => {
  if (!enabled) return;
  start();
  const params = new URLSearchParams(location.search);
  const kept = new URLSearchParams();
  ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach((key) => {
    const value = safeText(params.get(key));
    if (value) kept.set(key, value);
  });
  const page = `${location.pathname}${kept.toString() ? `?${kept}` : ''}`;
  if (page === lastPage) return;
  lastPage = page;
  // Titre lu après la mise à jour des métadonnées de la page (useSeo).
  setTimeout(() => {
    window.gtag('event', 'page_view', { page_location: `${window.location.origin}${page}`, page_title: document.title });
  }, 0);
};

/** Événement métier, paramètres non personnels uniquement. */
export const trackEvent = (name, params = {}) => {
  if (!enabled) return;
  start();
  window.gtag('event', name, params);
};

export const analyticsEnabled = enabled;
