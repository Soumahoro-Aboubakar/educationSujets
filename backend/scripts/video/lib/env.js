const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const dotenv = require('dotenv');

/**
 * Chargement ISOLÉ des secrets du pipeline vidéo, sans toucher à process.env :
 *  - backend/.env.video.local       identifiants OAuth YouTube (client + refresh token) ;
 *  - backend/.env.production.local  MONGODB_URI de la base de PRODUCTION.
 * Les deux noms correspondent à la règle « .env.*.local » du .gitignore : jamais commités.
 * Le .env de développement n'est jamais lu ici (aucun risque d'écrire dans la mauvaise base).
 */
const BACKEND = path.resolve(__dirname, '../../..');
const DEFAULTS = {
  video: path.join(BACKEND, '.env.video.local'),
  production: path.join(BACKEND, '.env.production.local'),
};

/** Le pipeline ne tourne jamais sur un serveur (Render) ni en mode production. */
const assertLocalMachine = (env = process.env) => {
  if (env.RENDER || env.RENDER_SERVICE_ID || env.NODE_ENV === 'production') {
    throw new Error('Ce script tourne uniquement sur la machine locale du propriétaire, jamais sur le serveur.');
  }
};

/** Refuse un fichier de secrets suivi par git (il finirait dans un commit). */
const assertNotTracked = (file) => {
  try {
    execFileSync('git', ['ls-files', '--error-unmatch', file], { cwd: path.dirname(file), stdio: 'ignore' });
  } catch (error) {
    return; // non suivi (ou git absent) : c'est ce qu'on veut
  }
  throw new Error(`${path.basename(file)} est suivi par git : retire-le (git rm --cached) avant de continuer.`);
};

const readEnvFile = (file, required, aide) => {
  if (!fs.existsSync(file)) throw new Error(`Fichier ${file} introuvable.\n${aide}`);
  assertNotTracked(file);
  const values = dotenv.parse(fs.readFileSync(file));
  const missing = required.filter((k) => !values[k]);
  if (missing.length) throw new Error(`${path.basename(file)} : variable(s) manquante(s) ${missing.join(', ')}.\n${aide}`);
  return values;
};

const loadVideoEnv = (file = DEFAULTS.video) => {
  const v = readEnvFile(file, ['YOUTUBE_CLIENT_ID', 'YOUTUBE_CLIENT_SECRET', 'YOUTUBE_REFRESH_TOKEN'],
    'Modèle : scripts/video/video.env.exemple ; refresh token : npm run video:auth');
  return {
    clientId: v.YOUTUBE_CLIENT_ID,
    clientSecret: v.YOUTUBE_CLIENT_SECRET,
    refreshToken: v.YOUTUBE_REFRESH_TOKEN,
    channelId: v.YOUTUBE_CHANNEL_ID || null,
  };
};

/** Identifiants OAuth seuls (pour obtenir le refresh token la première fois). */
const loadOAuthClient = (file = DEFAULTS.video) => {
  const v = readEnvFile(file, ['YOUTUBE_CLIENT_ID', 'YOUTUBE_CLIENT_SECRET'], 'Modèle : scripts/video/video.env.exemple');
  return { clientId: v.YOUTUBE_CLIENT_ID, clientSecret: v.YOUTUBE_CLIENT_SECRET };
};

const loadProductionEnv = (file = DEFAULTS.production) => {
  const v = readEnvFile(file, ['MONGODB_URI'], 'Ce fichier contient uniquement MONGODB_URI=<URI de la base de production>.');
  return { mongoUri: v.MONGODB_URI };
};

/** URI affichable : hôte et base seulement, jamais l'utilisateur ni le mot de passe. */
const maskMongoUri = (uri) => {
  try {
    const u = new URL(uri);
    return `${u.host}${u.pathname && u.pathname !== '/' ? u.pathname : ''}`;
  } catch (error) {
    return String(uri).replace(/\/\/[^@/]*@/, '//***@').split('?')[0].replace(/^mongodb(\+srv)?:\/\//, '');
  }
};

module.exports = { DEFAULTS, BACKEND, assertLocalMachine, assertNotTracked, loadVideoEnv, loadOAuthClient, loadProductionEnv, maskMongoUri };
