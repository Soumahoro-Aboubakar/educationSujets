/**
 * Journal des paiements : une ligne JSON par événement, retrouvable par `paymentId` ou
 * `reference` (ex. `grep MTX-A1B2C3 logs`). Liste blanche de champs : aucune clé, aucun
 * secret, aucune signature, aucun numéro de téléphone ne peut y figurer par erreur.
 */
const ALLOWED_FIELDS = [
  'paymentId', 'userId', 'reference', 'provider', 'environment', 'method', 'amount', 'currency',
  'status', 'providerStatus', 'from', 'to', 'event', 'eventId', 'httpStatus', 'errorCode', 'reason', 'durationMs',
];

const write = (level, action, fields = {}) => {
  if (process.env.NODE_ENV === 'test' && level !== 'error') return;

  const entry = { at: new Date().toISOString(), scope: 'payments', level, action };
  for (const key of ALLOWED_FIELDS) {
    const value = fields[key];
    if (value !== undefined && value !== null) entry[key] = typeof value === 'object' ? String(value) : value;
  }

  const line = JSON.stringify(entry);
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
};

module.exports = {
  info: (action, fields) => write('info', action, fields),
  warn: (action, fields) => write('warn', action, fields),
  error: (action, fields) => write('error', action, fields),
};
