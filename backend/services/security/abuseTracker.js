const securityConfig = require('../../config/security');
const log = require('./securityLogger');

/**
 * Suivi des comportements abusifs, en mémoire, avec sanctions progressives :
 *  1. chaque requête refusée par une limite compte comme un « avertissement » (strike) ;
 *  2. trop d'avertissements dans la fenêtre → IP bloquée temporairement, ou compte restreint
 *     (opérations sensibles uniquement : le compte peut toujours consulter son espace) ;
 *  3. chaque récidive double la durée, dans la limite de `maxBlockMs`, et l'historique
 *     s'efface au bout de 24 h : un incident isolé ne pénalise pas durablement.
 * Un administrateur peut lever un blocage (GET/DELETE /api/admin/security/...).
 */
const DAY_MS = 24 * 60 * 60 * 1000;

/** Table clé → valeur avec expiration et taille bornée (protège la mémoire d'un flood). */
class TtlMap {
  constructor(maxKeys) {
    this.maxKeys = maxKeys;
    this.map = new Map();
  }

  get(key) {
    const entry = this.map.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= Date.now()) {
      this.map.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key, value, ttlMs) {
    this.map.delete(key);
    this.map.set(key, { value, expiresAt: Date.now() + ttlMs });
    if (this.map.size > this.maxKeys) this.prune();
  }

  delete(key) {
    return this.map.delete(key);
  }

  prune() {
    const now = Date.now();
    for (const [key, entry] of this.map) {
      if (entry.expiresAt <= now) this.map.delete(key);
    }
    // Toujours trop grand : on évince les entrées les plus anciennes (ordre d'insertion).
    const excess = this.map.size - this.maxKeys;
    if (excess > 0) {
      let removed = 0;
      for (const key of this.map.keys()) {
        if (removed >= excess) break;
        this.map.delete(key);
        removed += 1;
      }
    }
  }

  entries() {
    const now = Date.now();
    return [...this.map.entries()]
      .filter(([, entry]) => entry.expiresAt > now)
      .map(([key, entry]) => ({ key, value: entry.value, expiresAt: entry.expiresAt }));
  }

  clear() {
    this.map.clear();
  }
}

const cfg = () => securityConfig.abuse;
const strikes = new TtlMap(cfg().maxTrackedKeys);
const blocks = new TtlMap(cfg().maxTrackedKeys);
const offenses = new TtlMap(cfg().maxTrackedKeys);
const loginFailures = new TtlMap(cfg().maxTrackedKeys);
const failedEmailsByIp = new TtlMap(cfg().maxTrackedKeys);

// Compteurs agrégés lus et remis à zéro chaque minute par le moniteur.
const counters = { requests: 0, errors5xx: 0, rateLimited: 0, authFailures: 0 };

const subjectKey = (type, value) => `${type}:${value}`;

const block = (type, value, reason, context = {}) => {
  const key = subjectKey(type, value);
  const previous = offenses.get(key) || 0;
  const blockMs = Math.min(cfg().baseBlockMs * 2 ** previous, cfg().maxBlockMs);
  offenses.set(key, previous + 1, DAY_MS);
  blocks.set(key, { reason, until: Date.now() + blockMs, since: Date.now() }, blockMs);
  strikes.delete(key);
  log.warn(type === 'ip' ? 'abuse.ip_blocked' : 'abuse.user_restricted', {
    ...context,
    [type === 'ip' ? 'ip' : 'userId']: value,
    reason,
    blockMs,
    count: previous + 1,
  });
  return blockMs;
};

const addStrike = (type, value, threshold, reason, context) => {
  if (!value || !threshold) return;
  const key = subjectKey(type, value);
  if (blocks.get(key)) return;
  const count = (strikes.get(key) || 0) + 1;
  strikes.set(key, count, cfg().strikeWindowMs);
  if (count >= threshold) block(type, value, reason, context);
};

/** Une requête a été refusée par une limite : avertissement pour l'IP et pour le compte. */
const recordStrike = ({ ip, userId, reason, requestId }) => {
  counters.rateLimited += 1;
  addStrike('ip', ip, cfg().ipStrikes, `repeated_limits:${reason}`, { requestId });
  if (userId) addStrike('user', String(userId), cfg().userStrikes, `repeated_limits:${reason}`, { requestId });
};

const describeBlock = (type, value) => {
  if (!value) return null;
  const entry = blocks.get(subjectKey(type, value));
  if (!entry) return null;
  return { reason: entry.reason, retryAfterMs: Math.max(entry.until - Date.now(), 0) };
};

const isIpBlocked = (ip) => describeBlock('ip', ip);
const isUserRestricted = (userId) => describeBlock('user', userId && String(userId));

const loginKey = (ip, email) => `${ip}|${String(email || '').trim().toLowerCase()}`;

/**
 * Échec de connexion. Compte les emails distincts essayés depuis l'IP : au-delà du seuil
 * (credential stuffing), l'IP est bloquée. Renvoie le nombre d'échecs pour ce couple IP + email.
 */
const recordLoginFailure = ({ ip, email, requestId }) => {
  counters.authFailures += 1;
  const key = loginKey(ip, email);
  const count = (loginFailures.get(key) || 0) + 1;
  loginFailures.set(key, count, securityConfig.limits.loginFailuresIpEmail.windowMs);

  const normalized = String(email || '').trim().toLowerCase();
  const emails = failedEmailsByIp.get(ip) || new Set();
  emails.add(normalized);
  failedEmailsByIp.set(ip, emails, cfg().distinctEmailWindowMs);

  if (emails.size >= cfg().distinctEmailFailures && !blocks.get(subjectKey('ip', ip))) {
    block('ip', ip, 'credential_stuffing', { requestId, count: emails.size });
    failedEmailsByIp.delete(ip);
  }
  return count;
};

const loginFailureCount = (ip, email) => loginFailures.get(loginKey(ip, email)) || 0;
const clearLoginFailures = (ip, email) => loginFailures.delete(loginKey(ip, email));

const countRequest = (statusCode) => {
  counters.requests += 1;
  if (statusCode >= 500) counters.errors5xx += 1;
};

const drainCounters = () => {
  const snapshot = { ...counters };
  Object.keys(counters).forEach((key) => { counters[key] = 0; });
  return snapshot;
};

/** Vue d'administration : blocages actifs et sujets proches du seuil. */
const snapshot = () => ({
  blocks: blocks.entries().map(({ key, value }) => {
    const [type, ...rest] = key.split(':');
    return { type, value: rest.join(':'), reason: value.reason, since: new Date(value.since), until: new Date(value.until) };
  }),
  watchlist: strikes.entries()
    .map(({ key, value }) => {
      const [type, ...rest] = key.split(':');
      return { type, value: rest.join(':'), strikes: value };
    })
    .sort((a, b) => b.strikes - a.strikes)
    .slice(0, 50),
});

const unblock = (type, value) => {
  const key = subjectKey(type, value);
  const removed = blocks.delete(key);
  strikes.delete(key);
  offenses.delete(key);
  return removed;
};

const reset = () => {
  [strikes, blocks, offenses, loginFailures, failedEmailsByIp].forEach((map) => map.clear());
  drainCounters();
};

module.exports = {
  TtlMap,
  recordStrike,
  isIpBlocked,
  isUserRestricted,
  recordLoginFailure,
  loginFailureCount,
  clearLoginFailures,
  countRequest,
  drainCounters,
  snapshot,
  unblock,
  reset,
};
