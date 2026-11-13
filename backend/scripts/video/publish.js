#!/usr/bin/env node
/**
 * Publication d'une vidéo explicative de leçon ou de présentation de concours.
 * LOCAL UNIQUEMENT — jamais sur le serveur. Procédure complète : docs/videos/README.md
 *
 *   node scripts/video/publish.js --type lecon    --id MATH-LNEXP-L1 --fichier ~/videos/math-lnexp-l1.mp4
 *   node scripts/video/publish.js --type concours --id ENSEA-AS   --fichier ~/videos/ensea-as.mp4 --dry-run
 *   node scripts/video/publish.js --etat
 *
 * Idempotent : relancer la même commande ne renvoie jamais une vidéo déjà sur YouTube et
 * reprend à l'étape interrompue (envoi coupé, traitement en cours, écriture en base échouée).
 */
const path = require('path');
const { parseArgs, USAGE } = require('./lib/args');
const env = require('./lib/env');
const { resolveCible } = require('./lib/cible');
const { createYoutubeClient } = require('./lib/youtube');
const { createEtat, DIR } = require('./lib/etat');
const { createDb } = require('./lib/db');
const { createConfirm } = require('./lib/confirm');
const { createLog } = require('./lib/log');
const { publier, masquer, listerEtat } = require('./lib/pipeline');

const main = async () => {
  let opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`✗ ${error.message}\n${USAGE}`);
    return 2;
  }
  if (opts.aide) { console.log(USAGE); return 0; }

  const log = createLog({ total: opts.masquer ? 3 : 7, journal: path.join(DIR, 'journal.jsonl') });
  let db = null;
  try {
    env.assertLocalMachine();
    const production = env.loadProductionEnv(opts.envProduction);
    const baseAffichee = env.maskMongoUri(production.mongoUri);
    if (opts.dryRun) log.info('Mode --dry-run : aucun envoi, aucune écriture.');
    db = await createDb(production.mongoUri);
    const snapshot = await db.snapshot();
    const deps = { log, db, baseAffichee, resoudreCible: cible => resolveCible(cible, snapshot), confirm: createConfirm({ preconfirme: opts.confirmer ?? null }) };

    if (opts.etat) { await listerEtat(deps); return 0; }
    if (opts.masquer) { await masquer(opts, deps); return 0; }

    const video = env.loadVideoEnv(opts.envVideo);
    const youtube = createYoutubeClient(video);
    const result = await publier(opts, { ...deps, youtube, etat: createEtat(), channelId: video.channelId });
    return result.action === 'annule' ? 1 : 0;
  } catch (error) {
    log.erreur(error.message);
    return 1;
  } finally {
    if (db) await db.fermer().catch(() => {});
  }
};

if (require.main === module) main().then((code) => { process.exitCode = code; });

// Réutilisable sans lancer le CLI ni charger les fichiers d'environnement historiques.
module.exports = { ...require('./lib/pipeline'), main };
