const mongoose = require('mongoose');
const Institution = require('../models/Institution');
const TaxonomyNode = require('../models/TaxonomyNode');
const AppError = require('../utils/errors');

const NODE_TYPE_PATTERN = /^[a-z][a-z0-9_-]*$/;

const normalizeNavigationStructure = (value) => {
  if (!Array.isArray(value) || value.length < 2) {
    throw new AppError('La structure doit contenir au moins deux niveaux', 400);
  }

  const structure = value.map((item) => String(item || '').trim().toLowerCase());
  if (structure.some((item) => !NODE_TYPE_PATTERN.test(item))) {
    throw new AppError('Les types de niveau doivent utiliser des lettres, chiffres, tirets ou underscores', 400);
  }
  if (new Set(structure).size !== structure.length) {
    throw new AppError('Un type de niveau ne peut apparaitre qu une seule fois dans la structure', 400);
  }
  if (structure.at(-1) !== 'subject') {
    throw new AppError('Le dernier niveau de la structure doit etre subject', 400);
  }

  return structure;
};

const getInstitutionOrThrow = async (institutionId) => {
  if (!mongoose.Types.ObjectId.isValid(institutionId)) {
    throw new AppError('Institution invalide', 400);
  }

  const institution = await Institution.findById(institutionId);
  if (!institution) throw new AppError('Institution introuvable', 404);
  return institution;
};

const getNodeAncestors = async (node) => {
  const path = [];
  const seen = new Set();
  let current = node;

  while (current) {
    const id = current._id.toString();
    if (seen.has(id)) throw new AppError('La structure contient une boucle de parents', 409);
    seen.add(id);
    path.unshift(current);

    if (!current.parent) break;
    current = await TaxonomyNode.findById(current.parent);
    if (!current) throw new AppError('La structure contient un parent introuvable', 409);
  }

  return path;
};

const validateNodePlacement = async ({ institutionId, parentId, type, nodeId = null }) => {
  const institution = await getInstitutionOrThrow(institutionId);
  const structure = normalizeNavigationStructure(institution.navigationStructure);
  const normalizedType = String(type || '').trim().toLowerCase();
  let parent = null;

  if (parentId) {
    if (!mongoose.Types.ObjectId.isValid(parentId)) {
      throw new AppError('Parent invalide', 400);
    }
    parent = await TaxonomyNode.findOne({ _id: parentId, institution: institution._id });
    if (!parent) throw new AppError('Parent invalide pour cette institution', 400);
    if (!parent.isActive) throw new AppError('Le parent est archive', 409);
    if (nodeId && parent._id.toString() === String(nodeId)) {
      throw new AppError('Un element ne peut pas etre son propre parent', 400);
    }
  }

  const parentPath = parent ? await getNodeAncestors(parent) : [];
  if (nodeId && parentPath.some((item) => item._id.toString() === String(nodeId))) {
    throw new AppError('Un element ne peut pas etre deplace sous un de ses enfants', 400);
  }
  if (parentPath.some((item) => item.institution.toString() !== institution._id.toString())) {
    throw new AppError('Le parent ne correspond pas a cette institution', 400);
  }

  const expectedType = structure[parentPath.length];
  if (!expectedType || normalizedType !== expectedType) {
    const position = parentPath.length + 1;
    throw new AppError(`Le niveau ${position} doit etre de type ${expectedType || 'invalide'}`, 400);
  }

  return { institution, parent, structure, type: normalizedType, depth: parentPath.length };
};

const validateDocumentTaxonomy = async ({ institutionId, nodeIds, requireComplete = false }) => {
  const ids = Array.isArray(nodeIds) ? nodeIds.filter(Boolean).map(String) : [];

  if (!institutionId) {
    if (ids.length) throw new AppError('Une institution est obligatoire pour utiliser une structure dynamique', 400);
    return [];
  }

  const institution = await getInstitutionOrThrow(institutionId);
  const structure = normalizeNavigationStructure(institution.navigationStructure);

  if (!ids.length) {
    if (requireComplete) {
      throw new AppError('Selectionnez tous les niveaux de la structure de cette institution', 400);
    }
    return [];
  }

  if (new Set(ids).size !== ids.length || ids.length !== structure.length) {
    throw new AppError('Le chemin de structure est incomplet ou contient un doublon', 400);
  }
  if (ids.some((id) => !mongoose.Types.ObjectId.isValid(id))) {
    throw new AppError('Un element de structure est invalide', 400);
  }

  const nodes = await TaxonomyNode.find({ _id: { $in: ids }, institution: institution._id, isActive: true });
  if (nodes.length !== ids.length) {
    throw new AppError('Un element de structure est introuvable ou n appartient pas a cette institution', 400);
  }

  const nodeById = new Map(nodes.map((node) => [node._id.toString(), node]));
  const orderedNodes = ids.map((id) => nodeById.get(id));

  orderedNodes.forEach((node, index) => {
    if (node.type !== structure[index]) {
      throw new AppError(`Le niveau ${index + 1} doit etre de type ${structure[index]}`, 400);
    }
    const expectedParent = index ? orderedNodes[index - 1]._id.toString() : null;
    if (String(node.parent || '') !== String(expectedParent || '')) {
      throw new AppError('Les elements selectionnes ne forment pas un chemin valide', 400);
    }
  });

  return orderedNodes.map((node) => node._id);
};

const assertStructureCanBeChanged = async (institution, nextStructure) => {
  const nodes = await TaxonomyNode.find({ institution: institution._id }).select('type parent').lean();
  if (!nodes.length) return;
  if (nextStructure.join('|') !== institution.navigationStructure.join('|')) {
    throw new AppError('La structure ne peut plus etre modifiee apres la creation de ses premiers niveaux', 409);
  }
};

module.exports = {
  normalizeNavigationStructure,
  getInstitutionOrThrow,
  getNodeAncestors,
  validateNodePlacement,
  validateDocumentTaxonomy,
  assertStructureCanBeChanged,
};
