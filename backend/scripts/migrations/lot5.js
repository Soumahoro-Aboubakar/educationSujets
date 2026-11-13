#!/usr/bin/env node
/**
 * Lot 5 — migration additive des progressions (aucun dotenv, base locale explicite uniquement).
 *
 *   node scripts/migrations/lot5.js --uri=mongodb://127.0.0.1:27017/fatafalta-dev          # à blanc
 *   node scripts/migrations/lot5.js --uri=mongodb://127.0.0.1:27017/fatafalta-dev --apply  # application
 *
 * - progressions : `revision` (0), `schemaVersion` (2), `appliquees` ([]) quand absents ;
 *   pour chaque leçon, `derniere` = `position` (la reprise se fait là où l'élève s'était arrêté) ;
 * - index de la nouvelle collection `prepactions`.
 * Idempotente, ne supprime rien. Une migration de production exige une procédure séparée et autorisée.
 */
const mongoose = require('mongoose');
const { assertLocalUri } = require('./lot1');
const PrepProgression = require('../../models/PrepProgression');
const PrepAction = require('../../models/PrepAction');

const migrate = async ({ apply = false } = {}) => {
  const missing = await PrepProgression.countDocuments({ revision: { $exists: false } });
  let lecons = 0;
  if (apply) {
    await PrepProgression.updateMany({ revision: { $exists: false } }, { $set: { revision: 0 } });
    await PrepProgression.updateMany({ schemaVersion: { $exists: false } }, { $set: { schemaVersion: 2 } });
    await PrepProgression.updateMany({ appliquees: { $exists: false } }, { $set: { appliquees: [] } });
  }
  const cursor = PrepProgression.find({ 'etat.lecons': { $exists: true } }).select('etat.lecons revision').lean().cursor();
  for await (const doc of cursor) {
    const patch = {};
    Object.entries(doc.etat.lecons || {}).forEach(([code, l]) => {
      if (l && l.derniere === undefined) patch[`etat.lecons.${code}.derniere`] = Number(l.position) || 0;
    });
    if (!Object.keys(patch).length) continue;
    lecons += Object.keys(patch).length;
    // Écriture conditionnelle : une progression modifiée entre-temps sera reprise à la prochaine exécution.
    if (apply) await PrepProgression.updateOne({ _id: doc._id, revision: doc.revision || 0 }, { $set: patch, $inc: { revision: 1 } });
  }
  if (apply) await PrepAction.createIndexes();
  return { dryRun: !apply, progressionsSansRevision: missing, leconsSansDernierePosition: lecons };
};

if (require.main === module) {
  const uri = (process.argv.find((a) => a.startsWith('--uri=')) || '').slice(6);
  assertLocalUri(uri);
  mongoose.connect(uri)
    .then(() => migrate({ apply: process.argv.includes('--apply') }))
    .then((out) => { console.log(JSON.stringify(out)); return mongoose.disconnect(); })
    .catch(async (error) => { console.error(error.message); await mongoose.disconnect(); process.exit(1); });
}

module.exports = { migrate };
