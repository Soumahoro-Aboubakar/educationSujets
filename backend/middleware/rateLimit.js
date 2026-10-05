const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const securityConfig = require('../config/security');
const abuse = require('../services/security/abuseTracker');
const log = require('../services/security/securityLogger');
const { clientIp } = require('../utils/request');

/**
 * Fabrique de limiteurs. Chaque limiteur a son propre espace de compteurs et sa clé :
 *  - 'subject' : l'utilisateur connecté (jeton vérifié), sinon l'IP du visiteur ;
 *  - 'ip'      : l'IP (IPv6 regroupée par /56 : un attaquant ne change pas d'adresse à volonté) ;
 *  - fonction  : clé métier (ex. IP + email pour la connexion).
 * Un refus renvoie 429 + Retry-After, un corps d'erreur standard, et compte comme avertissement
 * dans le traceur d'abus (sanctions progressives).
 */
const LIMITED_MESSAGE = 'Trop de requêtes. Merci de patienter avant de réessayer.';

const ipKey = (req) => ipKeyGenerator(clientIp(req), 56);
const subjectId = (req) => (req.user?._id ? String(req.user._id) : req.auth?.userId || null);
const subjectKey = (req) => {
  const userId = subjectId(req);
  return userId ? `u:${userId}` : `ip:${ipKey(req)}`;
};

const retryAfterSeconds = (req) => {
  const resetTime = req.rateLimit?.resetTime;
  return resetTime ? Math.max(1, Math.ceil((new Date(resetTime).getTime() - Date.now()) / 1000)) : 60;
};

/** Réponse 429 commune (aussi utilisée par les blocages et plafonds hors express-rate-limit). */
const sendTooMany = (req, res, { message = LIMITED_MESSAGE, code = 'RATE_LIMITED', retryAfter = 60, details } = {}) => {
  res.setHeader('Retry-After', String(retryAfter));
  const payload = { success: false, error: message, code, retryAfter };
  if (details) payload.details = details;
  if (req.id) payload.requestId = req.id;
  return res.status(429).json(payload);
};

const createLimiter = ({
  name,
  rule,
  key = 'subject',
  max,
  message = LIMITED_MESSAGE,
  code = 'RATE_LIMITED',
  skip,
  skipSuccessfulRequests = false,
  requestWasSuccessful,
  strike = true,
}) => rateLimit({
  windowMs: rule.windowMs,
  limit: max || rule.max,
  standardHeaders: 'draft-6',
  legacyHeaders: false,
  // Les clés sont déjà normalisées ci-dessous (IPv6 incluse).
  validate: { keyGeneratorIpFallback: false },
  keyGenerator: (req) => {
    const base = typeof key === 'function' ? key(req) : key === 'ip' ? `ip:${ipKey(req)}` : subjectKey(req);
    return `${name}:${base}`;
  },
  skip: (req, res) => !securityConfig.enabled || req.method === 'OPTIONS' || (skip ? skip(req, res) : false),
  skipSuccessfulRequests,
  ...(requestWasSuccessful ? { requestWasSuccessful } : {}),
  handler: (req, res) => {
    const retryAfter = retryAfterSeconds(req);
    const ip = clientIp(req);
    const userId = subjectId(req);
    const hits = req.rateLimit?.used;
    const limit = req.rateLimit?.limit;
    if (strike) abuse.recordStrike({ ip, userId, reason: name, requestId: req.id });
    // Journal limité : premier dépassement de la fenêtre, puis un sur cent (pas d'inondation des logs).
    if (!limit || hits === limit + 1 || (hits - limit) % 100 === 0) {
      log.warn('rate_limit.blocked', {
        requestId: req.id, limiter: name, ip, userId, method: req.method, path: req.baseUrl + req.path,
        hits, limit, retryAfter, userAgent: req.get('user-agent'),
      });
    }
    sendTooMany(req, res, { message, code, retryAfter });
  },
});

// Clients sans navigateur ni application mobile : comportement typique d'un script.
// (L'application React Native envoie « okhttp/… » ou « CFNetwork … » : jamais visée ici.)
const SCRIPTED_UA = /^(curl|wget|python|go-http-client|java\/|libwww|httpie|scrapy|axios\/|node-fetch|undici|node$|php|ruby|perl|postmanruntime|insomnia|okhttp\/2\.)/i;
const isScriptedClient = (req) => {
  const ua = req.get('user-agent');
  return !ua || ua.length < 8 || SCRIPTED_UA.test(ua.trim());
};

const L = securityConfig.limits;
const normalizedEmail = (req) => String(req.body?.email || '').trim().toLowerCase().slice(0, 254);
// Une connexion réussie ou refusée pour une autre raison qu'un mot de passe faux ne compte pas.
const isNotCredentialFailure = (req, res) => res.statusCode !== 401;
const isSearchRequest = (req) => Boolean(req.query?.search || req.query?.recherche || req.query?.q);
const isRead = (req) => ['GET', 'HEAD'].includes(req.method);

