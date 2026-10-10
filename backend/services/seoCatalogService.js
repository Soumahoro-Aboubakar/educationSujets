const Organisme = require('../models/Organisme');
const Structure = require('../models/Structure');
const Noeud = require('../models/Noeud');
const Matiere = require('../models/Matiere');
const ParcoursType = require('../models/ParcoursType');
const Document = require('../models/Document');
const { slugify } = require('../utils/slug');

/*
 * Flux public du catalogue pour le pré-rendu du site web (pages HTML statiques + sitemap).
 *
 * Une seule réponse contient tout ce qu'un robot peut lire sur le site : organismes, types de
 * parcours, niveaux, matières et fiches des sujets publiés. Mêmes règles que le catalogue
 * public (sujets approuvés, non supprimés, rattachés à un nœud et à une matière) et aucun
 * champ interne : ni fichier, ni clé de stockage, ni auteur, ni lien de téléchargement.
 */
const publishedSubjectFilter = {
  status: 'approved',
  type: 'sujet',
  noeudId: { $ne: null },
  matiereId: { $ne: null },
  isDeleted: { $ne: true },
};

const CACHE_TTL_MS = 5 * 60 * 1000;
let cache = null;

const id = (value) => (value ? String(value) : null);
const latest = (...dates) => dates.filter(Boolean).map((date) => new Date(date)).sort((a, b) => b - a)[0] || null;

const buildSeoCatalog = async () => {
  const documents = await Document.find(publishedSubjectFilter)
    .select('title description noeudId matiereId parcoursTypeId correctionIncludedInPdf extension fileSize dateAjout createdAt updatedAt')
    .sort('-dateAjout')
    .lean();

  const subjectIds = documents.map((document) => document._id);
  const leafIds = [...new Set(documents.map((document) => id(document.noeudId)))];
  const matiereIds = [...new Set(documents.map((document) => id(document.matiereId)))];

  const [corrections, leaves, matieres] = await Promise.all([
    Document.find({
      status: 'approved',
      isDeleted: { $ne: true },
      $or: [
        { documentType: 'corrige', correctionFor: { $in: subjectIds } },
        { type: 'correction', sujetParentId: { $in: subjectIds } },
      ],
    }).select('correctionFor sujetParentId').lean(),
    Noeud.find({ _id: { $in: leafIds } }).select('organismeId parentId nom ordreNiveau updatedAt').lean(),
    Matiere.find({ _id: { $in: matiereIds } }).select('organismeId nom updatedAt').lean(),
  ]);

  // Ancêtres des nœuds feuilles, niveau par niveau (une requête par niveau de profondeur).
  const nodesById = new Map(leaves.map((node) => [id(node._id), node]));
  let pending = [...new Set(leaves.map((node) => id(node.parentId)).filter((parentId) => parentId && !nodesById.has(parentId)))];
  for (let depth = 0; pending.length && depth < 10; depth += 1) {
    const parents = await Noeud.find({ _id: { $in: pending } }).select('organismeId parentId nom ordreNiveau updatedAt').lean();
    parents.forEach((node) => nodesById.set(id(node._id), node));
    pending = [...new Set(parents.map((node) => id(node.parentId)).filter((parentId) => parentId && !nodesById.has(parentId)))];
  }

  const organismeIds = [...new Set([...nodesById.values()].map((node) => id(node.organismeId)))];
  const [organismes, structures, parcoursTypes] = await Promise.all([
    Organisme.find({ _id: { $in: organismeIds } }).select('nom slug logo description updatedAt').sort('nom').lean(),
    Structure.find({ organismeId: { $in: organismeIds } }).select('organismeId niveaux').lean(),
    ParcoursType.find({ organismeId: { $in: organismeIds } }).select('organismeId nom').sort('nom').lean(),
  ]);

  const corrected = new Set(corrections.map((correction) => id(correction.correctionFor || correction.sujetParentId)));
  const structureByOrganisme = new Map(structures.map((structure) => [id(structure.organismeId), structure]));
  const matiereById = new Map(matieres.map((matiere) => [id(matiere._id), matiere]));

  const items = organismes
    .filter((organisme) => structureByOrganisme.has(id(organisme._id)))
    .map((organisme) => {
      const organismeId = id(organisme._id);
      const nodes = [...nodesById.values()].filter((node) => id(node.organismeId) === organismeId);
      const nodeIds = new Set(nodes.map((node) => id(node._id)));
      const ownDocuments = documents.filter((document) => nodeIds.has(id(document.noeudId)));
      const ownMatieres = [...new Set(ownDocuments.map((document) => id(document.matiereId)))]
        .map((matiereId) => matiereById.get(matiereId))
        .filter(Boolean);
      return {
        _id: organismeId,
        nom: organisme.nom,
        slug: organisme.slug || slugify(organisme.nom),
        logo: organisme.logo || null,
        description: organisme.description || '',
        niveaux: structureByOrganisme.get(organismeId).niveaux.map(({ ordre, type, libelleSingulier, libellePluriel }) => ({
          ordre, type, libelleSingulier, libellePluriel,
        })),
        parcoursTypes: parcoursTypes
          .filter((parcoursType) => id(parcoursType.organismeId) === organismeId)
          .map((parcoursType) => ({ _id: id(parcoursType._id), nom: parcoursType.nom })),
        noeuds: nodes.map((node) => ({
          _id: id(node._id), nom: node.nom, parentId: id(node.parentId), ordreNiveau: node.ordreNiveau,
        })),
        matieres: ownMatieres.map((matiere) => ({ _id: id(matiere._id), nom: matiere.nom })),
        documents: ownDocuments.map((document) => ({
          _id: id(document._id),
          title: document.title,
          description: document.description || '',
          noeudId: id(document.noeudId),
          matiereId: id(document.matiereId),
          parcoursTypeId: id(document.parcoursTypeId),
          hasCorrection: corrected.has(id(document._id)) || Boolean(document.correctionIncludedInPdf),
          correctionIncludedInPdf: Boolean(document.correctionIncludedInPdf),
          extension: document.extension || '.pdf',
          fileSize: document.fileSize || 0,
          dateAjout: document.dateAjout || document.createdAt,
          updatedAt: document.updatedAt,
        })),
        updatedAt: latest(organisme.updatedAt, ...ownDocuments.map((document) => document.updatedAt)),
      };
    })
    .filter((organisme) => organisme.documents.length);

  return {
    generatedAt: new Date(),
    updatedAt: latest(...items.map((organisme) => organisme.updatedAt)),
    organismes: items,
  };
};

/** Catalogue SEO, recalculé au plus toutes les 5 minutes (ou après une publication). */
const getSeoCatalog = async () => {
  if (cache && cache.expiresAt > Date.now()) return cache.value;
  const value = await buildSeoCatalog();
  cache = { value, expiresAt: Date.now() + CACHE_TTL_MS };
  return value;
};

const invalidateSeoCatalog = () => {
  cache = null;
};

module.exports = { buildSeoCatalog, getSeoCatalog, invalidateSeoCatalog, publishedSubjectFilter };
