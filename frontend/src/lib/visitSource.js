import axios from 'axios';

/*
 * Provenance des visites (ChatGPT, Google, Facebook, WhatsApp…), pour l'administration.
 * Une seule fois par session de navigation : nom de domaine du site d'origine (jamais son adresse
 * complète), utm_source, rubrique d'arrivée, application installée ou non. Le serveur classe et ne
 * garde que des compteurs par jour. La source de première arrivée est gardée 30 jours dans le
 * navigateur pour attribuer une inscription.
 */
const SESSION_KEY = 'fatafalta.provenance.session';
const FIRST_KEY = 'fatafalta.provenance';
const KEEP_MS = 30 * 86400000;

const storage = (kind) => { try { return window[kind]; } catch (error) { return null; } };

export const trackArrival = () => {
  if (typeof window === 'undefined' || process.env.NODE_ENV !== 'production') return;
  const session = storage('sessionStorage');
  if (session?.getItem(SESSION_KEY)) return;
  session?.setItem(SESSION_KEY, '1');

  let referrerHost = '';
  try { referrerHost = document.referrer ? new URL(document.referrer).hostname : ''; } catch (error) { /* référent illisible */ }
  const params = new URLSearchParams(window.location.search);
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
  const body = { referrerHost, utmSource: params.get('utm_source') || '', path: window.location.pathname, standalone };

  axios.post('/api/analytics/visit', body).then(({ data }) => {
    const source = data?.data?.source;
    const local = storage('localStorage');
    if (!source || !local) return;
    try {
      const first = JSON.parse(local.getItem(FIRST_KEY) || 'null');
      // Première arrivée connue et récente : on la garde (un retour direct ne l'efface pas).
      if (first && Date.now() - first.at < KEEP_MS && source === 'direct') return;
      if (!first || Date.now() - first.at >= KEEP_MS || first.source === 'direct') local.setItem(FIRST_KEY, JSON.stringify({ source, at: Date.now() }));
    } catch (error) { /* stockage indisponible */ }
  }).catch(() => {});
};

/** Inscription réussie : attribuée à la source de première arrivée (30 jours). */
export const trackSignupSource = () => {
  if (process.env.NODE_ENV !== 'production') return;
  let source = 'direct';
  try {
    const first = JSON.parse(storage('localStorage')?.getItem(FIRST_KEY) || 'null');
    if (first && Date.now() - first.at < KEEP_MS) source = first.source;
  } catch (error) { /* rien */ }
  axios.post('/api/analytics/signup', { source }).catch(() => {});
};
