const crypto = require('node:crypto');
const http = require('node:http');
const { spawn } = require('node:child_process');
const readline = require('node:readline/promises');
const { request, json } = require('./http');
const { required } = require('./storage');

const GOOGLE_TOKEN = 'https://oauth2.googleapis.com/token';
const GOOGLE_SCOPE = 'https://www.googleapis.com/auth/youtube';
const random = () => crypto.randomBytes(32).toString('base64url');
function openBrowser(url) {
  const [cmd, args] = process.platform === 'darwin' ? ['open', [url]]
    : process.platform === 'win32' ? ['rundll32', ['url.dll,FileProtocolHandler', url]] : ['xdg-open', [url]];
  const child = spawn(cmd, args, { stdio: 'ignore' });
  child.on('error', () => {}); child.unref();
}
function extractCode(value, redirect, state) {
  const url = new URL(value);
  const expected = new URL(redirect);
  if (url.origin !== expected.origin || url.pathname !== expected.pathname || url.searchParams.get('state') !== state) {
    throw new Error('Retour OAuth invalide (adresse ou state).');
  }
  if (url.searchParams.has('error') || !url.searchParams.get('code')) throw new Error('Autorisation refusée ou code absent.');
  return url.searchParams.get('code');
}

async function authorize({ endpoint, params, redirect, loopback = false, output = console.log }) {
  const state = random();
  let server;
  let timer;
  let result;
  let callback;
  if (loopback) {
    const uri = new URL(redirect || 'http://127.0.0.1:0/callback');
    if (uri.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(uri.hostname)) throw new Error('Redirection loopback HTTP requise.');
    server = http.createServer();
    await new Promise((resolve, reject) => { server.once('error', reject); server.listen(Number(uri.port) || 0, '127.0.0.1', resolve); });
    uri.port = String(server.address().port); redirect = uri.href;
    result = new Promise((resolve, reject) => {
      timer = setTimeout(() => reject(new Error('Connexion OAuth expirée après 5 minutes.')), 300000);
      callback = (req, res) => {
        const url = new URL(req.url, redirect);
        if (url.pathname !== uri.pathname) { res.writeHead(404).end(); return; }
        if (url.searchParams.get('state') !== state) { res.writeHead(400).end('state invalide'); return; }
        try { const code = extractCode(url.href, redirect, state); res.end('Connexion reçue. Vous pouvez fermer cette fenêtre.'); resolve(code); }
        catch (error) { res.writeHead(400).end('Autorisation refusée.'); reject(error); }
      };
      server.on('request', callback);
    });
  }
  const url = `${endpoint}?${new URLSearchParams({ ...params, redirect_uri: redirect, state, response_type: 'code' })}`;
  output(`Autorisation : ${url}`); openBrowser(url);
  try {
    if (!loopback) {
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      try { result = extractCode(await rl.question('Coller l’URL complète de retour OAuth : '), redirect, state); }
      finally { rl.close(); }
    }
    return { code: await result, redirect };
  } finally {
    clearTimeout(timer);
    if (server) { server.close(); server.closeAllConnections?.(); }
  }
}

function youtubeTokens(config, store, fetchImpl = fetch) {
  async function exchange(body, previous = {}) {
    const data = await json(await request(fetchImpl, GOOGLE_TOKEN, { method: 'POST', body: new URLSearchParams(body) }), 'OAuth YouTube');
    if (!data.access_token || !(data.refresh_token || previous.refresh_token)) throw new Error('Jeton YouTube incomplet : relancer login-youtube.');
    const saved = { ...previous, ...data, clientId: config.YOUTUBE_CLIENT_ID, expiresAt: Date.now() + Number(data.expires_in || 3600) * 1000 };
    store.write('youtube.json', saved); return saved.access_token;
  }
  async function access(force = false) {
    const saved = store.read('youtube.json');
    if (!saved?.refresh_token || saved.clientId !== config.YOUTUBE_CLIENT_ID) throw new Error('Connexion YouTube requise : npm run video:login-youtube.');
    if (!force && saved.access_token && saved.expiresAt > Date.now() + 60000) return saved.access_token;
    return exchange({ client_id: config.YOUTUBE_CLIENT_ID, client_secret: config.YOUTUBE_CLIENT_SECRET,
      grant_type: 'refresh_token', refresh_token: saved.refresh_token }, saved);
  }
  async function login(auth = authorize) {
    required(config, ['YOUTUBE_CLIENT_ID', 'YOUTUBE_CLIENT_SECRET']);
    const verifier = random();
    const { code, redirect } = await auth({ endpoint: 'https://accounts.google.com/o/oauth2/v2/auth', loopback: true,
      params: { client_id: config.YOUTUBE_CLIENT_ID, scope: GOOGLE_SCOPE, access_type: 'offline', prompt: 'consent',
        code_challenge: crypto.createHash('sha256').update(verifier).digest('base64url'), code_challenge_method: 'S256' } });
    return exchange({ client_id: config.YOUTUBE_CLIENT_ID, client_secret: config.YOUTUBE_CLIENT_SECRET, code,
      redirect_uri: redirect, grant_type: 'authorization_code', code_verifier: verifier });
  }
  return { access, login };
}

