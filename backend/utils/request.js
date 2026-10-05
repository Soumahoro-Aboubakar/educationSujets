const parseCookies = (cookieHeader = '') => {
  if (!cookieHeader) {
    return {};
  }

  return cookieHeader.split(';').reduce((accumulator, item) => {
    const [rawKey, ...rawValue] = item.split('=');

    if (!rawKey) {
      return accumulator;
    }

    const key = rawKey.trim();
    const value = rawValue.join('=').trim();

    if (!key) {
      return accumulator;
    }

    accumulator[key] = decodeURIComponent(value || '');
    return accumulator;
  }, {});
};

const extractToken = (req) => {
  const authorization = req.headers.authorization || '';

  if (authorization.startsWith('Bearer ')) {
    return authorization.slice(7).trim();
  }

  const cookies = parseCookies(req.headers.cookie);
  return cookies.token || null;
};

/**
 * IP du client. `req.ip` tient compte de `trust proxy` (nombre de proxys de confiance) ;
 * l'en-tête CF-Connecting-IP n'est lu que si l'origine n'est joignable que via Cloudflare
 * (sinon n'importe qui pourrait le forger pour contourner les limites par IP).
 */
const clientIp = (req) => {
  // Chargé à la demande : utils/ ne dépend pas de la configuration au démarrage.
  const { trustCloudflareHeader } = require('../config/security').network;
  if (trustCloudflareHeader) {
    const cfIp = req.headers['cf-connecting-ip'];
    if (typeof cfIp === 'string' && cfIp.length <= 45) return cfIp.trim();
  }
  return req.ip || req.socket?.remoteAddress || 'unknown';
};

module.exports = {
  parseCookies,
  extractToken,
  clientIp,
};
