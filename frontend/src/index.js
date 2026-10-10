

import React from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios';
import './index.css';
import App from './App';
//https://educationsujets.onrender.com
// REACT_APP_API_URL permet de viser un backend local (ex. http://localhost:5000) ; production par défaut.//https://educationsujets.onrender.com
axios.defaults.baseURL = (process.env.REACT_APP_API_URL || 'https://educationsujets.onrender.com').replace(/\/$/, '');
axios.defaults.headers.common.Accept = 'application/json';

/*
 * Page pré-rendue (scripts/prerender.mjs) : son contenu reste affiché pendant que l'application
 * charge ses données, puis est remplacé d'un coup (pas d'écran de chargement intermédiaire, pas de
 * décalage de mise en page). Signal : première page dont les métadonnées sont prêtes (useSeo),
 * ou 6 secondes au plus.
 */
const container = document.getElementById('root');
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
  setTimeout(reveal, 6000);
}

const root = ReactDOM.createRoot(container);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
