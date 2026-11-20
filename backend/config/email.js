/*
 * Envoi d'e-mails (codes de vérification, mot de passe oublié).
 * Fournisseurs essayés dans l'ordre ; si l'un ne répond pas (panne, délai, quota atteint, clé
 * refusée), le suivant prend le relais. Un fournisseur sans clé est simplement ignoré.
 *
 *   EMAIL_PROVIDERS        ordre (défaut : brevo,mailjet,resend)
 *   BREVO_API_KEY          clé API Brevo (v3)
 *   MAILJET_API_KEY        clé API Mailjet   + MAILJET_SECRET_KEY
 *   RESEND_API_KEY         clé API Resend
 *   EMAIL_FROM_ADDRESS     expéditeur (sinon BREVO_SENDER_EMAIL, MAILJET_SENDER_EMAIL ou RESEND_FROM_EMAIL, sinon no-reply@fatafalta.com) ;
 *                          domaine à authentifier chez chaque fournisseur
 *   EMAIL_FROM_NAME        nom affiché (sinon BREVO_SENDER_NAME, MAILJET_SENDER_NAME ou RESEND_FROM_NAME, sinon Fatafalta)
 *   EMAIL_DAILY_LIMIT      e-mails par adresse et par jour (défaut : 3)
 *   EMAIL_TRANSPORT=console  développement uniquement : le code est écrit dans le journal, rien n'est envoyé
 */
const toInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const config = () => ({
  order: (process.env.EMAIL_PROVIDERS || 'brevo,mailjet,resend').split(',').map((name) => name.trim().toLowerCase()).filter(Boolean),
  keys: {
    brevo: process.env.BREVO_API_KEY || '',
    mailjet: process.env.MAILJET_API_KEY && process.env.MAILJET_SECRET_KEY
      ? { key: process.env.MAILJET_API_KEY, secret: process.env.MAILJET_SECRET_KEY } : null,
    resend: process.env.RESEND_API_KEY || '',
  },
  from: {
    address: process.env.EMAIL_FROM_ADDRESS || process.env.BREVO_SENDER_EMAIL || process.env.MAILJET_SENDER_EMAIL || process.env.RESEND_FROM_EMAIL || 'no-reply@fatafalta.com',
    name: process.env.EMAIL_FROM_NAME || process.env.BREVO_SENDER_NAME || process.env.MAILJET_SENDER_NAME || process.env.RESEND_FROM_NAME || 'Fatafalta',
  },
  dailyLimit: toInt(process.env.EMAIL_DAILY_LIMIT, 3),
  console: process.env.EMAIL_TRANSPORT === 'console',
  timeoutMs: toInt(process.env.EMAIL_TIMEOUT_MS, 8000),
  codeTtlMinutes: 15,
  maxAttempts: 5,
});

module.exports = config;
