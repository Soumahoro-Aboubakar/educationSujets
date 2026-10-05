const crypto = require('crypto');

/**
 * Journal de sécurité : une ligne JSON par événement (`scope: security`), filtrable par
 * `action`, `ip`, `userId` ou `requestId`. Liste blanche de champs : aucun mot de passe, token,
 * secret ou numéro de téléphone ne peut y figurer par erreur. Les emails sont pseudonymisés
 * (empreinte courte) : on peut corréler les tentatives sans stocker l'adresse en clair.
 */
const ALLOWED_FIELDS = [
  'requestId', 'ip', 'userId', 'emailHash', 'method', 'path', 'status', 'limiter', 'key', 'hits', 'limit',
  'retryAfter', 'reason', 'blockMs', 'strikes', 'count', 'userAgent', 'durationMs', 'requests', 'errors5xx',
  'rateLimited', 'authFailures', 'errorCode', 'paymentId',
];

const hashEmail = (email) => (email
  ? crypto.createHash('sha256').update(String(email).trim().toLowerCase()).digest('hex').slice(0, 12)
  : undefined);

const write = (level, action, fields = {}) => {
  if (process.env.NODE_ENV === 'test' && level !== 'error' && process.env.SECURITY_LOG_IN_TESTS !== 'true') return;

  const entry = { at: new Date().toISOString(), scope: 'security', level, action };
  for (const key of ALLOWED_FIELDS) {
    const value = fields[key];
    if (value === undefined || value === null) continue;
    // Chaînes tronquées : un User-Agent ou un chemin forgé ne doit pas gonfler les logs.
    entry[key] = typeof value === 'object' ? String(value).slice(0, 200) : typeof value === 'string' ? value.slice(0, 200) : value;
  }

  const line = JSON.stringify(entry);
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
};

module.exports = {
  hashEmail,
  info: (action, fields) => write('info', action, fields),
  warn: (action, fields) => write('warn', action, fields),
  error: (action, fields) => write('error', action, fields),
};
