const { createStore, loadConfig, required } = require('./storage');
const { youtubeTokens, facebookTokens } = require('./oauth');
const { youtubeClient } = require('./youtube');
const { facebookClient } = require('./facebook');
const { tiktokTokens } = require('./tiktok-oauth');
const { tiktokClient } = require('./tiktok');
const { parseArgs, publishSocial, platforms, prepare, USAGE } = require('./pipeline');
const { assertLocalMachine } = require('../lib/env');

async function run(action, argv = process.argv.slice(2)) {
  let release;
  let db;
  try {
    const opts = action === 'publish' ? parseArgs(argv) : null;
    if (opts?.aide || argv.includes('--aide')) { console.log(action === 'publish' ? USAGE : 'Connexion interactive. --refresh pour contrôler/renouveler les jetons existants.'); return 0; }
    if (action !== 'publish' && argv.some((arg) => arg !== '--refresh')) throw new Error('Option inconnue (seul --refresh est accepté).');
    assertLocalMachine();
    const store = createStore();
    const config = loadConfig(store);
    if (opts?.dryRun) {
      console.log(JSON.stringify(await publishSocial(opts, config, {}), null, 2)); return 0;
    }
    release = store.lock();
    if (action === 'youtube') {
      required(config, ['YOUTUBE_CLIENT_ID', 'YOUTUBE_CLIENT_SECRET', 'YOUTUBE_CHANNEL_ID']);
      const tokens = youtubeTokens(config, store);
      if (argv.includes('--refresh')) await tokens.access(true); else await tokens.login();
      const channel = await youtubeClient(tokens).maChaine();
      if (channel.id !== config.YOUTUBE_CHANNEL_ID) throw new Error('Mauvaise chaîne : reconnecter le compte correspondant à YOUTUBE_CHANNEL_ID.');
      console.log(`YouTube connecté : ${channel.id}. Jetons enregistrés hors dépôt.`); return 0;
    }
    if (action === 'tiktok') {
      const tokens = tiktokTokens(config, store);
      if (argv.includes('--refresh')) await tokens.access(true); else await tokens.login();
      console.log(`TikTok connecté : open_id ${await tokens.identity()}. Reporter cet identifiant dans TIKTOK_OPEN_ID du fichier externe. Jetons enregistrés hors dépôt.`); return 0;
    }
    if (action === 'facebook') {
      required(config, ['FACEBOOK_APP_ID', 'FACEBOOK_APP_SECRET', 'FACEBOOK_PAGE_ID', 'FACEBOOK_API_VERSION']);
      const tokens = facebookTokens(config, store);
      if (argv.includes('--refresh')) await tokens.access(true); else await tokens.login();
      console.log(`Facebook connecté : Page ${config.FACEBOOK_PAGE_ID}. Jetons enregistrés hors dépôt.`); return 0;
    }
    const enabled = platforms(opts, config);
    // Valider tous les fichiers et la cible avant toute connexion externe.
    await prepare(opts, config);
    const clients = {};
    if (enabled.youtube) {
      required(config, ['YOUTUBE_CLIENT_ID', 'YOUTUBE_CLIENT_SECRET', 'YOUTUBE_CHANNEL_ID', 'MONGODB_URI']);
      const tokens = youtubeTokens(config, store); await tokens.access();
      clients.youtube = youtubeClient(tokens);
    }
    if (enabled.facebook) {
      required(config, ['FACEBOOK_APP_ID', 'FACEBOOK_APP_SECRET', 'FACEBOOK_PAGE_ID', 'FACEBOOK_API_VERSION']);
      const tokens = facebookTokens(config, store); await tokens.access();
      clients.facebook = facebookClient(config, tokens);
    }
    if (enabled.tiktok) {
      required(config, ['TIKTOK_CLIENT_KEY', 'TIKTOK_CLIENT_SECRET', 'TIKTOK_OPEN_ID']);
      const tokens = tiktokTokens(config, store); await tokens.access();
      clients.tiktok = tiktokClient(tokens);
    }
    let safeDb;
    if (enabled.youtube) {
      // Même connexion dédiée et même collection que publish.js. Aucun fichier .env chargé.
      try { db = await require('../lib/db').createDb(config.MONGODB_URI); }
      catch { throw new Error('Connexion MongoDB impossible : vérifier MONGODB_URI et les accès réseau.'); }
      safeDb = { trouver: async (...args) => {
        try { return await db.trouver(...args); } catch { throw new Error('Lecture MongoDB impossible.'); }
      }, ecrire: async (...args) => {
        try { return await db.ecrire(...args); } catch { throw new Error('Écriture MongoDB impossible. Relancer : les identifiants sociaux sont conservés.'); }
      } };
    }
    console.log(JSON.stringify(await publishSocial(opts, config, { store, db: safeDb, ...clients }), null, 2));
    return 0;
  } catch (error) {
    // Les clients sociaux filtrent les erreurs réseau ; aucune réponse OAuth brute n'est affichée.
    console.error(error.message); return 1;
  } finally {
    if (db) await db.fermer().catch(() => {});
    if (release) release();
  }
}
module.exports = { run };
