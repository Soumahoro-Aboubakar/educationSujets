/**
 * Protection de l'API — SOURCE UNIQUE des limites (rate limiting, anti-abus, garde-fous).
 *
 * Principes :
 *  - un utilisateur connecté est limité par son identifiant, un visiteur par son adresse IP ;
 *  - les limites par IP sont volontairement larges : en Côte d'Ivoire, les opérateurs mobiles
 *    (CGNAT), les écoles et les cybercafés font partager une même IP à de nombreux utilisateurs ;
 *  - les routes sensibles (paiement, authentification, retraits) ont leurs propres limites,
 *    plus strictes, au lieu d'une limite globale identique partout ;
 *  - chaque valeur est surchargeable par variable d'environnement (SEC_<NOM>), sans redéploiement de code.
 *
 * Les compteurs sont en mémoire (une instance Node). Avec plusieurs instances, chaque instance
 * compte séparément : les limites effectives sont alors multipliées par le nombre d'instances
 * (voir backend/docs/SECURITE.md pour passer à un store partagé).
 */
const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

const num = (name, fallback) => {
  const parsed = Number.parseInt(process.env[`SEC_${name}`], 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

// `windowMs` : durée de la fenêtre ; `max` : requêtes autorisées dans la fenêtre.
const rule = (name, windowMs, max) => ({ windowMs, max: num(name, max) });

const security = {
  // Désactivation totale (diagnostic uniquement). Jamais en production.
  enabled: process.env.SEC_DISABLED !== 'true' || process.env.NODE_ENV === 'production',

  network: {
    // Nombre de proxys de confiance devant Node (Render/Railway : 1 ; Cloudflare + Render : 2).
    trustProxy: process.env.TRUST_PROXY ?? '1',
    // À activer UNIQUEMENT si l'origine n'accepte que le trafic de Cloudflare.
    trustCloudflareHeader: process.env.TRUST_CF_CONNECTING_IP === 'true',
    // Origines web autorisées (séparées par des virgules). Vide : comportement actuel conservé.
    corsOrigins: (process.env.CORS_ORIGINS || '').split(',').map((value) => value.trim()).filter(Boolean),
  },

  body: {
    // Aucune route JSON ne reçoit de fichier (les fichiers passent par multipart/multer).
    jsonLimit: process.env.SEC_JSON_LIMIT || '200kb',
    webhookLimit: '100kb',
    urlencodedParameterLimit: 100,
    // Chaîne de requête : profondeur et nombre de paramètres bornés (pas d'objets imbriqués géants).
    queryDepth: 3,
    queryParameterLimit: 60,
    queryArrayLimit: 30,
  },

  timeouts: {
    // Réponse 503 si une requête API dépasse ce délai (le travail en cours n'est pas interrompu).
    requestMs: num('REQUEST_TIMEOUT_MS', 30 * 1000),
    // Téléversements de documents (PDF volumineux, traitement d'images).
    uploadMs: num('UPLOAD_TIMEOUT_MS', 5 * MINUTE),
    // Serveur HTTP : en-têtes reçus en 20 s, requête complète en 6 min (slowloris).
    headersMs: 20 * 1000,
    serverRequestMs: 6 * MINUTE,
    keepAliveMs: 65 * 1000,
  },

  limits: {
    // ── Niveau global ──
    // Plafond par IP, tous comptes confondus : coupe un flood sans gêner une IP partagée.
    ipFlood: rule('IP_FLOOD_MAX', 5 * MINUTE, 3000),
    // Plafond général : par utilisateur connecté, ou par IP pour un visiteur.
    generalUser: rule('GENERAL_USER_MAX', 5 * MINUTE, 600),
    generalAnon: rule('GENERAL_ANON_MAX', 5 * MINUTE, 1500),
    // Rafales : un humain ne fait pas 60 appels en 10 s ; une IP partagée a plus de marge.
    burstUser: rule('BURST_USER_MAX', 10 * 1000, 60),
    burstAnon: rule('BURST_ANON_MAX', 10 * 1000, 150),

    // ── Authentification ──
    // Échecs de connexion par couple IP + email (brute force ciblé).
    loginFailuresIpEmail: rule('LOGIN_IP_EMAIL_MAX', 15 * MINUTE, 8),
    // Échecs par IP, tous emails confondus (une IP partagée tape parfois de mauvais mots de passe).
    loginFailuresIp: rule('LOGIN_IP_MAX', 15 * MINUTE, 60),
    // Échecs par email, toutes IP confondues (attaque distribuée sur un compte).
    loginFailuresEmail: rule('LOGIN_EMAIL_MAX', HOUR, 25),
    register: rule('REGISTER_MAX', HOUR, 20),
    // Client sans navigateur ni application (curl, python…) : création de comptes très limitée.
    registerScripted: rule('REGISTER_SCRIPTED_MAX', HOUR, 3),
    refreshToken: rule('REFRESH_MAX', 15 * MINUTE, 120),
    handoffCreate: rule('HANDOFF_CREATE_MAX', 10 * MINUTE, 10),
    handoffExchange: rule('HANDOFF_EXCHANGE_MAX', 15 * MINUTE, 30),
    passwordChange: rule('PASSWORD_CHANGE_MAX', 15 * MINUTE, 5),
    profileUpdate: rule('PROFILE_UPDATE_MAX', 15 * MINUTE, 20),

    // ── Paiements ──
    // Courte fenêtre : absorbe un double clic (même attemptId) mais pas un script.
    paymentInitiateBurst: rule('PAYMENT_BURST_MAX', MINUTE, 3),
    paymentInitiate: rule('PAYMENT_INITIATE_MAX', 15 * MINUTE, 8),
    // Par IP : plusieurs comptes derrière une même IP (anti multi-comptes).
    paymentInitiateIp: rule('PAYMENT_INITIATE_IP_MAX', 15 * MINUTE, 40),
    paymentQuote: rule('PAYMENT_QUOTE_MAX', 15 * MINUTE, 30),
    // Le web interroge l'état toutes les 2,5 s (24/min) pendant la validation.
    paymentStatus: rule('PAYMENT_STATUS_MAX', MINUTE, 90),
    paymentCancel: rule('PAYMENT_CANCEL_MAX', 5 * MINUTE, 10),
    webhook: rule('WEBHOOK_MAX', MINUTE, 300),

    // ── Portefeuille ──
    withdrawalCreate: rule('WITHDRAWAL_MAX', HOUR, 5),
    withdrawalCancel: rule('WITHDRAWAL_CANCEL_MAX', HOUR, 10),

    // ── Endpoints coûteux ──
    search: rule('SEARCH_MAX', MINUTE, 60),
    download: rule('DOWNLOAD_MAX', MINUTE, 40),
    publicWrite: rule('PUBLIC_WRITE_MAX', MINUTE, 120),

    // ── Administration (compte compromis, script) ──
    admin: rule('ADMIN_MAX', 5 * MINUTE, 400),
    adminWrite: rule('ADMIN_WRITE_MAX', 5 * MINUTE, 150),
    upload: rule('UPLOAD_MAX', 10 * MINUTE, 60),
  },

  // Plafonds de créations de paiements, comptés en base (persistants, toutes instances).
  payments: {
    maxPerHour: num('PAYMENT_MAX_PER_HOUR', 10),
    maxPerDay: num('PAYMENT_MAX_PER_DAY', 25),
    // Coupe-circuit fournisseur : N erreurs réseau/5xx consécutives → appels suspendus pendant `openMs`.
    breakerFailures: num('PAYMENT_BREAKER_FAILURES', 5),
    breakerOpenMs: num('PAYMENT_BREAKER_OPEN_MS', 30 * 1000),
  },

  // Sanctions progressives : chaque blocage par limite est un « avertissement ».
  abuse: {
    strikeWindowMs: 10 * MINUTE,
    // Avertissements avant blocage temporaire de l'IP / restriction du compte.
    ipStrikes: num('ABUSE_IP_STRIKES', 30),
    userStrikes: num('ABUSE_USER_STRIKES', 20),
    // Durée du premier blocage, doublée à chaque récidive, plafonnée.
    baseBlockMs: num('ABUSE_BLOCK_MS', 15 * MINUTE),
    maxBlockMs: num('ABUSE_MAX_BLOCK_MS', 4 * HOUR),
    // Credential stuffing : échecs de connexion sur N emails distincts depuis une IP.
    distinctEmailFailures: num('ABUSE_DISTINCT_EMAILS', 15),
    distinctEmailWindowMs: 15 * MINUTE,
    // Taille maximale des tables en mémoire (protège la RAM d'un flood d'IP aléatoires).
    maxTrackedKeys: 50000,
  },

  // Vérification humaine (Cloudflare Turnstile), demandée seulement en cas de comportement suspect.
  captcha: {
    secret: process.env.TURNSTILE_SECRET_KEY || '',
    // Échecs de connexion (IP + email) avant d'exiger la vérification.
    loginFailuresBeforeChallenge: num('CAPTCHA_AFTER_LOGIN_FAILURES', 3),
    verifyUrl: 'https://challenges.cloudflare.com/turnstile/v0/siteverify',
  },

  // Surveillance : une ligne d'alerte par minute si un seuil est dépassé.
  monitor: {
    intervalMs: MINUTE,
    requestsPerMinute: num('MONITOR_RPM', 3000),
    serverErrorsPerMinute: num('MONITOR_5XX', 20),
    rateLimitedPerMinute: num('MONITOR_429', 100),
    authFailuresPerMinute: num('MONITOR_AUTH_FAILURES', 50),
  },

  pagination: {
    maxLimit: 100,
    // Au-delà, `skip` devient coûteux : il faut affiner la recherche plutôt que paginer.
    maxPage: 500,
    // Mots de recherche pris en compte (chacun déclenche plusieurs requêtes de catalogue).
    maxSearchTokens: 5,
  },
};

module.exports = security;
