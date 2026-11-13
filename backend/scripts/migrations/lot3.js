#!/usr/bin/env node
// Aucun dotenv, aucune connexion implicite ; exclusivement une base locale explicite.
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { assertLocalUri } = require('./lot1');
const service = require('../../services/prep/publicationService');
const Content = require('../../models/PrepContent');
const Publication = require('../../models/PrepPublication');
const Organisme = require('../../models/Organisme');
const ParcoursType = require('../../models/ParcoursType');
const packPath = path.resolve(__dirname, '../../data/prep/build/pack.json');
const finishMigration = async () => {
  for (const Model of [Organisme, ParcoursType, require('../../models/Noeud'), require('../../models/Matiere')]) {
    await Model.updateMany({ status: { $exists: false } }, { $set: { status: 'published' } });
    await Model.createIndexes();
  }
  // Une vidéo sans révision reste explicitement « à revalider » ; ne pas inventer son origine.
  await require('../../models/PrepVideo').updateMany({ 'source.contentRevision': { $exists: false } }, { $set: { 'source.needsReview': true } });
};
const migrate = async ({ apply = false, links = {} } = {}) => {
  const active = await service.current();
  if (active.generation) {
    if (apply) await finishMigration();
    return { alreadyImported: true, generation: active.generation, dryRun: !apply };
  }
  const pack = JSON.parse(fs.readFileSync(packPath, 'utf8'));
  const unresolved = [];
  const rows = Object.values(pack.modules).map(payload => ({ kind: 'module', code: payload.code, payload }));
  for (const p of pack.programmes) {
    const explicit = links[p.code];
    const orgs = explicit?.organismeId ? await Organisme.find({ _id: explicit.organismeId }).lean()
      : await Organisme.find({ nom: { $in: p.organisme.recherche.map(r => new RegExp(`^${r.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\b|\\s|-|$)`, 'i')) } }).lean();
    const org = orgs.length === 1 ? orgs[0] : null;
    const parcours = org && await ParcoursType.findOne({ organismeId: org._id, ...(explicit?.parcoursTypeId ? { _id: explicit.parcoursTypeId } : { nom: p.parcoursType }) }).lean();
    if (!org || !parcours) unresolved.push(p.code);
    rows.push({ kind: 'programme', code: p.code, payload: { ...p, organismeId: org ? String(org._id) : null, parcoursTypeId: parcours ? String(parcours._id) : null } });
  }
  await service.validateRows(rows);
  const summary = { dryRun: !apply, modules: Object.keys(pack.modules).length, programmes: pack.programmes.length, unresolved,
    historicalCodes: 'Aucune progression ni vidéo historique réattribuée. Les codes réutilisés nécessitent une correspondance éditoriale.' };
  if (!apply) return summary;
  if (unresolved.length) throw new Error(`Rapprochement catalogue requis avant import : ${unresolved.join(', ')}. Fournir --links=chemin.json.`);
  await Content.createIndexes();
  await Publication.createIndexes();
  const revisions = [];
  for (const item of rows) {
    const existing = await service.latest(item.kind, item.code);
    if (existing && existing.hash !== service.hash(item.payload)) throw new Error(`Édition existante conservée : ${item.code}. Import interrompu, publication inchangée.`);
    revisions.push(existing || await service.saveDraft(item, true));
  }
  const published = await service.publish({ expectedGeneration: 0, revisions }, null, { bootstrap: true });
  await finishMigration();
  return { ...summary, generation: published.generation };
};
const main = async () => {
  const args = process.argv.slice(2);
  const uri = args.find(v => v.startsWith('--uri='))?.slice(6);
  assertLocalUri(uri);
  const file = args.find(v => v.startsWith('--links='))?.slice(8);
  if (file && /(^|\/)(\.env[^/]*|keys\.text|credentials[^/]*)$/i.test(file)) throw new Error('Fichier de correspondance interdit');
  const links = file ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
  await mongoose.connect(uri, { autoIndex: false, autoCreate: false });
  try { console.log(JSON.stringify(await migrate({ apply: args.includes('--apply'), links }), null, 2)); }
  finally { await mongoose.disconnect(); }
};
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { migrate, assertLocalUri };
