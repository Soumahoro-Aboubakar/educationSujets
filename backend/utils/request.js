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

module.exports = {
  parseCookies,
  extractToken,
};
