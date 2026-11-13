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
    snapshot: async () => {
      const Publication = conn.model('PrepPublication', require('../../../models/PrepPublication').schema);
      const Content = conn.model('PrepContent', require('../../../models/PrepContent').schema);
      const active = await Publication.findById('active').lean();
      if (!active?.generation) throw new Error('Import PREP requis avant de publier une vidéo');
      const rows = active.entries.length ? await Content.find({ $or: active.entries.map(({ kind, code, revision }) => ({ kind, code, revision })) }).lean() : [];
      if (rows.length !== active.entries.length) throw new Error('Publication PREP incomplète');
      const pack = { generation: active.generation, modules: {}, programmes: [] };
      for (const row of rows) {
        const payload = { ...row.payload, revision: row.revision };
        if (row.kind === 'module') pack.modules[row.code] = payload;
        else pack.programmes.push(payload);
      }
      return pack;
    },
    trouver: (cible) => Model.findOne(key(cible)).lean(),
    lister: () => Model.find({}).lean(),
    ecrire: (cible, champs) => Model.findOneAndUpdate(key(cible), { $set: champs }, { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }).lean(),
    masquer: (cible) => Model.findOneAndUpdate(key(cible), { $set: { status: 'hidden' } }, { new: true }).lean(),
    fermer: () => conn.close(),
  };
};

module.exports = { createDb };
