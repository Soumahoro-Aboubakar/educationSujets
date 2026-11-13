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
  catalogue: (page = 1) => api.get('/api/prep/catalogue', { ...quiet, params: { page, limit: 100 }, timeout: 10000 }).then((r) => ({ data: data(r), pagination: r.data?.meta?.pagination || null })),
  /** Manifeste des contenus publiés : génération, révisions et empreintes (lot 3). */
  manifest: () => api.get('/api/prep/manifest', { ...quiet, timeout: 10000 }).then(data),
  /** Programme dans une révision publiée précise (pas de mélange si une publication arrive entre-temps). */
  programme: (code, revision) => api.get(`/api/prep/programmes/${encodeURIComponent(code)}`, { ...quiet, params: { revision }, timeout: 15000 }).then(data),
  /** Module publié (sans les clés des exercices notés) ; exige des droits de préparation. */
  module: (code, revision, version) => api.get(`/api/prep/modules/${encodeURIComponent(code)}`, { quietStatuses: [401, 403, 404], params: { revision, version }, headers: headers(), timeout: 20000 }).then(data),
  /** Index des vidéos publiées { modules: { CODE: { fr, en } }, concours: { CODE: { fr } } } (lecture seule). */
  videos: () => api.get('/api/prep/videos', { ...quiet, timeout: 10000 }).then(data),
  /** Progressions privées de l'identité (lecture seule, lot 5) ; `depuis` = curseur de la page précédente. */
  progressions: (depuis) => api.get('/api/prep/progressions', { quietStatuses: [401, 404], params: depuis ? { depuis } : {}, headers: headers(), timeout: 12000 }).then(data),
  sync: (actions) => api.post('/api/prep/sync', { actions }, { ...quiet, headers: headers(), timeout: 20000 }).then(data),
  reasoning: (exercice, body) => api.post(`/api/prep/exercices/${exercice}/raisonnement`, body, { headers: headers(), timeout: 9000 }).then(data),
  ranking: (programme, periode = 'tout', { signal, ...page } = {}) => api.get(`/api/prep/programmes/${programme}/classement`, { ...quiet, params: { ...page, periode }, signal, headers: headers(), timeout: 12000 }).then(data),
  searchCandidates: (programme, q, periode = 'tout', signal) => api.get(`/api/prep/programmes/${programme}/candidats`, { ...quiet, params: { q, periode }, signal, headers: headers(), timeout: 12000 }).then(data),
  candidate: (programme, identite, periode = 'tout', signal) => api.get(`/api/prep/programmes/${programme}/candidats/${identite}`, { ...quiet, params: { periode }, signal, headers: headers(), timeout: 12000 }).then(data),
  report: (body) => api.post('/api/prep/signalements', body, { headers: headers(), timeout: 10000 }).then(data),
  attach: () => api.post('/api/prep/rattachement', {}, { ...quiet, headers: headers(), timeout: 12000 }).then(data),
};

export default prepApi;
