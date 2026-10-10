/**
 * Audit du catalogue public et gestion des alias d'organismes.
 *
 *   npm run catalog -- audit [alias]          Anomalies de parcours (lecture seule)
 *   npm run catalog -- aliases                Alias publics de chaque organisme (/sujets/<alias>)
 *   npm run catalog -- set-alias <alias|id> <nouvel-alias>
 *   npm run catalog -- set-logo <alias|id> <url|->   Logo officiel (https://… ou /organismes/<alias>.svg) ; « - » le retire
 *
 * L'audit repère ce qui produit un fil d'Ariane du type « … > 2023 > 2023 » ou une liste de
 * sujets impossible à charger : niveau qui répète son parent, matière nommée comme une année
 * ou comme son niveau, sujet rattaché à un niveau qui n'est pas le dernier, parcours étranger.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Organisme = require('../models/Organisme');
const Structure = require('../models/Structure');
const Noeud = require('../models/Noeud');
const Matiere = require('../models/Matiere');
const ParcoursType = require('../models/ParcoursType');
const Document = require('../models/Document');
const { slugify, compactSlug } = require('../utils/slug');
const { assignOrganismeSlug, ensureOrganismeSlugs } = require('../services/dynamicCatalogService');

const YEAR = /^(19|20)\d{2}$/;
const published = { status: 'approved', type: 'sujet', isDeleted: { $ne: true }, noeudId: { $ne: null }, matiereId: { $ne: null } };

const findOrganisme = async (value) => {
  if (mongoose.Types.ObjectId.isValid(value)) {
    const byId = await Organisme.findById(value);
    if (byId) return byId;
  }
  const all = await Organisme.find();
  return all.find((item) => (item.slug || slugify(item.nom)) === slugify(value))
    || all.find((item) => compactSlug(item.slug || item.nom) === compactSlug(value))
    || null;
};

const pathOf = (node, nodesById) => {
  const names = [];
  let current = node;
  const seen = new Set();
  while (current && !seen.has(String(current._id))) {
    seen.add(String(current._id));
    names.unshift(current.nom);
    current = current.parentId ? nodesById.get(String(current.parentId)) : null;
  }
  return names;
};

const audit = async (filterValue) => {
  const organismes = filterValue ? [await findOrganisme(filterValue)].filter(Boolean) : await Organisme.find().sort('nom');
  if (!organismes.length) {
    console.log(`Aucun organisme ne correspond à « ${filterValue} ».`);
    return;
  }

  let total = 0;
  for (const organisme of organismes) {
    const [structure, nodes, parcoursTypes, documents] = await Promise.all([
      Structure.findOne({ organismeId: organisme._id }).lean(),
      Noeud.find({ organismeId: organisme._id }).lean(),
      ParcoursType.find({ organismeId: organisme._id }).lean(),
      Document.find({ ...published }).select('noeudId matiereId parcoursTypeId titre title').lean(),
    ]);
    const nodesById = new Map(nodes.map((node) => [String(node._id), node]));
    const ownDocs = documents.filter((doc) => nodesById.has(String(doc.noeudId)));
    const matieres = await Matiere.find({ _id: { $in: ownDocs.map((doc) => doc.matiereId) } }).lean();
    const matieresById = new Map(matieres.map((matiere) => [String(matiere._id), matiere]));
    const levels = structure?.niveaux || [];
    const problems = [];

    const labels = levels.map((level) => normalize(level.libelleSingulier));
    if (new Set(labels).size !== labels.length) {
      problems.push(`Structure avec un niveau répété : ${levels.map((level) => level.libelleSingulier).join(' > ')}`);
    }

    nodes.forEach((node) => {
      const parent = node.parentId ? nodesById.get(String(node.parentId)) : null;
      if (parent && parent.nomNormalise === node.nomNormalise) {
        problems.push(`Niveau qui répète son parent : ${pathOf(node, nodesById).join(' > ')} (noeud ${node._id})`);
      }
    });

    parcoursTypes.forEach((type) => {
      if (type.nomNormalise === organisme.nomNormalise) problems.push(`Parcours portant le nom de l’organisme : « ${type.nom} » (${type._id})`);
    });

    const parcoursIds = new Set(parcoursTypes.map((type) => String(type._id)));
    const reported = new Set();
    ownDocs.forEach((doc) => {
      const node = nodesById.get(String(doc.noeudId));
      const matiere = matieresById.get(String(doc.matiereId));
      const where = `${pathOf(node, nodesById).join(' > ')} > ${matiere?.nom || '?'}`;
      const once = (key, message) => { if (!reported.has(key)) { reported.add(key); problems.push(message); } };
      if (levels.length && node.ordreNiveau !== levels.length) once(`leaf:${node._id}`, `Sujets rattachés à un niveau intermédiaire (${node.ordreNiveau}/${levels.length}) : ${where} — liste impossible à charger`);
      if (!matiere) once(`m:${doc.matiereId}`, `Matière absente ou d’un autre organisme : ${where}`);
      else if (YEAR.test(matiere.nom.trim())) once(`year:${matiere._id}`, `Matière nommée comme une année : ${where} (matière ${matiere._id})`);
      else if (matiere.nomNormalise === node.nomNormalise) once(`same:${matiere._id}:${node._id}`, `Matière qui répète le niveau : ${where} (matière ${matiere._id})`);
      if (doc.parcoursTypeId && !parcoursIds.has(String(doc.parcoursTypeId))) once(`pt:${doc.parcoursTypeId}`, `Sujet rattaché à un parcours d’un autre organisme : ${where}`);
      if (parcoursTypes.length && !doc.parcoursTypeId) once(`nopt:${node._id}`, `Sujets sans parcours alors que l’organisme en a (invisibles dans le parcours) : ${where}`);
    });

    if (problems.length || filterValue) {
      console.log(`\n${organisme.nom.toUpperCase()}  (alias : ${organisme.slug || '—'}, ${ownDocs.length} sujet(s) publié(s))`);
      console.log(`  Structure : ${levels.map((level) => level.libelleSingulier).join(' > ') || '—'} · Parcours : ${parcoursTypes.map((type) => type.nom).join(', ') || '—'}`);
      problems.forEach((problem) => console.log(`  ⚠ ${problem}`));
      if (!problems.length) console.log('  ✓ Aucune anomalie');
    }
    total += problems.length;
  }
  console.log(`\n${total} anomalie(s) sur ${organismes.length} organisme(s).`);
};

const normalize = (value) => String(value || '').trim().toLowerCase();

const main = async () => {
  const [command, arg1, arg2] = process.argv.slice(2);
  await mongoose.connect(process.env.MONGODB_URI);
  try {
    if (command === 'audit') return await audit(arg1);
    if (command === 'aliases') {
      const assigned = await ensureOrganismeSlugs();
      if (assigned) console.log(`${assigned} alias attribué(s).`);
      (await Organisme.find().sort('nom').lean()).forEach((item) => console.log(`${item.nom.toUpperCase().padEnd(40)} /sujets/${item.slug}`));
      return undefined;
    }
    if (command === 'set-alias') {
      const organisme = await findOrganisme(arg1);
      if (!organisme || !arg2) throw new Error('Usage : set-alias <alias|id> <nouvel-alias>');
      const slug = await assignOrganismeSlug(organisme, arg2);
      console.log(`${organisme.nom.toUpperCase()} → /sujets/${slug}${slug !== slugify(arg2) ? ' (alias demandé déjà pris)' : ''}`);
      return undefined;
    }
    if (command === 'set-logo') {
      const organisme = await findOrganisme(arg1);
      if (!organisme || !arg2) throw new Error('Usage : set-logo <alias|id> <https://…|/organismes/fichier.svg|->');
      // Même règle que l'affichage web : https, ou fichier servi par le site (dossier public/).
      if (arg2 !== '-' && !/^(https:\/\/|\/(?!\/))\S+$/.test(arg2)) throw new Error('Logo refusé : adresse https:// ou chemin /organismes/… attendu.');
      await Organisme.updateOne({ _id: organisme._id }, arg2 === '-' ? { $unset: { logo: 1 } } : { $set: { logo: arg2 } });
      console.log(`${organisme.nom.toUpperCase()} → ${arg2 === '-' ? 'monogramme Fatafalta' : arg2}`);
      return undefined;
    }
    console.log('Commandes : audit [alias] | aliases | set-alias <alias|id> <nouvel-alias> | set-logo <alias|id> <url|->');
    return undefined;
  } finally {
    await mongoose.disconnect();
  }
};

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
