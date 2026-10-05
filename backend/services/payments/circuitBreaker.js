const securityConfig = require('../../config/security');
const log = require('./paymentLogger');

/**
 * Coupe-circuit par fournisseur. Après N pannes consécutives (réseau, délai, 5xx, 429), les
 * appels sont suspendus pendant `breakerOpenMs` : on répond tout de suite « service
 * momentanément indisponible » au lieu d'empiler des requêtes qui attendraient chacune le
 * délai réseau. Ensuite un seul appel d'essai est laissé passer : succès → circuit refermé.
 * Une erreur 4xx (requête refusée) n'est pas une panne et ne compte pas.
 */
class CircuitOpenError extends Error {
  constructor(provider, retryAfterMs) {
    super(`Circuit ouvert pour ${provider}`);
    this.name = 'CircuitOpenError';
    this.retriable = true;
    this.circuitOpen = true;
    this.retryAfterMs = retryAfterMs;
  }
}

const circuits = new Map();

const stateFor = (name) => {
  if (!circuits.has(name)) circuits.set(name, { failures: 0, openUntil: 0, trial: false });
  return circuits.get(name);
};

const isOutage = (error) => !error.httpStatus || error.retriable;

const run = async (providerName, operation, fn) => {
  const { breakerFailures, breakerOpenMs } = securityConfig.payments;
  if (!breakerFailures) return fn();

  const state = stateFor(providerName);
  const now = Date.now();
  if (state.openUntil > now || (state.openUntil && state.trial)) {
    throw new CircuitOpenError(providerName, Math.max(state.openUntil - now, 1000));
  }
  // Délai écoulé : cet appel est l'essai (les autres restent refusés pendant qu'il s'exécute).
  if (state.openUntil) state.trial = true;

  try {
    const result = await fn();
    if (state.failures || state.openUntil) log.info('provider.circuit_closed', { provider: providerName, reason: operation });
    state.failures = 0;
    state.openUntil = 0;
    state.trial = false;
    return result;
  } catch (error) {
    if (isOutage(error)) {
      state.failures += 1;
      if (state.trial || state.failures >= breakerFailures) {
        state.openUntil = Date.now() + breakerOpenMs;
        log.error('provider.circuit_open', { provider: providerName, reason: operation, status: `${state.failures} pannes`, durationMs: breakerOpenMs });
      }
    } else {
      state.failures = 0;
    }
    state.trial = false;
    throw error;
  }
};

const reset = () => circuits.clear();

module.exports = { run, reset, CircuitOpenError };
