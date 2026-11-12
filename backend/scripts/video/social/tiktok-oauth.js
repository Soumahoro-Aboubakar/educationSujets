const crypto = require('node:crypto');
const { authorize } = require('./oauth');
const { request } = require('./http');
const { required } = require('./storage');
const { tiktokJson, SCOPES, BASE } = require('./tiktok');

function tiktokTokens(config, store, fetchImpl = fetch) {
  const check = (saved) => {
    if (!saved?.access_token || !saved.refresh_token || !saved.open_id
      || !SCOPES.every((scope) => String(saved.scope || '').split(',').includes(scope))) {
      throw new Error('Jetons/portées TikTok incomplets : reconnecter avec video.publish et video.upload.');
    }
    if (config.TIKTOK_OPEN_ID && saved.open_id !== config.TIKTOK_OPEN_ID) throw new Error('Compte TikTok différent de TIKTOK_OPEN_ID.');
  };
  async function exchange(body, previous = {}) {
    required(config, ['TIKTOK_CLIENT_KEY', 'TIKTOK_CLIENT_SECRET']);
    const data = await tiktokJson(await request(fetchImpl, `${BASE}/oauth/token/`, { method: 'POST',
      body: new URLSearchParams({ client_key: config.TIKTOK_CLIENT_KEY, client_secret: config.TIKTOK_CLIENT_SECRET, ...body }) }));
    if (!data.access_token || !data.refresh_token || !Number.isFinite(data.expires_in) || data.expires_in <= 0
      || !Number.isFinite(data.refresh_expires_in) || data.refresh_expires_in <= 0) throw new Error('Réponse de jetons TikTok incomplète : reconnexion requise.');
    const saved = { ...data, clientKey: config.TIKTOK_CLIENT_KEY, expiresAt: Date.now() + data.expires_in * 1000,
      refreshExpiresAt: Date.now() + data.refresh_expires_in * 1000 };
    if (previous.open_id && previous.open_id !== saved.open_id) throw new Error('Identité TikTok modifiée pendant le rafraîchissement.');
    check(saved); store.write('tiktok.json', saved); return saved.access_token;
  }
  async function access(force = false) {
    const saved = store.read('tiktok.json');
    if (!saved || saved.clientKey !== config.TIKTOK_CLIENT_KEY) throw new Error('Connexion TikTok requise : npm run video:login-tiktok.');
    check(saved);
    if (!force && saved.expiresAt > Date.now() + 60000) return saved.access_token;
    if (!(saved.refreshExpiresAt > Date.now())) throw new Error('Refresh token TikTok expiré : npm run video:login-tiktok.');
    return exchange({ grant_type: 'refresh_token', refresh_token: saved.refresh_token }, saved);
  }
  async function login(auth = authorize) {
    required(config, ['TIKTOK_CLIENT_KEY', 'TIKTOK_CLIENT_SECRET']);
    const redirect = new URL(config.TIKTOK_REDIRECT_URI || 'http://127.0.0.1:53684/callback/');
    if (redirect.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(redirect.hostname)
      || !redirect.port || redirect.search || redirect.hash || redirect.username || redirect.password) {
      throw new Error('TIKTOK_REDIRECT_URI : loopback HTTP avec port explicite, sans paramètres ni fragment requis.');
    }
    const verifier = crypto.randomBytes(32).toString('base64url');
    const grant = await auth({ endpoint: 'https://www.tiktok.com/v2/auth/authorize/', redirect: redirect.href, loopback: true,
      params: { client_key: config.TIKTOK_CLIENT_KEY, scope: SCOPES.join(','),
        // Login Kit Desktop exige SHA-256 en hexadécimal, contrairement au flux Google.
        code_challenge: crypto.createHash('sha256').update(verifier).digest('hex'), code_challenge_method: 'S256' } });
    return exchange({ grant_type: 'authorization_code', code: grant.code, redirect_uri: grant.redirect, code_verifier: verifier });
  }
  return { access, login, async identity() { await access(); return store.read('tiktok.json').open_id; } };
}
module.exports = { tiktokTokens };
