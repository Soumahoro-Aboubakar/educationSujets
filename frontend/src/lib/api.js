import axios from 'axios';

/**
 * Accès à l'API commune (mobile + web). Aucune règle métier ici : prix, droits et soldes
 * sont calculés par le serveur.
 */
const unwrap = (response) => response.data.data;
const unwrapList = (response) => ({
  data: response.data.data || [],
  pagination: response.data.meta?.pagination || response.data.pagination || null,
});

export const errorCode = (error) => error?.response?.data?.code || null;
export const errorMessage = (error, fallback = 'Une erreur est survenue. Réessayez dans un instant.') =>
  error?.response?.data?.error || fallback;

// Catalogue public (seules les branches menant à un sujet publié).
export const catalog = {
  organismes: (params) => axios.get('/api/catalog/organismes', { params }).then(unwrapList),
  parcoursTypes: (organismeId) => axios.get(`/api/organismes/${organismeId}/parcours-types`).then(unwrapList),
  noeuds: (params) => axios.get('/api/catalog/noeuds', { params }).then(unwrapList),
  matieres: (params) => axios.get('/api/catalog/matieres', { params }).then(unwrapList),
};

export const documents = {
  list: (params) => axios.get('/api/documents', { params }).then(unwrapList),
  get: (id) => axios.get(`/api/documents/${id}`).then(unwrap),
  downloadUrl: (id) => axios.get(`/api/documents/${id}/download`).then(unwrap),
};

// Téléchargements : quota de sujets récents (visiteur ou compte) et téléchargement groupé.
export const downloads = {
  quota: () => axios.get('/api/downloads/quota').then(unwrap),
  scope: (params) => axios.get('/api/downloads/scope', { params }).then(unwrap),
  preview: (documentIds) => axios.post('/api/downloads/preview', { documentIds }).then(unwrap),
  createBundle: (documentIds, delivery = 'zip') => axios.post('/api/downloads/bundles', { documentIds, delivery }).then(unwrap),
  yearIssues: () => axios.get('/api/downloads/admin/year-issues').then(unwrap),
};

// Administration des logos d'organismes (web uniquement).
export const organismeLogos = {
  setUrl: (organismeId, url) => axios.put(`/api/organismes/${organismeId}/logo`, { url }).then(unwrap),
  upload: (organismeId, file) => {
    const form = new FormData();
    form.append('file', file);
    return axios.put(`/api/organismes/${organismeId}/logo`, form).then(unwrap);
  },
  remove: (organismeId) => axios.delete(`/api/organismes/${organismeId}/logo`).then(unwrap),
};

export const account = {
  entitlements: () => axios.get('/api/me/entitlements').then(unwrap),
  subscription: () => axios.get('/api/me/subscription').then(unwrap),
  promoCode: () => axios.get('/api/me/promo-code').then(unwrap),
  wallet: () => axios.get('/api/me/wallet').then(unwrap),
  downloads: () => axios.get('/api/me/downloads').then(unwrap),
  withdraw: (payload) => axios.post('/api/me/withdrawals', payload).then(unwrap),
  cancelWithdrawal: (id) => axios.post(`/api/me/withdrawals/${id}/cancel`).then(unwrap),
  updateProfile: (payload) => axios.put('/api/me/profile', payload).then(unwrap),
  changePassword: (payload) => axios.put('/api/me/password', payload),
};

export const payments = {
  plans: () => axios.get('/api/payments/plans').then(unwrap),
  quote: (promoCode) => axios.post('/api/payments/quote', { promoCode: promoCode || undefined }).then(unwrap),
  initiate: (payload) => axios.post('/api/payments', payload).then(unwrap),
  get: (id) => axios.get(`/api/payments/${id}`).then(unwrap),
  cancel: (id) => axios.post(`/api/payments/${id}/cancel`).then(unwrap),
};
