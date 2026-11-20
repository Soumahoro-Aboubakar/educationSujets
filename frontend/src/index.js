

import React from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios';
import './index.css';
import App from './App';
import { installVisitorToken } from './lib/visitor';
import { installSession } from './lib/session';
// API sur le domaine de Fatafalta (adresse stable, indépendante de l'hébergeur).
// REACT_APP_API_URL permet de viser un backend local (ex. http://localhost:5000).
axios.defaults.baseURL = (process.env.REACT_APP_API_URL || 'https://api.fatafalta.com').replace(/\/$/, '');
axios.defaults.headers.common.Accept = 'application/json';
installVisitorToken();
installSession();

/*
 * Page pré-rendue (scripts/prerender.mjs) : son contenu reste affiché pendant que l'application
 * charge ses données, puis est remplacé d'un coup (pas d'écran de chargement intermédiaire, pas de
 * décalage de mise en page). Signal : première page dont les métadonnées sont prêtes (useSeo),
 * ou 6 secondes au plus.
 */
const container = document.getElementById('root');
// Application installée (PWA) : pas de référencement à servir, l'interface vivante s'affiche tout de suite.
const standalone = window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
if (standalone && container.firstElementChild) container.replaceChildren();
if (container.firstElementChild) {
  const snapshot = document.createElement('div');
  snapshot.id = 'prerendered';
  snapshot.append(...container.childNodes);
  container.before(snapshot);
  container.hidden = true;
  // Pas d'animation d'entrée sur la page déjà affichée (index.css) ; levé à la navigation (App.js).
  document.documentElement.setAttribute('data-hydrating', '');
  const reveal = () => {
    window.removeEventListener('fatafalta:page-ready', reveal);
    snapshot.remove();
    container.hidden = false;
  };
  window.addEventListener('fatafalta:page-ready', reveal);
  // Un toucher sur la copie statique ne doit jamais être perdu : l'interface vivante prend la main.
  snapshot.addEventListener('pointerdown', reveal, { once: true });
  setTimeout(reveal, 6000);
}

const root = ReactDOM.createRoot(container);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
