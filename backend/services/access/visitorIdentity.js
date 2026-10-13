const crypto = require('crypto');
const { parseCookies } = require('../../utils/request');

/*
 * Identifiant des visiteurs sans compte, pour leur quota de sujets récents.
 *
 * Jeton « v1.<id>.<signature> » signé HMAC par le serveur : un client ne peut pas en fabriquer
 * un valide, seulement réutiliser celui reçu. Transport : en-tête X-Visitor-Token (le site et
 * l'API sont sur des domaines différents, un cookie tiers serait souvent bloqué) ou cookie ff_vid.
 * Le site le garde en localStorage, le mobile en SecureStore : ce n'est qu'un identifiant,
 * les compteurs restent sur le serveur.
 *
 * Limite assumée : effacer ce jeton donne un nouvel identifiant. D'où le second quota par
 * adresse IP (billing.downloads.anonymousIpLimit), volontairement large car une IP est souvent
 * partagée (réseau mobile, cybercafé, établissement). Un compte gratuit reste la voie fiable.
 */

const HEADER = 'x-visitor-token';
const COOKIE = 'ff_vid';
const RESPONSE_HEADER = 'X-Visitor-Token';

const secret = () => process.env.VISITOR_TOKEN_SECRET || process.env.JWT_SECRET || 'fatafalta-dev-visitor';

const sign = (visitorId) => crypto.createHmac('sha256', secret()).update(`visitor:${visitorId}`).digest('base64url').slice(0, 22);

const issueVisitorToken = () => {
  const visitorId = crypto.randomBytes(16).toString('base64url');
  return { visitorId, token: `v1.${visitorId}.${sign(visitorId)}` };
};

/** Identifiant contenu dans un jeton valide, sinon null. */
const verifyVisitorToken = (token) => {
  if (typeof token !== 'string' || token.length > 80) return null;
  const [version, visitorId, signature] = token.split('.');
  if (version !== 'v1' || !/^[A-Za-z0-9_-]{16,32}$/.test(visitorId || '') || !signature) return null;
  const expected = sign(visitorId);
  if (signature.length !== expected.length) return null;
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected)) ? visitorId : null;
};

const readVisitorToken = (req) => req.headers[HEADER] || parseCookies(req.headers.cookie)[COOKIE] || null;

/**
 * Identifiant du visiteur de la requête. Avec `mint`, en crée un s'il manque ou est invalide
 * et le renvoie au client (en-tête + cookie) pour les requêtes suivantes.
 */
const resolveVisitor = (req, res, { mint = false } = {}) => {
  const existing = verifyVisitorToken(readVisitorToken(req));
  if (existing || !mint) return existing;

  const { visitorId, token } = issueVisitorToken();
  if (res && !res.headersSent) {
    res.setHeader(RESPONSE_HEADER, token);
    res.cookie?.(COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 365 * 24 * 60 * 60 * 1000,
    });
  }
  if (res?.locals) res.locals.visitorToken = token;
  return visitorId;
};

module.exports = {
  RESPONSE_HEADER,
  issueVisitorToken,
  verifyVisitorToken,
  resolveVisitor,
};
