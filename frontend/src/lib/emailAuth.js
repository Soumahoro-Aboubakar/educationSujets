import axios from 'axios';

/* Codes par e-mail : vérification d'adresse et mot de passe oublié (3 e-mails par adresse et par jour). */
export const emailAuth = {
  sendVerification: () => axios.post('/api/auth/email/send-verification').then((r) => r.data.data),
  verify: (code) => axios.post('/api/auth/email/verify', { code }).then((r) => r.data.data),
  quota: () => axios.get('/api/auth/email/quota').then((r) => r.data.data),
  forgot: (email) => axios.post('/api/auth/password/forgot', { email }).then((r) => r.data),
  reset: (email, code, password) => axios.post('/api/auth/password/reset', { email, code, password }).then((r) => r.data),
};

/** Erreur lisible : limite du jour, code invalide, service indisponible… */
export const emailErrorMessage = (error) => {
  const data = error?.response?.data;
  const details = data?.details;
  if (Array.isArray(details) && details[0]?.message) return details[0].message;
  return data?.error || 'Connexion impossible. Vérifiez votre réseau et réessayez.';
};
export const isDailyLimit = (error) => /EMAIL_DAILY_LIMIT/.test(JSON.stringify(error?.response?.data || {}));
