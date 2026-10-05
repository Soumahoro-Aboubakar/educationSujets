/**
 * Alias d'URL des organismes et garde-fous de saisie du catalogue, sur une base jetable.
 *   TEST_MONGODB_URI=mongodb://127.0.0.1:27017/fatafalta-catalog-test node --test tests/catalogAliases.test.js
 */
process.env.NODE_ENV = 'test';

const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const uri = process.env.TEST_MONGODB_URI;
const skip = !uri && 'TEST_MONGODB_URI non defini';

const Organisme = require('../models/Organisme');
const Noeud = require('../models/Noeud');
const Matiere = require('../models/Matiere');
const Document = require('../models/Document');
const { slugify, compactSlug } = require('../utils/slug');
const catalog = require('../services/dynamicCatalogService');
const { listDynamicDocuments } = require('../services/documentService');

test.before(async () => {
  if (skip) return;
  await mongoose.connect(uri);
  await mongoose.connection.dropDatabase();
  await Promise.all([Organisme.syncIndexes(), Noeud.syncIndexes(), Matiere.syncIndexes()]);
});

test.after(async () => {
  if (skip) return;
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

test('slugify produces short, readable, case-insensitive aliases', () => {
  assert.equal(slugify('INP-HB'), 'inphb');
  assert.equal(slugify('ENA'), 'ena');
  assert.equal(slugify('Exploitation en Aéronautique Civile'), 'exploitation-en-aeronautique-civile');
  assert.equal(slugify('  École   d’Été '), 'ecole-dete');
  assert.equal(slugify('2023'), '2023');
  assert.equal(slugify('InPhB'), slugify('INPHB'));
  assert.equal(compactSlug('inp-hb'), compactSlug('INPHB'));
});

test('every organisme gets a unique alias, including existing ones (idempotent backfill)', { skip }, async () => {
  const created = await catalog.createOrganisme({ nom: 'INP-HB' });
  assert.equal(created.slug, 'inphb');

  // Organismes antérieurs aux alias : insérés sans slug.
  await Organisme.collection.insertMany([
    { nom: 'ENA', nomNormalise: 'ena' },
    { nom: 'E.N.A', nomNormalise: 'e.n.a' },
  ]);
  assert.equal(await catalog.ensureOrganismeSlugs(), 2);
  const slugs = (await Organisme.find({ nom: { $in: ['ENA', 'E.N.A'] } }).lean()).map((item) => item.slug).sort();
  assert.deepEqual(slugs, ['ena', 'ena-2']);
  assert.equal(await catalog.ensureOrganismeSlugs(), 0, 'nothing left to assign');
});

test('a year can no longer be created as a subject, and a level cannot repeat its parent', { skip }, async () => {
  const organisme = await catalog.createOrganisme({ nom: 'EAMAC' });
  const Structure = require('../models/Structure');
  await Structure.create({
    organismeId: organisme._id,
    niveaux: [
      { ordre: 1, type: 'filiere', libelleSingulier: 'Filière', libellePluriel: 'Filières' },
      { ordre: 2, type: 'annee', libelleSingulier: 'Année', libellePluriel: 'Années' },
      { ordre: 3, type: 'session', libelleSingulier: 'Session', libellePluriel: 'Sessions' },
    ],
  });

  const filiere = await catalog.upsertNoeud({ organismeId: organisme._id, nom: 'Exploitation en Aéronautique Civile' });
  const year = await catalog.upsertNoeud({ organismeId: organisme._id, parentId: filiere._id, nom: '2023' });
  assert.equal(year.ordreNiveau, 2);

  await assert.rejects(
    catalog.upsertNoeud({ organismeId: organisme._id, parentId: year._id, nom: '2023' }),
    { errorCode: 'CATALOG_DUPLICATE_LEVEL' },
  );
  await assert.rejects(catalog.upsertMatiere({ organismeId: organisme._id, nom: '2023' }), { errorCode: 'CATALOG_YEAR_AS_SUBJECT' });

  // Une matière « 2023 » déjà en base reste sélectionnable (rien n'est cassé), seule la création est refusée.
  await Matiere.collection.insertOne({ organismeId: organisme._id, nom: '2023', nomNormalise: '2023' });
  const legacy = await catalog.upsertMatiere({ organismeId: organisme._id, nom: '2023' });
  assert.equal(legacy.nom, '2023');

  const maths = await catalog.upsertMatiere({ organismeId: organisme._id, nom: 'Mathématiques' });
  assert.equal(maths.nom, 'Mathématiques');
});

test('filtering a subject list by text no longer crashes (« Les sujets n’ont pas pu être chargés »)', { skip }, async () => {
  const organisme = await Organisme.findOne({ slug: 'eamac' });
  const year = await Noeud.findOne({ organismeId: organisme._id, nom: '2023' });
  const maths = await Matiere.findOne({ organismeId: organisme._id, nom: 'Mathématiques' });
  await Document.collection.insertOne({
    titre: 'Épreuve de mathématiques', type: 'sujet', status: 'approved', noeudId: year._id, matiereId: maths._id,
    isDeleted: false, dateAjout: new Date(), createdAt: new Date(),
  });

  const session = await catalog.upsertNoeud({ organismeId: organisme._id, parentId: year._id, nom: 'Session normale' });
  await Document.collection.updateOne({ titre: 'Épreuve de mathématiques' }, { $set: { noeudId: session._id } });
  const all = await listDynamicDocuments({ noeudId: String(session._id), matiereId: String(maths._id) });
  assert.equal(all.data.length, 1);
  const filtered = await listDynamicDocuments({ noeudId: String(session._id), matiereId: String(maths._id), recherche: 'épreuve' });
  assert.equal(filtered.data.length, 1);
  const none = await listDynamicDocuments({ noeudId: String(session._id), matiereId: String(maths._id), recherche: 'physique' });
  assert.equal(none.data.length, 0);
});

test('the public catalogue exposes the alias, never requiring the ObjectId', { skip }, async () => {
  const { data } = await catalog.listPublishedOrganismes({});
  const eamac = data.find((item) => item.nom === 'EAMAC');
  assert.equal(eamac.slug, 'eamac');
});
