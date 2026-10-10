/**
 * Flux SEO du catalogue (pré-rendu du site web), sur une base jetable.
 *   TEST_MONGODB_URI=mongodb://127.0.0.1:27017/fatafalta-seo-test node --test tests/seoCatalog.test.js
 */
process.env.NODE_ENV = 'test';

const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const uri = process.env.TEST_MONGODB_URI;
const skip = !uri && 'TEST_MONGODB_URI non defini';

const Document = require('../models/Document');
const Structure = require('../models/Structure');
const catalog = require('../services/dynamicCatalogService');
const { buildSeoCatalog, getSeoCatalog } = require('../services/seoCatalogService');
const { notifyCatalogChange, submitIndexNow } = require('../services/seoNotifier');

test.before(async () => {
  if (skip) return;
  await mongoose.connect(uri);
  await mongoose.connection.dropDatabase();
});

test.after(async () => {
  if (skip) return;
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

const subject = (fields) => ({
  type: 'sujet', documentType: 'sujet', status: 'approved', isDeleted: false,
  file: `${new mongoose.Types.ObjectId()}.pdf`, storageKey: `documents/secret/${new mongoose.Types.ObjectId()}.pdf`, storageProvider: 'r2',
  uploadedBy: new mongoose.Types.ObjectId(), originalFileName: 'sujet.pdf', fileType: 'PDF', extension: '.pdf',
  mimeType: 'application/pdf', fileSize: 2048, dateAjout: new Date(), createdAt: new Date(), updatedAt: new Date(),
  ...fields,
});

test('only published subjects reach the SEO feed, without any internal field', { skip }, async () => {
  const organisme = await catalog.createOrganisme({ nom: 'INP-HB' });
  await Structure.create({
    organismeId: organisme._id,
    niveaux: [{ ordre: 1, type: 'annee', libelleSingulier: 'Année', libellePluriel: 'Années' }],
  });
  const year = await catalog.upsertNoeud({ organismeId: organisme._id, nom: '2025' });
  const maths = await catalog.upsertMatiere({ organismeId: organisme._id, nom: 'Mathématiques' });
  const empty = await catalog.createOrganisme({ nom: 'Organisme vide' });
  await Structure.create({ organismeId: empty._id, niveaux: [{ ordre: 1, type: 'annee', libelleSingulier: 'Année', libellePluriel: 'Années' }] });

  const base = { noeudId: year._id, matiereId: maths._id };
  const { insertedIds } = await Document.collection.insertMany([
    subject({ ...base, title: 'Publié' }),
    subject({ ...base, title: 'En attente', status: 'pending' }),
    subject({ ...base, title: 'Supprimé', isDeleted: true }),
    subject({ ...base, title: 'Inclus', correctionIncludedInPdf: true }),
  ]);
  await Document.collection.insertOne(subject({
    ...base, title: undefined, type: 'correction', documentType: 'corrige', correctionFor: insertedIds[0], sujetParentId: insertedIds[0],
  }));

  const feed = await buildSeoCatalog();
  assert.equal(feed.organismes.length, 1, 'organisme sans sujet publié exclu');
  const [inphb] = feed.organismes;
  assert.equal(inphb.slug, 'inphb');
  assert.deepEqual(inphb.documents.map((document) => document.title).sort(), ['Inclus', 'Publié']);
  assert.ok(inphb.documents.every((document) => document.hasCorrection), 'corrigé séparé et corrigé inclus');
  assert.deepEqual(inphb.noeuds.map((node) => node.nom), ['2025']);
  assert.deepEqual(inphb.matieres.map((matiere) => matiere.nom), ['Mathématiques']);

  const serialized = JSON.stringify(feed);
  ['storageKey', 'secret/key', 'uploadedBy', '"file"', 'originalFileName', 'views', 'downloads'].forEach((field) => {
    assert.ok(!serialized.includes(field), `${field} ne doit pas être publié`);
  });
});

test('a catalogue change invalidates the cached feed', { skip }, async () => {
  const before = await getSeoCatalog();
  const organisme = before.organismes[0];
  await Document.collection.insertOne(subject({ title: 'Nouveau', noeudId: new mongoose.Types.ObjectId(organisme.noeuds[0]._id), matiereId: new mongoose.Types.ObjectId(organisme.matieres[0]._id) }));
  assert.equal((await getSeoCatalog()).organismes[0].documents.length, before.organismes[0].documents.length, 'cache servi');
  notifyCatalogChange(['x']);
  assert.equal((await getSeoCatalog()).organismes[0].documents.length, before.organismes[0].documents.length + 1);
});

test('IndexNow stays silent without a key and never submits foreign hosts', async () => {
  delete process.env.INDEXNOW_KEY;
  assert.equal(await submitIndexNow(['https://fatafalta.onrender.com/sujets']), null);
  process.env.INDEXNOW_KEY = 'a1b2c3d4e5f6a7b8';
  assert.equal(await submitIndexNow(['https://example.com/page']), null);
  delete process.env.INDEXNOW_KEY;
});
