/**
 * Abonnement, code promotionnel et portefeuille.
 * Aucune règle métier ici : prix, droits et soldes viennent exclusivement du serveur.
 */
import api from './api';

const unwrap = (response) => response.data.data;

export const fetchEntitlements = () => api.get('/api/me/entitlements').then(unwrap);
export const fetchSubscription = () => api.get('/api/me/subscription').then(unwrap);
export const fetchPromoCode = () => api.get('/api/me/promo-code').then(unwrap);
export const fetchWallet = () => api.get('/api/me/wallet').then(unwrap);
export const fetchPlans = () => api.get('/api/payments/plans').then(unwrap);

export const requestWithdrawal = (payload) => api.post('/api/me/withdrawals', payload).then(unwrap);
export const cancelWithdrawal = (id) => api.post(`/api/me/withdrawals/${id}/cancel`).then(unwrap);

// Code de passage à usage unique : ouvre la souscription web déjà connecté.
export const createWebHandoff = () => api.post('/api/auth/handoff').then(unwrap);

/** Code d'erreur métier renvoyé par l'API (AUTH_REQUIRED, SUBSCRIPTION_REQUIRED…). */
export const getErrorCode = (error) => error?.response?.data?.code || null;
export const getErrorMessage = (error, fallback = 'Une erreur est survenue. Réessaie dans un instant.') =>
  error?.response?.data?.error || fallback;
