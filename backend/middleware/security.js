const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const securityConfig = require('../config/security');
const abuse = require('../services/security/abuseTracker');
const log = require('../services/security/securityLogger');
const { extractToken, clientIp } = require('../utils/request');
const { sendTooMany, subjectId } = require('./rateLimit');

/** Identifiant de requête : renvoyé dans X-Request-Id et dans les erreurs, pour le support. */
const requestId = (req, res, next) => {
  const incoming = req.get('x-request-id');
  req.id = typeof incoming === 'string' && /^[A-Za-z0-9_-]{8,64}$/.test(incoming) ? incoming : crypto.randomUUID();
  res.setHeader('X-Request-Id', req.id);
  next();
};

/**
 * Identification légère pour les limites par utilisateur : signature du jeton vérifiée, sans
 * requête en base. Un jeton absent ou invalide laisse la requête anonyme (limitée par IP) ;
 * l'autorisation réelle reste faite par `protect`.
 */
const identify = (req, res, next) => {
  const token = extractToken(req);
  if (token && process.env.JWT_SECRET) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
      if (decoded?.id && decoded.typ !== 'refresh') req.auth = { userId: String(decoded.id) };
    } catch (error) {
      // Jeton expiré ou forgé : traité comme un visiteur.
    }
  }
  next();
};

/** IP temporairement bloquée (abus répétés) : refus immédiat, avant tout travail. */
const blockGuard = (req, res, next) => {
  if (!securityConfig.enabled) return next();
  // Les webhooks du fournisseur ne doivent jamais être bloqués (leur signature est vérifiée).
  if (req.path.startsWith('/payments/webhooks/')) return next();
  const blocked = abuse.isIpBlocked(clientIp(req));
  if (!blocked) return next();
  return sendTooMany(req, res, {
    message: 'Activité inhabituelle détectée depuis cette connexion. Accès temporairement suspendu.',
    code: 'IP_TEMPORARILY_BLOCKED',
    retryAfter: Math.max(1, Math.ceil(blocked.retryAfterMs / 1000)),
  });
};

/**
 * Compte restreint (abus répétés) : seules les opérations sensibles (paiement, retrait,
 * passage mobile → web) sont suspendues ; la consultation reste possible.
 */
const restrictSensitive = (req, res, next) => {
  if (!securityConfig.enabled) return next();
  const restricted = abuse.isUserRestricted(subjectId(req));
  if (!restricted) return next();
  return sendTooMany(req, res, {
    message: 'Activité inhabituelle détectée sur ce compte. Cette opération est temporairement suspendue.',
    code: 'ACCOUNT_TEMPORARILY_RESTRICTED',
    retryAfter: Math.max(1, Math.ceil(restricted.retryAfterMs / 1000)),
  });
};

// Clés dangereuses : opérateurs MongoDB injectés ({"email": {"$gt": ""}}) et pollution de prototype.
const FORBIDDEN_KEY = /^\$|^(__proto__|constructor|prototype)$/;
const MAX_DEPTH = 8;

const scrub = (value, depth = 0) => {
  if (!value || typeof value !== 'object') return 0;
  if (depth > MAX_DEPTH) return 0;
  let removed = 0;
  for (const key of Object.keys(value)) {
    if (FORBIDDEN_KEY.test(key)) {
      delete value[key];
      removed += 1;
    } else {
      removed += scrub(value[key], depth + 1);
    }
  }
  return removed;
};

/** Supprime les opérateurs MongoDB et clés de prototype du corps, de la query et des paramètres. */
const sanitizeInput = (req, res, next) => {
  const removed = scrub(req.body) + scrub(req.query) + scrub(req.params);
  if (removed) {
    log.warn('input.sanitized', {
      requestId: req.id, ip: clientIp(req), userId: subjectId(req), method: req.method, path: req.originalUrl.split('?')[0], count: removed,
    });
  }
  next();
};

/**
 * Délai maximal de réponse. Le client reçoit 503 au lieu d'attendre indéfiniment ; le travail
 * déjà lancé se termine en arrière-plan et sa réponse tardive est ignorée.
 */
const requestTimeout = (ms) => (req, res, next) => {
  if (!ms) return next();
  const timer = setTimeout(() => {
    if (res.headersSent) return;
    log.warn('request.timeout', {
      requestId: req.id, ip: clientIp(req), userId: subjectId(req), method: req.method, path: req.originalUrl.split('?')[0], durationMs: ms,
    });
    res.status(503).json({ success: false, error: 'Le serveur met trop de temps à répondre. Réessayez dans un instant.', code: 'REQUEST_TIMEOUT', requestId: req.id });
  }, ms);
  timer.unref?.();
  const clear = () => clearTimeout(timer);
  res.once('finish', clear);
  res.once('close', clear);
  next();
};

