const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');

const REPO = path.resolve(__dirname, '../../../..');
const inside = (parent, child) => child === parent || child.startsWith(`${parent}${path.sep}`);
const expand = (p) => p.startsWith('~/') ? path.join(os.homedir(), p.slice(2)) : path.resolve(p);
// Résout aussi les liens symboliques des parents d'un chemin encore inexistant.
const canonical = (p) => fs.existsSync(p) ? fs.realpathSync(p) : path.join(canonical(path.dirname(p)), path.basename(p));

function createStore(directory = process.env.FATAFALTA_SOCIAL_HOME || path.join(os.homedir(), '.config/fatafalta')) {
  const dir = expand(directory);
  if (inside(fs.realpathSync(REPO), canonical(dir))) throw new Error('FATAFALTA_SOCIAL_HOME doit être hors dépôt.');
  for (let ancestor = canonical(dir); ; ancestor = path.dirname(ancestor)) {
    if (fs.existsSync(path.join(ancestor, '.git'))) throw new Error('FATAFALTA_SOCIAL_HOME doit être hors dépôt Git.');
    if (ancestor === path.dirname(ancestor)) break;
  }
  const file = (name) => {
    if (!/^[a-zA-Z0-9_-]+\.json$/.test(name)) throw new Error('Nom de fichier de configuration invalide.');
    const p = path.join(dir, name);
    if (fs.existsSync(p) && fs.lstatSync(p).isSymbolicLink()) throw new Error('Lien symbolique interdit pour les données sociales.');
    return p;
  };
  const secure = (p) => {
    const stat = fs.statSync(p);
    if ((stat.mode & 0o077) || (process.getuid && stat.uid !== process.getuid())) {
      throw new Error('Données sociales non protégées : chmod 700 du dossier et chmod 600 des fichiers requis.');
    }
  };
  const ensure = () => {
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    secure(dir);
  };
  const read = (name) => {
    const p = file(name);
    if (!fs.existsSync(p)) return null;
    secure(dir); secure(p);
    try { return JSON.parse(fs.readFileSync(p, 'utf8')); }
    catch { throw new Error(`JSON social invalide : ${name}. Aucun état n'est réinitialisé.`); }
  };
  const write = (name, data) => {
    ensure();
    const target = file(name);
    const temp = `${target}.${crypto.randomBytes(8).toString('hex')}.tmp`;
    const fd = fs.openSync(temp, 'wx', 0o600);
    try { fs.writeFileSync(fd, `${JSON.stringify(data, null, 2)}\n`); fs.fsyncSync(fd); }
    finally { fs.closeSync(fd); }
    fs.renameSync(temp, target);
    const parent = fs.openSync(dir, 'r');
    try { fs.fsyncSync(parent); } finally { fs.closeSync(parent); }
  };
  const lock = () => {
    ensure();
    const p = path.join(dir, 'publication.lock');
    let fd;
    try { fd = fs.openSync(p, 'wx', 0o600); }
    catch { throw new Error('Une opération sociale est déjà active (publication.lock). Voir le guide si un processus a été interrompu.'); }
    fs.writeFileSync(fd, String(process.pid)); fs.closeSync(fd);
    return () => fs.unlinkSync(p);
  };
  return { dir, read, write, lock };
}

const KEYS = ['YOUTUBE_CLIENT_ID', 'YOUTUBE_CLIENT_SECRET', 'YOUTUBE_CHANNEL_ID', 'YOUTUBE_PRIVACY', 'YOUTUBE_PLAYLISTS',
  'FACEBOOK_APP_ID', 'FACEBOOK_APP_SECRET', 'FACEBOOK_PAGE_ID', 'FACEBOOK_API_VERSION', 'FACEBOOK_REDIRECT_URI',
  'FACEBOOK_SCOPES', 'MONGODB_URI', 'YOUTUBE_ENABLED', 'FACEBOOK_ENABLED', 'TIKTOK_ENABLED',
  'TIKTOK_CLIENT_KEY', 'TIKTOK_CLIENT_SECRET', 'TIKTOK_OPEN_ID', 'TIKTOK_REDIRECT_URI', 'TIKTOK_MAX_DURATION_SEC'];
function loadConfig(store, env = process.env) {
  const config = store.read('config.json') || {};
  if (typeof config !== 'object' || Array.isArray(config)) throw new Error('config.json doit contenir un objet JSON.');
  for (const key of KEYS) if (env[key]) {
    config[key] = key === 'YOUTUBE_PLAYLISTS' ? JSON.parse(env[key]) : env[key];
  }
  if (config.YOUTUBE_PLAYLISTS && (typeof config.YOUTUBE_PLAYLISTS !== 'object' || Array.isArray(config.YOUTUBE_PLAYLISTS)
    || Object.values(config.YOUTUBE_PLAYLISTS).some((id) => typeof id !== 'string' || !/^[A-Za-z0-9_-]+$/.test(id)))) {
    throw new Error('YOUTUBE_PLAYLISTS doit associer chaque concours/matière à un identifiant de playlist.');
  }
  return { YOUTUBE_PRIVACY: 'unlisted', FACEBOOK_REDIRECT_URI: 'http://localhost:53683/callback',
    FACEBOOK_SCOPES: 'pages_show_list,pages_manage_posts,pages_read_engagement,publish_video', ...config };
}
function required(config, keys) {
  const missing = keys.filter((key) => !config[key]);
  if (missing.length) throw new Error(`Configuration manquante : ${missing.join(', ')} (config.json hors dépôt).`);
}

module.exports = { createStore, loadConfig, required };
