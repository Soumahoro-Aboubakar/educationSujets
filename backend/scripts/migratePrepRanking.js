/**
 * Migration explicite et idempotente. Aucun chargement de .env, aucune exécution à l'import.
 * PREP_MIGRATION_MONGODB_URI=<URI choisie par l'opérateur> node scripts/migratePrepRanking.js
 * Le script ne supprime aucun index existant ; createIndexes ajoute ceux des deux modèles.
 */
const mongoose = require('mongoose');
const PrepIdentite = require('../models/PrepIdentite');
const PrepProgression = require('../models/PrepProgression');
const { pseudonymFields } = require('../services/prep/pseudonymSearch');
const core = require('../services/prep/shared/prepCore');
const content = require('../services/prep/contentService');

const migrateSnapshot = async () => {
  let identities = 0; let progressions = 0;
  const batch = [];
  const flush = async (model) => { if (batch.length) { await model.bulkWrite(batch, { ordered: false }); batch.length = 0; } };
  for await (const identite of PrepIdentite.find().select('pseudonyme pseudonymeNormalise pseudonymeNumero').lean().cursor()) {
    const fields = pseudonymFields(identite.pseudonyme);
    if (Object.keys(fields).some((key) => identite[key] !== fields[key])) {
      // Ne pas écraser une modification concurrente du pseudonyme.
      batch.push({ updateOne: { filter: { _id: identite._id, pseudonyme: identite.pseudonyme }, update: { $set: fields }, timestamps: false } });
      identities += 1;
    }
    if (batch.length === 500) await flush(PrepIdentite);
  }
  await flush(PrepIdentite);
  for await (const doc of PrepProgression.find().select('etat programme updatedAt stats matieresFortes').lean().cursor()) {
    if (!doc.etat?.compteurs) continue;
    const stats = core.publicStats(doc.etat);
    const programme = content.getProgramme(doc.programme);
    const matieresFortes = programme ? programme.matieres.filter((m) => m.modules.some((x) => (doc.etat.modulesValides || []).includes(x.code))).map((m) => m.nom) : [];
    const fields = { 'stats.reussies': stats.reussies, 'stats.secondesChancesReussies': stats.secondesChancesReussies, matieresFortes };
    if (doc.stats?.reussies === stats.reussies && doc.stats?.secondesChancesReussies === stats.secondesChancesReussies && JSON.stringify(doc.matieresFortes) === JSON.stringify(matieresFortes)) continue;
    batch.push({ updateOne: { filter: { _id: doc._id, updatedAt: doc.updatedAt }, update: { $set: fields }, timestamps: false } });
    progressions += 1;
    if (batch.length === 500) await flush(PrepProgression);
  }
  await flush(PrepProgression);
  await PrepIdentite.createIndexes();
  await PrepProgression.createIndexes();
  return { identities, progressions };
};

const migrate = () => content.withSnapshot(migrateSnapshot);

if (require.main === module) {
  const uri = process.env.PREP_MIGRATION_MONGODB_URI;
  if (!uri) { console.error('PREP_MIGRATION_MONGODB_URI requis (aucune base par défaut).'); process.exitCode = 1; }
  else mongoose.connect(uri, { autoIndex: false }).then(migrate).then((counts) => console.log(JSON.stringify(counts)))
    .catch((error) => { console.error(error.message); process.exitCode = 1; }).finally(() => mongoose.disconnect());
}
module.exports = { migrate };
