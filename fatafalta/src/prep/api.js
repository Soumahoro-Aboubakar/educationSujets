import api from '../services/api';

/**
 * Client de l'API de préparation (§ 29). Le jeton d'identité appareil est passé en en-tête
 * X-Prep-Token ; le jeton de compte (si connecté) est ajouté par l'instance axios commune.
 * Toute erreur réseau est propagée : l'appelant bascule alors sur le contenu embarqué.
 */
let prepToken = null;
export const setPrepToken = (token) => { prepToken = token || null; };

const headers = () => (prepToken ? { 'X-Prep-Token': prepToken } : {});
// Un 404 signifie que le service de préparation n'est pas (encore) déployé sur ce serveur :
// l'appelant bascule sur le contenu embarqué, inutile de le journaliser comme une erreur.
const quiet = { quietStatuses: [404] };
const data = (response) => response.data?.data;

/** Vrai si l'erreur signifie « service de préparation indisponible sur ce serveur » (et non hors ligne). */
export const isServiceMissing = (error) => error?.response?.status === 404;

export const prepApi = {
  declare: (identifiants) => api.post('/api/prep/appareils', identifiants, { ...quiet, timeout: 12000 }).then(data),
  rights: () => api.get('/api/prep/droits', { ...quiet, headers: headers(), timeout: 10000 }).then(data),
  catalogue: () => api.get('/api/prep/catalogue', { ...quiet, timeout: 10000 }).then(data),
  /** Index des vidéos publiées { modules: { CODE: { fr, en } }, concours: { CODE: { fr } } } (lecture seule). */
  videos: () => api.get('/api/prep/videos', { ...quiet, timeout: 10000 }).then(data),
  sync: (actions) => api.post('/api/prep/sync', { actions }, { ...quiet, headers: headers(), timeout: 20000 }).then(data),
  reasoning: (exercice, body) => api.post(`/api/prep/exercices/${exercice}/raisonnement`, body, { headers: headers(), timeout: 9000 }).then(data),
  ranking: (programme, periode = 'tout', { signal, ...page } = {}) => api.get(`/api/prep/programmes/${programme}/classement`, { ...quiet, params: { ...page, periode }, signal, headers: headers(), timeout: 12000 }).then(data),
  searchCandidates: (programme, q, periode = 'tout', signal) => api.get(`/api/prep/programmes/${programme}/candidats`, { ...quiet, params: { q, periode }, signal, headers: headers(), timeout: 12000 }).then(data),
  candidate: (programme, identite, periode = 'tout', signal) => api.get(`/api/prep/programmes/${programme}/candidats/${identite}`, { ...quiet, params: { periode }, signal, headers: headers(), timeout: 12000 }).then(data),
  report: (body) => api.post('/api/prep/signalements', body, { headers: headers(), timeout: 10000 }).then(data),
  attach: () => api.post('/api/prep/rattachement', {}, { ...quiet, headers: headers(), timeout: 12000 }).then(data),
};

export default prepApi;