function graphBase(config) {
  if (!/^v\d+\.0$/.test(config.FACEBOOK_API_VERSION || '')) throw new Error('FACEBOOK_API_VERSION requis, format vXX.0 (version prise en charge dans Meta).');
  return `https://graph.facebook.com/${config.FACEBOOK_API_VERSION}`;
}
function facebookTokens(config, store, fetchImpl = fetch) {
  const base = graphBase(config);
  const get = async (endpoint, params, token) => json(await request(fetchImpl, `${base}/${endpoint}?${new URLSearchParams(params)}`,
    { headers: token ? { Authorization: `Bearer ${token}` } : {} }), 'OAuth Facebook');
  async function savePage(user) {
    // Pagination complète : une Page peut être absente de la première réponse.
    let after;
    let page;
    do {
      const data = await get('me/accounts', { fields: 'id,name,access_token,tasks', limit: '100', ...(after ? { after } : {}) }, user.access_token);
      page = data.data?.find((p) => p.id === config.FACEBOOK_PAGE_ID);
      after = data.paging?.next ? data.paging?.cursors?.after : null;
    } while (!page && after);
    if (!page?.access_token) throw new Error('Page Facebook introuvable : vérifier FACEBOOK_PAGE_ID, pages_show_list et les accès à la Page.');
    const saved = { appId: config.FACEBOOK_APP_ID, pageId: page.id, access_token: page.access_token,
      userToken: user.access_token, userExpiresAt: Date.now() + Number(user.expires_in || 5184000) * 1000, refreshedAt: Date.now() };
    store.write('facebook.json', saved); return saved.access_token;
  }
  async function login(auth = authorize) {
    required(config, ['FACEBOOK_APP_ID', 'FACEBOOK_APP_SECRET', 'FACEBOOK_PAGE_ID']);
    const redirect = new URL(config.FACEBOOK_REDIRECT_URI);
    const loopback = redirect.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(redirect.hostname);
    if (!loopback && redirect.protocol !== 'https:') throw new Error('FACEBOOK_REDIRECT_URI doit utiliser HTTPS ou le loopback local.');
    const grant = await auth({ endpoint: `https://www.facebook.com/${config.FACEBOOK_API_VERSION}/dialog/oauth`, redirect: redirect.href, loopback,
      params: { client_id: config.FACEBOOK_APP_ID, scope: config.FACEBOOK_SCOPES } });
    const short = await get('oauth/access_token', { client_id: config.FACEBOOK_APP_ID, client_secret: config.FACEBOOK_APP_SECRET,
      redirect_uri: grant.redirect, code: grant.code });
    if (!short.access_token) throw new Error('Facebook : jeton utilisateur absent.');
    const long = await get('oauth/access_token', { grant_type: 'fb_exchange_token', client_id: config.FACEBOOK_APP_ID,
      client_secret: config.FACEBOOK_APP_SECRET, fb_exchange_token: short.access_token });
    if (!long.access_token) throw new Error('Facebook : échange longue durée refusé.');
    return savePage(long);
  }
  async function access(force = false) {
    const saved = store.read('facebook.json');
    if (!saved?.access_token || saved.appId !== config.FACEBOOK_APP_ID || saved.pageId !== config.FACEBOOK_PAGE_ID) {
      throw new Error('Connexion Facebook requise : npm run video:login-facebook.');
    }
    if (!force && saved.refreshedAt > Date.now() - 86400000) return saved.access_token;
    if (!saved.userToken || saved.userExpiresAt <= Date.now()) {
      // Les jetons de Page dérivés d'un utilisateur longue durée peuvent ne pas expirer.
      // Les contrôler directement ; Facebook ne fournit pas de refresh_token OAuth.
      await get(saved.pageId, { fields: 'id' }, saved.access_token);
      store.write('facebook.json', { ...saved, refreshedAt: Date.now() }); return saved.access_token;
    }
    return savePage({ access_token: saved.userToken, expires_in: (saved.userExpiresAt - Date.now()) / 1000 });
  }
  return { access, login };
}
module.exports = { authorize, extractCode, youtubeTokens, facebookTokens, graphBase };
