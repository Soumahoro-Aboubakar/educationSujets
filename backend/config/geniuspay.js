/**
 * Configuration GeniusPay — lue exclusivement côté serveur.
 *
 * GeniusPay n'a qu'une seule URL d'API : c'est la paire de clés qui détermine l'environnement
 * (pk_sandbox_/sk_sandbox_ ou pk_live_/sk_live_). GENIUSPAY_ENV sert donc de garde-fou :
 * le serveur refuse de démarrer les paiements si les clés ne correspondent pas à
 * l'environnement déclaré, et ignore toute transaction ou tout webhook d'un autre environnement.
 *
 * Passer en production = changer GENIUSPAY_ENV et les secrets, rien d'autre.
 */
const ENVIRONMENTS = {
  // Valeur GENIUSPAY_ENV → valeur `environment` renvoyée par GeniusPay et préfixe des clés.
  sandbox: { apiEnvironment: 'sandbox', keyPrefix: 'sandbox' },
  production: { apiEnvironment: 'live', keyPrefix: 'live' },
};

const toInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const readConfig = (env = process.env) => {
  const name = (env.GENIUSPAY_ENV || 'sandbox').toLowerCase();
  return {
    env: name,
    ...(ENVIRONMENTS[name] || {}),
    baseUrl: (env.GENIUSPAY_BASE_URL || 'https://geniuspay.ci/api/v1/merchant').replace(/\/$/, ''),
    apiKey: env.GENIUSPAY_API_KEY || '',
    apiSecret: env.GENIUSPAY_API_SECRET || '',
    webhookSecret: env.GENIUSPAY_WEBHOOK_SECRET || '',
    timeoutMs: toInt(env.GENIUSPAY_TIMEOUT_MS, 15000),
    // Fenêtre anti-rejeu recommandée par GeniusPay : 5 minutes.
    webhookToleranceSeconds: toInt(env.GENIUSPAY_WEBHOOK_TOLERANCE_SECONDS, 300),
    // Pages de retour après paiement (purement informatives : seul le serveur valide un paiement).
    publicWebUrl: (env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, ''),
  };
};

/** Lève une erreur explicite (sans jamais afficher les clés) si la configuration est incohérente. */
const assertValidConfig = (config) => {
  if (!ENVIRONMENTS[config.env]) {
    throw new Error(`GENIUSPAY_ENV invalide : « ${config.env} » (attendu : sandbox ou production).`);
  }

  // Sans secret webhook, les webhooks sont refusés et la confirmation repose sur l'interrogation
  // de l'API (polling client + réconciliation serveur) : fiable, mais moins immédiat.
  const required = { GENIUSPAY_API_KEY: config.apiKey, GENIUSPAY_API_SECRET: config.apiSecret };
  const missing = Object.keys(required).filter((key) => !required[key]);
  if (missing.length) {
    throw new Error(`Configuration GeniusPay incomplète : ${missing.join(', ')} manquant(s).`);
  }

  // La documentation montre pk_/sk_, mais le tableau de bord délivre aussi sk_/ss_ : seul le
  // segment d'environnement est contrôlé. GeniusPay renvoie en outre `environment` sur chaque
  // transaction et webhook, vérifié à chaque fois par le provider.
  const keyEnvironment = (value) => (value.match(/^[a-z]{1,6}_(sandbox|live)_/i) || [])[1]?.toLowerCase();
  const wrongKeys = ['apiKey', 'apiSecret'].filter((field) => keyEnvironment(config[field]) !== config.keyPrefix);
  if (wrongKeys.length) {
    throw new Error(`Les clés GeniusPay ne correspondent pas à GENIUSPAY_ENV=${config.env} (clés « …_${config.keyPrefix}_… » attendues).`);
  }
};

/** Points de vigilance non bloquants (affichés au démarrage du provider). */
const configWarnings = (config) => {
  const warnings = [];
  if (!config.webhookSecret) {
    warnings.push('GENIUSPAY_WEBHOOK_SECRET absent : webhooks refusés, confirmation par interrogation de l’API.');
  }
  if (config.env === 'production' && !config.publicWebUrl.startsWith('https://')) {
    warnings.push(`FRONTEND_URL (${config.publicWebUrl}) n’est pas en https : pages de retour non sécurisées.`);
  }
  return warnings;
};

module.exports = { readConfig, assertValidConfig, configWarnings, ENVIRONMENTS };
