const mongoose = require('mongoose');
const Document = require('../../models/Document');
const Noeud = require('../../models/Noeud');
const Structure = require('../../models/Structure');
const billingConfig = require('../../config/billing');

/*
 * Année d'un document et niveau d'accès qui en découle.
 *
 * L'année n'est pas un champ du document : c'est le nœud du niveau « annee » de la structure de
 * son organisme (organisme → [cycle] → 2021 → matière). Un corrigé prend l'année de son sujet.
 *
 * Règle prudente : une année absente ou illisible ne rend jamais un document gratuit
 * (`tier: 'recent'`, `yearKnown: false`). Une plage (« 2014-2015 ») vaut sa dernière année.
 * Correction : renommer le nœud d'année dans l'administration du catalogue, ou rattacher le
 * document à la bonne année (édition des métadonnées).
 */

const MAX_DEPTH = 10;
const YEAR_PATTERN = /(?:^|\D)((?:19|20)\d{2})(?!\d)/g;

const id = (value) => (value?._id || value ? String(value?._id || value) : null);

/** Années (1900-2099) lues dans un libellé : « 2021 », « 2014-2015 », « Session 2019 ». */
const yearsIn = (label) => [...String(label || '').matchAll(YEAR_PATTERN)].map((match) => Number(match[1]));

/** Libellé de nœud qui n'est qu'une année ou une plage d'années (« 2021 », « 2014-2015 »). */
const isYearLabel = (label) => /^\s*(19|20)\d{2}(\s*[-/–]\s*(19|20)\d{2})?\s*$/.test(String(label || ''));

const accessTierOf = (year) => (Number.isInteger(year) && year <= billingConfig.downloads.freeUntilYear ? 'free' : 'recent');

const describeYear = (year) => ({
  year: Number.isInteger(year) ? year : null,
  yearKnown: Number.isInteger(year),
  tier: accessTierOf(year),
  freeUntilYear: billingConfig.downloads.freeUntilYear,
});

/**
 * Année d'une chaîne de nœuds (racine → feuille) : le nœud du niveau « annee » de la structure ;
 * à défaut (structure sans niveau « annee »), un nœud dont le libellé n'est qu'une année.
 */
const yearOfChain = (chain = [], structure = null) => {
  const yearLevel = structure?.niveaux?.find((niveau) => niveau.type === 'annee');
  const candidates = yearLevel
    ? chain.filter((node) => node.ordreNiveau === yearLevel.ordre)
    : chain.filter((node) => isYearLabel(node.nom));
  const years = candidates.flatMap((node) => yearsIn(node.nom));
  return years.length ? Math.max(...years) : null;
};

/** Charge les nœuds et leurs ancêtres (une requête par niveau de profondeur). */
const loadNodeChains = async (leafIds) => {
  const nodesById = new Map();
  let pending = [...new Set(leafIds.filter(Boolean))];
  for (let depth = 0; pending.length && depth < MAX_DEPTH; depth += 1) {
    const nodes = await Noeud.find({ _id: { $in: pending } }).select('organismeId parentId nom ordreNiveau').lean();
    nodes.forEach((node) => nodesById.set(id(node._id), node));
    pending = [...new Set(nodes.map((node) => id(node.parentId)).filter((parentId) => parentId && !nodesById.has(parentId)))];
  }
  const chainOf = (leafId) => {
    const chain = [];
    const seen = new Set();
    let current = nodesById.get(id(leafId));
    while (current && !seen.has(id(current._id))) {
      seen.add(id(current._id));
      chain.unshift(current);
      current = current.parentId ? nodesById.get(id(current.parentId)) : null;
    }
    return chain;
  };
  return { nodesById, chainOf };
};

const isCorrection = (document) => document?.type === 'correction' || document?.documentType === 'corrige';

/**
 * Accès de plusieurs documents : Map(_id → { year, yearKnown, tier, freeUntilYear }).
 * Accepte des documents bruts ou peuplés (noeudId objet ou identifiant).
 */
const resolveAccessForDocuments = async (documents = []) => {
  const list = documents.filter(Boolean);
  const result = new Map();
  if (!list.length) return result;

  // Corrigés : année du sujet parent (son nœud n'est pas toujours porté par le corrigé).
  const parentIds = list
    .filter((document) => isCorrection(document) && !document.noeudId)
    .map((document) => id(document.sujetParentId || document.correctionFor))
    .filter((parentId) => parentId && mongoose.Types.ObjectId.isValid(parentId));
  const parents = parentIds.length
    ? await Document.find({ _id: { $in: parentIds } }).select('noeudId').lean()
    : [];
  const parentLeaf = new Map(parents.map((parent) => [id(parent._id), id(parent.noeudId)]));

  const leafOf = (document) => id(document.noeudId)
    || (isCorrection(document) ? parentLeaf.get(id(document.sujetParentId || document.correctionFor)) : null);

  const { nodesById, chainOf } = await loadNodeChains(list.map(leafOf));
  const organismeIds = [...new Set([...nodesById.values()].map((node) => id(node.organismeId)))];
  const structures = organismeIds.length
    ? await Structure.find({ organismeId: { $in: organismeIds } }).select('organismeId niveaux').lean()
    : [];
  const structureByOrganisme = new Map(structures.map((structure) => [id(structure.organismeId), structure]));

  list.forEach((document) => {
    const chain = chainOf(leafOf(document));
    const structure = chain.length ? structureByOrganisme.get(id(chain[0].organismeId)) : null;
    result.set(id(document._id), describeYear(chain.length ? yearOfChain(chain, structure) : null));
  });
  return result;
};

const resolveAccessForDocument = async (document) => (await resolveAccessForDocuments([document])).get(id(document?._id))
  || describeYear(null);

/** Ajoute `access` à des documents sérialisables (listes publiques, fiche). */
const withAccess = async (documents = []) => {
  const access = await resolveAccessForDocuments(documents);
  return documents.map((document) => {
    const plain = typeof document?.toObject === 'function' ? document.toObject() : document;
    return plain ? { ...plain, access: access.get(id(plain._id)) || describeYear(null) } : plain;
  });
};

module.exports = {
  yearsIn,
  isYearLabel,
  yearOfChain,
  accessTierOf,
  describeYear,
  loadNodeChains,
  resolveAccessForDocuments,
  resolveAccessForDocument,
  withAccess,
};
