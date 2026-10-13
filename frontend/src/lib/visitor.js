import axios from 'axios';

/*
 * Identifiant visiteur (sans compte) pour le quota de sujets récents. Le serveur le crée, le signe
 * et compte les téléchargements ; le navigateur ne fait que le renvoyer (X-Visitor-Token).
 * Sans stockage disponible, un nouvel identifiant est simplement créé par le serveur.
 */
const KEY = 'ff_visitor';

const read = () => {
  try { return localStorage.getItem(KEY); } catch { return null; }
};
const write = (value) => {
  try { localStorage.setItem(KEY, value); } catch { /* navigation privée : sans effet */ }
};

export const installVisitorToken = () => {
  axios.interceptors.request.use((config) => {
    const token = read();
    if (token) config.headers['X-Visitor-Token'] = token;
    return config;
  });
  const capture = (response) => {
    const token = response?.headers?.['x-visitor-token'] || response?.data?.data?.visitorToken;
    if (token && token !== read()) write(token);
  };
  axios.interceptors.response.use(
    (response) => { capture(response); return response; },
    (error) => { capture(error?.response); return Promise.reject(error); },
  );
};

/** Adresse d'API absolue (liens ouverts directement par le navigateur : archive ZIP, logos). */
export const apiUrl = (path) => (/^https?:\/\//.test(path) ? path : `${(axios.defaults.baseURL || '').replace(/\/$/, '')}${path}`);