const limiters = {
  // ── Global ──
  ipFlood: createLimiter({ name: 'ip-flood', rule: L.ipFlood, key: 'ip' }),
  general: createLimiter({
    name: 'general',
    rule: L.generalUser,
    max: (req) => (subjectId(req) ? L.generalUser.max : L.generalAnon.max),
  }),
  burst: createLimiter({
    name: 'burst',
    rule: L.burstUser,
    max: (req) => (subjectId(req) ? L.burstUser.max : L.burstAnon.max),
    message: 'Requêtes trop rapprochées. Ralentissez quelques secondes.',
  }),

  // ── Authentification ──
  loginIpEmail: createLimiter({
    name: 'login-ip-email',
    rule: L.loginFailuresIpEmail,
    key: (req) => `${ipKey(req)}|${normalizedEmail(req)}`,
    skipSuccessfulRequests: true,
    requestWasSuccessful: isNotCredentialFailure,
    message: 'Trop de tentatives de connexion. Réessayez plus tard.',
    code: 'LOGIN_RATE_LIMITED',
  }),
  loginIp: createLimiter({
    name: 'login-ip',
    rule: L.loginFailuresIp,
    key: 'ip',
    skipSuccessfulRequests: true,
    requestWasSuccessful: isNotCredentialFailure,
    message: 'Trop de tentatives de connexion. Réessayez plus tard.',
    code: 'LOGIN_RATE_LIMITED',
  }),
  loginEmail: createLimiter({
    name: 'login-email',
    rule: L.loginFailuresEmail,
    key: (req) => `email:${normalizedEmail(req)}`,
    skipSuccessfulRequests: true,
    requestWasSuccessful: isNotCredentialFailure,
    message: 'Trop de tentatives de connexion. Réessayez plus tard.',
    code: 'LOGIN_RATE_LIMITED',
    // Une attaque distribuée sur un compte n'est pas la faute de l'IP qui se présente.
    strike: false,
  }),
  register: createLimiter({
    name: 'register',
    rule: L.register,
    key: 'ip',
    max: (req) => (isScriptedClient(req) ? L.registerScripted.max : L.register.max),
    message: 'Trop de comptes créés depuis cette connexion. Réessayez plus tard.',
    code: 'REGISTER_RATE_LIMITED',
  }),
  refreshToken: createLimiter({ name: 'refresh', rule: L.refreshToken, key: 'ip' }),
  handoffCreate: createLimiter({ name: 'handoff-create', rule: L.handoffCreate }),
  handoffExchange: createLimiter({ name: 'handoff-exchange', rule: L.handoffExchange, key: 'ip' }),
  passwordChange: createLimiter({
    name: 'password-change',
    rule: L.passwordChange,
    message: 'Trop de tentatives de changement de mot de passe. Réessayez plus tard.',
  }),
  profileUpdate: createLimiter({ name: 'profile-update', rule: L.profileUpdate }),

  // ── Paiements ──
  paymentInitiateBurst: createLimiter({
    name: 'payment-burst',
    rule: L.paymentInitiateBurst,
    message: 'Plusieurs demandes de paiement rapprochées. Patientez une minute avant de réessayer.',
    code: 'PAYMENT_RATE_LIMITED',
  }),
  paymentInitiate: createLimiter({
    name: 'payment-initiate',
    rule: L.paymentInitiate,
    message: 'Trop de tentatives de paiement. Réessayez dans quelques minutes.',
    code: 'PAYMENT_RATE_LIMITED',
  }),
  paymentInitiateIp: createLimiter({
    name: 'payment-initiate-ip',
    rule: L.paymentInitiateIp,
    key: 'ip',
    message: 'Trop de tentatives de paiement depuis cette connexion. Réessayez dans quelques minutes.',
    code: 'PAYMENT_RATE_LIMITED',
  }),
  paymentQuote: createLimiter({ name: 'payment-quote', rule: L.paymentQuote, code: 'PAYMENT_RATE_LIMITED' }),
  paymentStatus: createLimiter({ name: 'payment-status', rule: L.paymentStatus }),
  paymentCancel: createLimiter({ name: 'payment-cancel', rule: L.paymentCancel }),
  // Le fournisseur n'est pas « averti » : un pic de webhooks légitimes ne doit pas le bloquer.
  webhook: createLimiter({ name: 'webhook', rule: L.webhook, key: 'ip', strike: false }),

  // ── Portefeuille ──
  withdrawalCreate: createLimiter({
    name: 'withdrawal-create',
    rule: L.withdrawalCreate,
    message: 'Trop de demandes de retrait. Réessayez plus tard.',
  }),
  withdrawalCancel: createLimiter({ name: 'withdrawal-cancel', rule: L.withdrawalCancel }),

  // ── Endpoints coûteux ──
  search: createLimiter({
    name: 'search',
    rule: L.search,
    message: 'Trop de recherches successives. Patientez quelques secondes.',
  }),
  // Recherche facultative (listes publiques) : seules les requêtes avec un texte sont comptées.
  searchWhenQuery: createLimiter({
    name: 'search-list',
    rule: L.search,
    skip: (req) => !isSearchRequest(req),
    message: 'Trop de recherches successives. Patientez quelques secondes.',
  }),
  download: createLimiter({ name: 'download', rule: L.download }),
  publicWrite: createLimiter({ name: 'public-write', rule: L.publicWrite }),

  // ── Administration ──
  admin: createLimiter({ name: 'admin', rule: L.admin }),
  adminWrite: createLimiter({ name: 'admin-write', rule: L.adminWrite, skip: isRead }),
  upload: createLimiter({ name: 'upload', rule: L.upload }),
};

module.exports = {
  ...limiters,
  createLimiter,
  sendTooMany,
  isScriptedClient,
  subjectId,
};