/** Délai par chemin : téléversements plus longs que les appels API ordinaires. */
const apiTimeout = (req, res, next) => {
  const isUpload = ['POST', 'PUT'].includes(req.method) && /multipart\/form-data/i.test(req.get('content-type') || '');
  return requestTimeout(isUpload ? securityConfig.timeouts.uploadMs : securityConfig.timeouts.requestMs)(req, res, next);
};

/**
 * Appels simultanés par utilisateur/IP sur un endpoint coûteux : au-delà de `max` requêtes en
 * cours, la suivante est refusée (un humain n'a jamais 4 recherches en parallèle).
 */
const limitConcurrency = ({ name, max }) => {
  const inFlight = new Map();
  return (req, res, next) => {
    if (!securityConfig.enabled) return next();
    const key = subjectId(req) ? `u:${subjectId(req)}` : `ip:${clientIp(req)}`;
    const current = inFlight.get(key) || 0;
    if (current >= max) {
      log.warn('concurrency.blocked', { requestId: req.id, limiter: name, ip: clientIp(req), userId: subjectId(req), limit: max });
      return sendTooMany(req, res, { message: 'Trop de requêtes simultanées. Patientez un instant.', code: 'TOO_MANY_CONCURRENT_REQUESTS', retryAfter: 2 });
    }
    inFlight.set(key, current + 1);
    let released = false;
    const release = () => {
      if (released) return;
      released = true;
      const left = (inFlight.get(key) || 1) - 1;
      if (left > 0) inFlight.set(key, left);
      else inFlight.delete(key);
    };
    res.once('finish', release);
    res.once('close', release);
    return next();
  };
};

/** Compte les réponses pour la surveillance ; journalise les erreurs serveur et refus d'accès. */
const requestMonitor = (req, res, next) => {
  const started = Date.now();
  res.once('finish', () => {
    abuse.countRequest(res.statusCode);
    if (res.statusCode === 403) {
      log.info('access.denied', {
        requestId: req.id, ip: clientIp(req), userId: subjectId(req), method: req.method, path: req.originalUrl.split('?')[0], status: 403,
      });
    }
    if (res.statusCode >= 500) {
      log.warn('request.server_error', {
        requestId: req.id, ip: clientIp(req), userId: subjectId(req), method: req.method, path: req.originalUrl.split('?')[0],
        status: res.statusCode, durationMs: Date.now() - started,
      });
    }
  });
  next();
};

/** Alerte par minute si le trafic, les erreurs, les refus ou les échecs de connexion explosent. */
const startSecurityMonitor = () => {
  const { intervalMs, requestsPerMinute, serverErrorsPerMinute, rateLimitedPerMinute, authFailuresPerMinute } = securityConfig.monitor;
  const timer = setInterval(() => {
    const stats = abuse.drainCounters();
    const spikes = [
      stats.requests > requestsPerMinute && 'requests',
      stats.errors5xx > serverErrorsPerMinute && 'server_errors',
      stats.rateLimited > rateLimitedPerMinute && 'rate_limited',
      stats.authFailures > authFailuresPerMinute && 'auth_failures',
    ].filter(Boolean);
    if (spikes.length) log.warn('traffic.spike', { reason: spikes.join(','), ...stats });
  }, intervalMs);
  timer.unref();
  return timer;
};

const notFound = (req, res) => {
  res.status(404).json({ success: false, error: 'Ressource introuvable', code: 'NOT_FOUND', requestId: req.id });
};

/**
 * Vérification humaine Cloudflare Turnstile. Désactivée (toujours vraie) tant que
 * TURNSTILE_SECRET_KEY n'est pas configurée. En cas de panne de Turnstile, on n'empêche pas
 * la connexion : les limites de débit continuent de protéger le compte.
 */
const verifyHumanChallenge = async (token, ip) => {
  const { secret, verifyUrl } = securityConfig.captcha;
  if (!secret) return true;
  if (typeof token !== 'string' || !token || token.length > 2048) return false;
  try {
    const response = await fetch(verifyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret, response: token, remoteip: ip }),
      signal: AbortSignal.timeout(5000),
    });
    const result = await response.json();
    return Boolean(result.success);
  } catch (error) {
    log.error('captcha.unavailable', { reason: error.name });
    return true;
  }
};

module.exports = {
  requestId,
  identify,
  blockGuard,
  restrictSensitive,
  sanitizeInput,
  requestTimeout,
  apiTimeout,
  limitConcurrency,
  requestMonitor,
  startSecurityMonitor,
  notFound,
  verifyHumanChallenge,
};
