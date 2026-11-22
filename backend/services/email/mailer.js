const emailConfig = require('../../config/email');
const factories = require('./providers');
const AppError = require('../../utils/errors');
const securityLog = require('../security/securityLogger');

/*
 * Envoi avec bascule : Brevo, puis Mailjet, puis Resend (ordre réglable). Le premier qui accepte
 * le message l'emporte ; une panne, un délai dépassé, un quota atteint ou une clé refusée font
 * passer au suivant. Aucune adresse n'est écrite dans les journaux (empreinte seulement).
 */
const emailHash = (email) => securityLog.hashEmail(String(email).toLowerCase());

const RETRY_DELAY_MS = 1500;

// Remplaçable dans les tests (fournisseurs simulés).
let overrideProviders = null;
const setProvidersForTests = (providers) => { overrideProviders = providers; };

const activeProviders = () => {
  if (overrideProviders) return overrideProviders;
  const config = emailConfig();
  return config.order
    .filter((name) => factories[name] && config.keys[name])
    .map((name) => ({ name, send: factories[name]({ key: config.keys[name], from: config.from, timeoutMs: config.timeoutMs }) }));
};

/** @returns {Promise<{ provider: string }>} ; AppError 503 si aucun fournisseur n'a accepté. */
const sendEmail = async (message) => {
  const config = emailConfig();
  if (config.console && !overrideProviders) {
    if (process.env.NODE_ENV === 'production') throw new AppError('EMAIL_TRANSPORT=console est interdit en production', 500);
    console.info(`[EMAIL:console] à ${message.to.email} — ${message.subject}\n${message.text}`);
    return { provider: 'console' };
  }
  const providers = activeProviders();
  if (!providers.length) {
    throw new AppError('Envoi d’e-mails indisponible pour le moment. Réessayez plus tard.', 503, undefined, 'EMAIL_UNAVAILABLE');
  }
  // Coupure réseau brève (Wi-Fi, DNS) : tous échouent sans réponse. Une seconde tournée, 1,5 s plus
  // tard, rattrape ce cas ; un refus du fournisseur (statut HTTP) ou un délai dépassé n'est pas rejoué.
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    let networkOnly = true;
    for (const provider of providers) {
      try {
        // eslint-disable-next-line no-await-in-loop
        await provider.send(message);
        securityLog.info('email.sent', { provider: provider.name, attempt, emailHash: emailHash(message.to.email) });
        return { provider: provider.name };
      } catch (error) {
        const timeout = error.name === 'TimeoutError';
        if (error.status || timeout) networkOnly = false;
        securityLog.warn('email.provider_failed', { provider: provider.name, attempt, status: error.status || null, reason: timeout ? 'timeout' : (error.cause?.code || error.message) });
      }
    }
    if (!networkOnly || attempt === 2) break;
    // eslint-disable-next-line no-await-in-loop
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
  }
  throw new AppError('Envoi d’e-mails indisponible pour le moment. Réessayez dans quelques minutes.', 503, undefined, 'EMAIL_UNAVAILABLE');
};

module.exports = { sendEmail, setProvidersForTests, emailHash };
