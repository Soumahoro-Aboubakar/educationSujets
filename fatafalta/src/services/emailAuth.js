import api from './api';
import { getErrorMessage } from '../utils/userMessages';

/*
 * Codes par e-mail : vérification d'adresse et mot de passe oublié.
 * Au plus 3 e-mails par adresse et par jour (tous types confondus), puis refus jusqu'au lendemain.
 */
export const emailAuth = {
  sendVerification: () => api.post('/api/auth/email/send-verification').then((r) => r.data.data),
  verify: (code) => api.post('/api/auth/email/verify', { code }).then((r) => r.data.data),
  quota: () => api.get('/api/auth/email/quota').then((r) => r.data.data),
  forgot: (email) => api.post('/api/auth/password/forgot', { email }).then((r) => r.data.data),
  reset: (email, code, password) => api.post('/api/auth/password/reset', { email, code, password }).then((r) => r.data),
};

const codeOf = (error) => error?.response?.data?.code;
export const isDailyLimit = (error) => codeOf(error) === 'EMAIL_DAILY_LIMIT';

/** Textes rédigés ici (aucune réponse brute du serveur n'est affichée). */
export const emailErrorMessage = (error, context = 'verification') => {
  switch (codeOf(error)) {
    case 'EMAIL_DAILY_LIMIT':
      return 'Tu as atteint la limite de 3 e-mails pour aujourd’hui. Réessaie demain.';
    case 'EMAIL_CODE_INVALID':
      return 'Code incorrect ou expiré. Vérifie-le ou demande un nouveau code.';
    case 'EMAIL_UNAVAILABLE':
      return 'L’envoi d’e-mails est momentanément indisponible. Réessaie dans quelques minutes.';
    default:
      if (error?.response?.status === 400 && context === 'reset') {
        return 'Vérifie le code à 6 chiffres et ton nouveau mot de passe (6 caractères au moins).';
      }
      return getErrorMessage(error, 'verification', 'tu');
  }
};

export const remainingLabel = (remaining) => {
  if (remaining === null || remaining === undefined) return null;
  if (remaining <= 0) return 'Plus d’envoi possible aujourd’hui';
  return remaining === 1 ? '1 envoi restant aujourd’hui' : `${remaining} envois restants aujourd’hui`;
};
