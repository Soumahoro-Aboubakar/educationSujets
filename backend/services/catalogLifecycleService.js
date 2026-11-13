const mongoose = require('mongoose');
const Organisme = require('../models/Organisme');
const Noeud = require('../models/Noeud');
const Matiere = require('../models/Matiere');
const ParcoursType = require('../models/ParcoursType');
const Document = require('../models/Document');
const AppError = require('../utils/errors');
const log = require('./security/securityLogger');
const publication = require('./prep/publicationService');
const models = { organismes: Organisme, noeuds: Noeud, matieres: Matiere, parcoursTypes: ParcoursType };
const visible = { $nin: ['draft', 'archived'] };
const assertPublished = row => { if (!row || ['draft', 'archived'].includes(row.status)) throw new AppError('Élément non publié', 404); };
const patch = async (kind, id, payload, author) => {
  if (!mongoose.isValidObjectId(id)) throw new AppError('Identifiant invalide', 400);
  const Model = models[kind];
  const row = await Model.findById(id);
  if (!row) throw new AppError('Élément introuvable', 404);
  if (payload.status !== undefined && !['draft', 'published', 'archived'].includes(payload.status)) throw new AppError('Statut invalide', 400);
  if (payload.status && payload.status !== 'published') {
    const docField = { organismes: 'organismeId', noeuds: 'noeudId', matieres: 'matiereId', parcoursTypes: 'parcoursTypeId' }[kind];
    let referenced = await Document.exists({ [docField]: row._id, status: 'approved', isDeleted: { $ne: true } });
    if (kind === 'organismes') referenced ||= await Noeud.exists({ organismeId: id, status: visible }) || await Matiere.exists({ organismeId: id, status: visible }) || await ParcoursType.exists({ organismeId: id, status: visible });
    if (kind === 'noeuds') referenced ||= await Noeud.exists({ parentId: id, status: visible });
    if (['organismes', 'parcoursTypes'].includes(kind)) {
      const active = await publication.current();
      const rows = await publication.readEntries(active.entries.filter(r => r.kind === 'programme'));
      referenced ||= rows.some(r => String(r.payload[kind === 'organismes' ? 'organismeId' : 'parcoursTypeId']) === String(id));
    }
    if (referenced) throw new AppError('Retire d’abord les contenus publiés et les descendants qui utilisent cet élément.', 409);
  }
  if (payload.status === 'published' && kind !== 'organismes') {
    assertPublished(await Organisme.findById(row.organismeId).lean());
    if (row.parentId) assertPublished(await Noeud.findById(row.parentId).lean());
  }
  if (payload.nom !== undefined) {
    if (typeof payload.nom !== 'string' || !payload.nom.trim() || payload.nom.length > 200) throw new AppError('Nom invalide', 400);
    row.nom = payload.nom;
  }
  if (payload.description !== undefined && row.schema.path('description')) row.description = String(payload.description).slice(0, 2000);
  if (payload.status) row.status = payload.status;
  await row.save();
  log.info('catalog.update', { actorId: author, key: `${kind}:${id}`, status: row.status });
  return row;
};
module.exports = { patch, assertPublished, visible };
