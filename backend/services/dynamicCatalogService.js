const mongoose = require('mongoose');
const Organisme = require('../models/Organisme');
const Structure = require('../models/Structure');
const Noeud = require('../models/Noeud');
const Matiere = require('../models/Matiere');
const ParcoursType = require('../models/ParcoursType');
const Document = require('../models/Document');
const AppError = require('../utils/errors');
const normalizeText = require('../utils/normalizeText');

const findOneAndUpdateWithDuplicateRetry = async (Model, filter, update, options = {}) => {
  try {
    return await Model.findOneAndUpdate(filter, update, options);
  } catch (error) {
    if (error.code !== 11000) throw error;
    return Model.findOne(filter).collation(options.collation || { locale: 'fr', strength: 2 });
  }
};

const toObjectId = (value, label) => {
  if (!mongoose.Types.ObjectId.isValid(value)) throw new AppError(`${label} invalide`, 400);
  return new mongoose.Types.ObjectId(value);
};

const getOrganismeOrThrow = async (organismeId) => {
  const organisme = await Organisme.findById(toObjectId(organismeId, 'Organisme'));
  if (!organisme) throw new AppError('Organisme introuvable', 404);
  return organisme;
};

const getStructureOrThrow = async (organismeId) => {
  const structure = await Structure.findOne({ organismeId: toObjectId(organismeId, 'Organisme') });
  if (!structure) throw new AppError('Structure introuvable pour cet organisme', 404);
  return structure;
};

const getParcoursTypeOrThrow = async (organismeId, parcoursTypeId) => {
  if (!parcoursTypeId) return null;
  const parcoursType = await ParcoursType.findOne({
    _id: toObjectId(parcoursTypeId, 'Type de parcours'),
    organismeId: toObjectId(organismeId, 'Organisme'),
  }).lean();
  if (!parcoursType) throw new AppError('Type de parcours introuvable pour cet organisme', 404);
  return parcoursType;
};

const assertStructureCanChange = async (organismeId, niveaux) => {
  const nodes = await Noeud.find({ organismeId }).select('ordreNiveau').lean();
  const usedOrders = new Set(nodes.map((node) => node.ordreNiveau));
  const nextByOrder = new Map(niveaux.map((niveau) => [niveau.ordre, niveau]));

  for (const order of usedOrders) {
    const nextLevel = nextByOrder.get(order);
    if (!nextLevel) {
      throw new AppError(`Le niveau ${order} est deja utilise par des noeuds et ne peut pas etre supprime`, 409);
    }
  }

  const existingStructure = await Structure.findOne({ organismeId }).lean();
  if (!existingStructure) return;

  const existingByOrder = new Map(existingStructure.niveaux.map((niveau) => [niveau.ordre, niveau]));
  for (const order of usedOrders) {
    if (existingByOrder.get(order)?.type !== nextByOrder.get(order)?.type) {
      throw new AppError(`Le niveau ${order} est deja utilise et ne peut pas etre reordonne`, 409);
    }
  }
};

const listOrganismes = async ({ recherche = '', page = 1, limit = 20 } = {}) => {
  const normalizedSearch = normalizeText(recherche);
  const numericPage = Math.max(Number.parseInt(page, 10) || 1, 1);
  const numericLimit = Math.min(Math.max(Number.parseInt(limit, 10) || 20, 1), 100);
  const filter = normalizedSearch ? { nomNormalise: { $regex: normalizedSearch, $options: 'i' } } : {};
  const [data, total] = await Promise.all([
    Organisme.find(filter).sort('nom').skip((numericPage - 1) * numericLimit).limit(numericLimit).lean(),
    Organisme.countDocuments(filter),
  ]);
  return { data, pagination: { page: numericPage, limit: numericLimit, total, pages: Math.ceil(total / numericLimit) } };
};

const computeParcoursFlow = ({ hasParcoursType, selectedParcoursType, existingParcoursTypes = [] }) => {
  const shouldShowParcoursField = Boolean(hasParcoursType);
  const selected = shouldShowParcoursField ? (selectedParcoursType || null) : null;
  return {
    shouldShowParcoursField,
    selectedParcoursType: selected,
    autoAdvance: true,
  };
};

