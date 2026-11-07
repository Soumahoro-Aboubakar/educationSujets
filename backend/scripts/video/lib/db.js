const mongoose = require('mongoose');
const PrepVideo = require('../../../models/PrepVideo');

/**
 * Accès à la base de PRODUCTION par une connexion dédiée (jamais la connexion par défaut de
 * l'application). Écriture idempotente : mise à jour sur la clé unique { cible, code, langue }.
 */
const createDb = async (mongoUri) => {
  const conn = await mongoose.createConnection(mongoUri, { serverSelectionTimeoutMS: 15000 }).asPromise();
  const Model = conn.model('PrepVideo', PrepVideo.schema);
  const key = (cible) => ({ cible: cible.type, code: cible.code, langue: cible.langue });
  return {
    trouver: (cible) => Model.findOne(key(cible)).lean(),
    lister: () => Model.find({}).lean(),
    ecrire: (cible, champs) => Model.findOneAndUpdate(key(cible), { $set: champs }, { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }).lean(),
    masquer: (cible) => Model.findOneAndUpdate(key(cible), { $set: { status: 'hidden' } }, { new: true }).lean(),
    fermer: () => conn.close(),
  };
};

module.exports = { createDb };