const ensureParcoursTypeForOrganisme = async (organismeId, payload = {}) => {
  const organisme = await getOrganismeOrThrow(organismeId);
  const parcoursTypeNom = payload.parcoursTypeNom || payload.nomParcoursType || payload.name;
  const hasParcoursType = payload.hasParcoursType === true || payload.hasParcoursType === 'true' || Boolean(parcoursTypeNom || payload.parcoursTypeId);
  if (!hasParcoursType) {
    await Organisme.findByIdAndUpdate(organisme._id, {
      $set: { hasParcoursType: false, parcoursTypeId: null },
    });
    return null;
  }

  const typeName = String(parcoursTypeNom || '').trim();
  if (!typeName && !payload.parcoursTypeId) {
    throw new AppError('Le type de parcours est obligatoire lorsque l option est activee', 400);
  }

  let parcoursType = null;
  if (payload.parcoursTypeId) {
    parcoursType = await ParcoursType.findOne({ _id: payload.parcoursTypeId, organismeId: organisme._id }).lean();
    if (!parcoursType) throw new AppError('Type de parcours introuvable pour cet organisme', 404);
  } else {
    parcoursType = await findOneAndUpdateWithDuplicateRetry(ParcoursType,
      { organismeId: organisme._id, nomNormalise: normalizeText(typeName) },
      {
        $setOnInsert: {
          organismeId: organisme._id,
          nom: typeName,
          nomNormalise: normalizeText(typeName),
          description: payload.description || '',
          isDefault: true,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true, collation: { locale: 'fr', strength: 2 } }
    );
  }

  await Organisme.findByIdAndUpdate(organisme._id, {
    $set: { hasParcoursType: true, parcoursTypeId: parcoursType._id },
  });
  return parcoursType;
};

const createOrganisme = async (payload) => {
  if (!payload.nom?.trim()) throw new AppError('Le nom de l organisme est obligatoire', 400);
  const nom = payload.nom.trim();
  const organisme = await findOneAndUpdateWithDuplicateRetry(Organisme,
    { nomNormalise: normalizeText(nom) },
    {
      $setOnInsert: {
        nom,
        nomNormalise: normalizeText(nom),
        logo: payload.logo?.trim(),
        description: payload.description?.trim() || '',
        hasParcoursType: Boolean(payload.hasParcoursType),
        parcoursTypeId: payload.parcoursTypeId || null,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const parcoursType = await ensureParcoursTypeForOrganisme(organisme._id, payload);
  return { ...organisme.toObject(), parcoursType: parcoursType ? { ...parcoursType } : null };
};

const listParcoursTypes = async ({ organismeId } = {}) => {
  const organisme = await getOrganismeOrThrow(organismeId);
  const parcoursTypes = await ParcoursType.find({ organismeId: organisme._id }).sort('nom').lean();
  return parcoursTypes;
};

const createParcoursType = async ({ organismeId, nom, isDefault = true } = {}) => {
  const organisme = await getOrganismeOrThrow(organismeId);
  if (!nom?.trim()) throw new AppError('Le nom du type de parcours est obligatoire', 400);
  const cleanName = nom.trim();
  const parcoursType = await findOneAndUpdateWithDuplicateRetry(ParcoursType,
    { organismeId: organisme._id, nomNormalise: normalizeText(cleanName) },
    {
      $setOnInsert: {
        organismeId: organisme._id,
        nom: cleanName,
        nomNormalise: normalizeText(cleanName),
        isDefault,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true, collation: { locale: 'fr', strength: 2 } }
  );

  await Organisme.findByIdAndUpdate(organisme._id, { $set: { hasParcoursType: true, parcoursTypeId: parcoursType._id } });
  return parcoursType;
};

const saveStructure = async (organismeId, niveaux) => {
  const organisme = await getOrganismeOrThrow(organismeId);
  if (!Array.isArray(niveaux) || !niveaux.length) {
    throw new AppError('Une structure doit contenir au moins un niveau', 400);
  }
  const normalizedLevels = niveaux.map((niveau, index) => ({
    ordre: index + 1,
    type: String(niveau.type || '').trim().toLowerCase(),
    libelleSingulier: String(niveau.libelleSingulier || '').trim(),
    libellePluriel: String(niveau.libellePluriel || '').trim(),
  }));
  const candidate = new Structure({ organismeId: organisme._id, niveaux: normalizedLevels });
  const validationError = candidate.validateSync();
  if (validationError) throw validationError;
  await assertStructureCanChange(organisme._id, normalizedLevels);
  return Structure.findOneAndUpdate(
    { organismeId: organisme._id },
    { $set: { niveaux: normalizedLevels } },
    { upsert: true, new: true, runValidators: true }
  );
};

const listNoeuds = async ({ organismeId, parentId, recherche = '', page = 1, limit = 50 }) => {
  const organism = toObjectId(organismeId, 'Organisme');
  const numericPage = Math.max(Number.parseInt(page, 10) || 1, 1);
  const numericLimit = Math.min(Math.max(Number.parseInt(limit, 10) || 50, 1), 100);
  const filter = { organismeId, parentId: parentId ? toObjectId(parentId, 'Parent') : null };
  const normalizedSearch = normalizeText(recherche);
  if (normalizedSearch) filter.nomNormalise = { $regex: normalizedSearch, $options: 'i' };
  const [data, total] = await Promise.all([
    Noeud.find({ ...filter, organismeId: organism }).sort('nom').skip((numericPage - 1) * numericLimit).limit(numericLimit).lean(),
    Noeud.countDocuments({ ...filter, organismeId: organism }),
  ]);
  return { data, pagination: { page: numericPage, limit: numericLimit, total, pages: Math.ceil(total / numericLimit) } };
};

const ensureDefaultStructure = async (organismeId) => {
  const existingStructure = await Structure.findOne({ organismeId }).lean();
  if (existingStructure) return existingStructure;

  const defaultLevels = [
    { ordre: 1, type: 'annee', libelleSingulier: 'Année', libellePluriel: 'Années' },
  ];

  const defaultStructure = await Structure.create({ organismeId, niveaux: defaultLevels });
  return defaultStructure.toObject();
};

const upsertNoeud = async (payload) => {
  const organisme = await getOrganismeOrThrow(payload.organismeId);
  const structure = await ensureDefaultStructure(organisme._id);
  if (!payload.nom?.trim()) throw new AppError('Le nom du noeud est obligatoire', 400);
  const parentId = payload.parentId ? toObjectId(payload.parentId, 'Parent') : null;
  let expectedOrder = 1;
  if (parentId) {
    const parent = await Noeud.findOne({ _id: parentId, organismeId: organisme._id });
    if (!parent) throw new AppError('Parent introuvable pour cet organisme', 400);
    expectedOrder = parent.ordreNiveau + 1;
  }
  if (expectedOrder > structure.niveaux.length) throw new AppError('Aucun niveau ne peut etre ajoute sous ce parent', 400);
  if (payload.ordreNiveau !== undefined && Number(payload.ordreNiveau) !== expectedOrder) {
    throw new AppError(`Le noeud doit appartenir au niveau ${expectedOrder}`, 400);
  }
  const nom = payload.nom.trim();
  return findOneAndUpdateWithDuplicateRetry(Noeud,
    { organismeId: organisme._id, parentId, nomNormalise: normalizeText(nom) },
    { $setOnInsert: { organismeId: organisme._id, parentId, ordreNiveau: expectedOrder, nom, nomNormalise: normalizeText(nom) } },
    { upsert: true, new: true, setDefaultsOnInsert: true, collation: { locale: 'fr', strength: 2 } }
  );
};

const listMatieres = async ({ organismeId, recherche = '', page = 1, limit = 50 }) => {
  const organism = toObjectId(organismeId, 'Organisme');
  const numericPage = Math.max(Number.parseInt(page, 10) || 1, 1);
  const numericLimit = Math.min(Math.max(Number.parseInt(limit, 10) || 50, 1), 100);
  const filter = { organismeId: organism };
  const normalizedSearch = normalizeText(recherche);
  if (normalizedSearch) filter.nomNormalise = { $regex: normalizedSearch, $options: 'i' };
  const [data, total] = await Promise.all([
    Matiere.find(filter).sort('nom').skip((numericPage - 1) * numericLimit).limit(numericLimit).lean(),
    Matiere.countDocuments(filter),
  ]);
  return { data, pagination: { page: numericPage, limit: numericLimit, total, pages: Math.ceil(total / numericLimit) } };
};

const upsertMatiere = async ({ organismeId, nom }) => {
  const organisme = await getOrganismeOrThrow(organismeId);
  if (!nom?.trim()) throw new AppError('Le nom de la matiere est obligatoire', 400);
  const cleanName = nom.trim();
  return findOneAndUpdateWithDuplicateRetry(Matiere,
    { organismeId: organisme._id, nomNormalise: normalizeText(cleanName) },
    { $setOnInsert: { organismeId: organisme._id, nom: cleanName, nomNormalise: normalizeText(cleanName) } },
    { upsert: true, new: true, setDefaultsOnInsert: true, collation: { locale: 'fr', strength: 2 } }
  );
};

const getLeafContext = async ({ noeudId, matiereId }) => {
  const node = await Noeud.findById(toObjectId(noeudId, 'Noeud'));
  if (!node) throw new AppError('Noeud introuvable', 404);
  const structure = await getStructureOrThrow(node.organismeId);
  if (node.ordreNiveau !== structure.niveaux.length) throw new AppError('Les documents doivent etre rattaches a un noeud feuille', 400);
  const matiere = await Matiere.findOne({ _id: toObjectId(matiereId, 'Matiere'), organismeId: node.organismeId });
  if (!matiere) throw new AppError('Matiere introuvable pour cet organisme', 400);
  return { node, matiere };
};

// Public catalogue ---------------------------------------------------------
//
// The administrative routes above intentionally return every catalogue item:
// an administrator needs to be able to prepare a structure before it contains
// a document. The mobile application must do the opposite: it only exposes a
// path when at least one published subject can be reached through that path.
const publishedSubjectFilter = {
  status: 'approved',
  type: 'sujet',
  noeudId: { $ne: null },
  matiereId: { $ne: null },
  isDeleted: { $ne: true },
};

const paginationFrom = ({ page = 1, limit = 50 } = {}) => {
  const numericPage = Math.max(Number.parseInt(page, 10) || 1, 1);
  const numericLimit = Math.min(Math.max(Number.parseInt(limit, 10) || 50, 1), 100);
  return { page: numericPage, limit: numericLimit };
};

const sameId = (left, right) => String(left || '') === String(right || '');

const listPublishedOrganismes = async ({ page, limit } = {}) => {
  const leafRows = await Document.aggregate([
    { $match: publishedSubjectFilter },
    { $group: { _id: '$noeudId', subjectCount: { $sum: 1 } } },
  ]);

  if (!leafRows.length) {
    const pagination = paginationFrom({ page, limit });
    return { data: [], pagination: { ...pagination, total: 0, pages: 0 } };
  }

  const subjectCountByLeaf = new Map(
    leafRows.map((row) => [String(row._id), Number(row.subjectCount) || 0])
  );
  const populatedLeafNodes = await Noeud.find({ _id: { $in: leafRows.map((row) => row._id) } })
    .select('organismeId')
    .lean();

  const subjectCountByOrganisme = new Map();
  populatedLeafNodes.forEach((node) => {
    const organismeId = String(node.organismeId);
    const count = subjectCountByLeaf.get(String(node._id)) || 0;
    subjectCountByOrganisme.set(organismeId, (subjectCountByOrganisme.get(organismeId) || 0) + count);
  });

  const organismeIds = [...subjectCountByOrganisme.keys()].map((id) => new mongoose.Types.ObjectId(id));
  const [organismes, structures] = await Promise.all([
    Organisme.find({ _id: { $in: organismeIds } }).sort('nom').lean(),
    Structure.find({ organismeId: { $in: organismeIds } }).lean(),
  ]);
  const structureByOrganisme = new Map(structures.map((structure) => [String(structure.organismeId), structure]));
  const items = organismes
    .map((organisme) => {
      const structure = structureByOrganisme.get(String(organisme._id));
      if (!structure) return null;
      return {
        ...organisme,
        // `name` makes the public DTO convenient for generic clients while
        // retaining `nom` as the canonical French database field.
        name: organisme.nom,
        structure: { niveaux: structure.niveaux },
        subjectCount: subjectCountByOrganisme.get(String(organisme._id)) || 0,
      };
    })
    .filter(Boolean);

  const pagination = paginationFrom({ page, limit });
  const start = (pagination.page - 1) * pagination.limit;
  return {
    data: items.slice(start, start + pagination.limit),
    pagination: {
      ...pagination,
      total: items.length,
      pages: Math.ceil(items.length / pagination.limit),
    },
  };
};

const listPublishedNoeuds = async ({ organismeId, parentId, parcoursTypeId, recherche = '', page, limit } = {}) => {
  const organisme = await getOrganismeOrThrow(organismeId);
  const structure = await getStructureOrThrow(organisme._id);
  const parcoursType = await getParcoursTypeOrThrow(organisme._id, parcoursTypeId);
  const parent = parentId && parentId !== 'root'
    ? await Noeud.findOne({ _id: toObjectId(parentId, 'Parent'), organismeId: organisme._id }).lean()
    : null;

  if (parentId && parentId !== 'root' && !parent) {
    throw new AppError('Parent introuvable pour cet organisme', 400);
  }

  const [leafRows, nodes] = await Promise.all([
    Document.aggregate([
      { $match: { ...publishedSubjectFilter, ...(parcoursType ? { parcoursTypeId: parcoursType._id } : {}) } },
      {
        $lookup: {
          from: Noeud.collection.name,
          localField: 'noeudId',
          foreignField: '_id',
          as: 'leaf',
        },
      },
      { $unwind: '$leaf' },
      { $match: { 'leaf.organismeId': organisme._id } },
      { $group: { _id: '$noeudId', subjectCount: { $sum: 1 } } },
    ]),
    Noeud.find({ organismeId: organisme._id }).sort('nom').lean(),
  ]);

  const nodesById = new Map(nodes.map((node) => [String(node._id), node]));
  const countsByChild = new Map();
  const requestedParentId = parent?._id || null;

  leafRows.forEach((row) => {
    let current = nodesById.get(String(row._id));
    const seen = new Set();
    while (current && !seen.has(String(current._id))) {
      seen.add(String(current._id));
      if (sameId(current.parentId, requestedParentId)) {
        const id = String(current._id);
        countsByChild.set(id, (countsByChild.get(id) || 0) + (Number(row.subjectCount) || 0));
        break;
      }
      current = current.parentId ? nodesById.get(String(current.parentId)) : null;
    }
  });

  const normalizedSearch = normalizeText(recherche);
  const items = [...countsByChild.keys()]
    .map((id) => nodesById.get(id))
    .filter(Boolean)
    .filter((node) => !normalizedSearch || node.nomNormalise.includes(normalizedSearch))
    .sort((left, right) => left.nom.localeCompare(right.nom, 'fr'))
    .map((node) => ({
      ...node,
      name: node.nom,
      subjectCount: countsByChild.get(String(node._id)) || 0,
    }));

  const pagination = paginationFrom({ page, limit });
  const start = (pagination.page - 1) * pagination.limit;
  return {
    organisme: { _id: organisme._id, nom: organisme.nom, name: organisme.nom },
    structure: { niveaux: structure.niveaux },
    data: items.slice(start, start + pagination.limit),
    pagination: {
      ...pagination,
      total: items.length,
      pages: Math.ceil(items.length / pagination.limit),
    },
  };
};

const listPublishedMatieres = async ({ organismeId, noeudId, parcoursTypeId, recherche = '', page, limit } = {}) => {
  const organisme = await getOrganismeOrThrow(organismeId);
  const structure = await getStructureOrThrow(organisme._id);
  const parcoursType = await getParcoursTypeOrThrow(organisme._id, parcoursTypeId);
  const node = await Noeud.findOne({
    _id: toObjectId(noeudId, 'Noeud'),
    organismeId: organisme._id,
  }).lean();

  if (!node) throw new AppError('Noeud introuvable pour cet organisme', 404);
  if (node.ordreNiveau !== structure.niveaux.length) {
    throw new AppError('Les matières ne sont disponibles qu après le dernier niveau', 400);
  }

  const rows = await Document.aggregate([
    {
      $match: {
        ...publishedSubjectFilter,
        noeudId: node._id,
        ...(parcoursType ? { parcoursTypeId: parcoursType._id } : {}),
      },
    },
    { $group: { _id: '$matiereId', subjectCount: { $sum: 1 } } },
  ]);
  const subjectCountByMatiere = new Map(rows.map((row) => [String(row._id), Number(row.subjectCount) || 0]));
  const matieres = rows.length
    ? await Matiere.find({ _id: { $in: rows.map((row) => row._id) }, organismeId: organisme._id }).lean()
    : [];
  const normalizedSearch = normalizeText(recherche);
  const items = matieres
    .filter((matiere) => !normalizedSearch || matiere.nomNormalise.includes(normalizedSearch))
    .sort((left, right) => left.nom.localeCompare(right.nom, 'fr'))
    .map((matiere) => ({
      ...matiere,
      name: matiere.nom,
      subjectCount: subjectCountByMatiere.get(String(matiere._id)) || 0,
    }));

  const pagination = paginationFrom({ page, limit });
  const start = (pagination.page - 1) * pagination.limit;
  return {
    data: items.slice(start, start + pagination.limit),
    pagination: {
      ...pagination,
      total: items.length,
      pages: Math.ceil(items.length / pagination.limit),
    },
  };
};

module.exports = {
  computeParcoursFlow,
  getOrganismeOrThrow,
  getStructureOrThrow,
  ensureDefaultStructure,
  listOrganismes,
  createOrganisme,
  saveStructure,
  listNoeuds,
  upsertNoeud,
  listMatieres,
  upsertMatiere,
  getLeafContext,
  listParcoursTypes,
  createParcoursType,
  listPublishedOrganismes,
  listPublishedNoeuds,
  listPublishedMatieres,
};
