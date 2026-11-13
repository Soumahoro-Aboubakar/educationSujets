const crypto = require('crypto');
const Content = require('../../models/PrepContent');
const Publication = require('../../models/PrepPublication');
const Organisme = require('../../models/Organisme');
const ParcoursType = require('../../models/ParcoursType');
const AppError = require('../../utils/errors');
const log = require('../security/securityLogger');
const { validateContent, validCode } = require('./contentValidator');
const key = r => `${r.kind}:${r.code}`;
const hash = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const invalid = (message, details) => new AppError(message, 422, details, 'PREP_CONTENT_INVALID');
const conflict = () => new AppError('Le contenu a changé. Recharge la version courante.', 409, undefined, 'PREP_CONFLICT');
const assertKey = (kind, code) => {
  if (!['programme', 'module'].includes(kind) || !validCode(code)) throw new AppError('Type ou code de contenu invalide', 400);
};
const current = async () => await Publication.findById('active').lean() || { generation: 0, schemaVersion: 1, entries: [], tombstones: [], history: [] };
const latest = async (kind, code) => { assertKey(kind, code); return Content.findOne({ kind, code }).sort({ revision: -1 }).lean(); };
const cleanPayload = (kind, code, payload) => {
  assertKey(kind, code);
  if (!payload || typeof payload !== 'object' || Array.isArray(payload) || payload.code !== code) throw invalid('Le code est obligatoire et immuable');
  const json = JSON.stringify(payload);
  if (Buffer.byteLength(json) > 2 * 1024 * 1024 || /"(?:__proto__|constructor|prototype)"\s*:/.test(json)) throw invalid('Contenu trop volumineux ou champ interdit');
  return JSON.parse(json);
};
const saveDraft = async ({ kind, code, payload, expectedRevision, author }, create = false) => {
  payload = cleanPayload(kind, code, payload);
  const previous = await latest(kind, code);
  if (create && previous) throw conflict();
  if (!create && (!previous || expectedRevision !== previous.revision)) throw conflict();
  try {
    const row = await Content.create({ kind, code, revision: (previous?.revision || 0) + 1, payload, hash: hash(payload), author });
    log.info('prep.draft', { actorId: author, key: key(row), count: row.revision });
    return row.toObject();
  } catch (error) { if (error.code === 11000) throw conflict(); throw error; }
};
const readEntries = async entries => {
  if (!entries.length) return [];
  const rows = await Content.find({ $or: entries.map(({ kind, code, revision }) => ({ kind, code, revision })) }).lean();
  if (rows.length !== entries.length) throw invalid('Révision de contenu introuvable');
  return rows;
};
const validateRows = async rows => {
  const payloads = rows.map(r => structuredClone(r.payload));
  const modules = payloads.filter((_, i) => rows[i].kind === 'module');
  const programmes = payloads.filter((_, i) => rows[i].kind === 'programme');
  let checked;
  try { checked = validateContent(modules, programmes); } catch { throw invalid('Structure du contenu invalide'); }
  const errors = checked.errors;
  for (const prog of programmes) {
    if (prog.organismeId) {
      if (!/^[a-f0-9]{24}$/i.test(prog.organismeId) || !await Organisme.exists({ _id: prog.organismeId, status: { $nin: ['draft', 'archived'] } })) errors.push(`${prog.code} : organisme publié introuvable`);
    }
    if (prog.parcoursTypeId && (!/^[a-f0-9]{24}$/i.test(prog.parcoursTypeId) || !await ParcoursType.exists({ _id: prog.parcoursTypeId, organismeId: prog.organismeId, status: { $nin: ['draft', 'archived'] } }))) errors.push(`${prog.code} : parcours invalide`);
  }
  if (errors.length) throw invalid('Le contenu ne peut pas être publié', errors);
  return checked;
};
const candidate = async ({ revisions = [], removals = [], expectedGeneration, rollbackGeneration }, active) => {
  if (!Number.isSafeInteger(expectedGeneration) || expectedGeneration !== active.generation) throw conflict();
  if (!Array.isArray(revisions) || !Array.isArray(removals) || revisions.length > 500 || removals.length > 500) throw invalid('Liste de révisions invalide');
  let entries = active.entries;
  if (rollbackGeneration !== undefined) {
    const old = active.history.find(h => h.generation === rollbackGeneration);
    if (!old) throw invalid('Publication historique introuvable');
    entries = old.entries;
  }
  const map = new Map(entries.map(r => [key(r), r]));
  const changed = new Set();
  for (const ref of revisions) {
    if (!ref || typeof ref !== 'object') throw invalid('Référence invalide');
    assertKey(ref.kind, ref.code);
    if (!Number.isSafeInteger(ref.revision) || ref.revision < 1 || changed.has(key(ref))) throw invalid('Révision invalide ou dupliquée');
    changed.add(key(ref)); map.set(key(ref), ref);
  }
  for (const ref of removals) { if (!ref || typeof ref !== 'object') throw invalid('Retrait invalide'); assertKey(ref.kind, ref.code); map.delete(key(ref)); }
  const rows = await readEntries([...map.values()]);
  if (rows.some(r => r.status === 'archived')) throw invalid('Brouillon supprimé');
  await validateRows(rows);
  return rows;
};
const publish = async (input, author, { bootstrap = false } = {}) => {
  const active = await current();
  const rows = await candidate(input, active);
  if (!active.generation && !bootstrap) throw new AppError('Importe d’abord le pack avec la migration lot3 avant la première publication.', 409);
  // Scelle les révisions AVANT le CAS. Un arrêt ici laisse l'ancienne publication intacte.
  // Une révision scellée orpheline reste réutilisable mais jamais visible au public.
  await Content.updateMany({ _id: { $in: rows.map(r => r._id) }, status: 'draft' }, { $set: { status: 'published', publishedAt: new Date() } });
  if (await Content.countDocuments({ _id: { $in: rows.map(r => r._id) }, status: 'published' }) !== rows.length) throw conflict();
  const entries = rows.map(({ kind, code, revision, hash: fingerprint, schemaVersion }) => ({ kind, code, revision, hash: fingerprint, schemaVersion }));
  const keys = new Set(entries.map(key));
  const generation = active.generation + 1;
  const tombstones = [...active.tombstones.filter(r => !keys.has(key(r))), ...active.entries.filter(r => !keys.has(key(r)) && !active.tombstones.some(t => key(t) === key(r))).map(r => ({ kind: r.kind, code: r.code, generation }))];
  const snapshot = { generation, schemaVersion: 1, entries, tombstones };
  try {
    const updated = await Publication.findOneAndUpdate({ _id: 'active', generation: active.generation }, {
      $set: { ...snapshot, author }, $push: { history: snapshot },
    }, { upsert: active.generation === 0, new: true });
    if (!updated) throw conflict();
  } catch (error) { if (error.code === 11000) throw conflict(); throw error; }
  log.info('prep.publish', { actorId: author, count: generation, key: 'active' });
  return snapshot;
};
const validateDraft = async (kind, code, revision) => {
  assertKey(kind, code);
  if (revision !== undefined && (!Number.isSafeInteger(revision) || revision < 1)) throw invalid('Révision invalide');
  const active = await current();
  const row = revision ? await Content.findOne({ kind, code, revision }).lean() : await latest(kind, code);
  if (!row) throw new AppError('Contenu introuvable', 404);
  await candidate({ expectedGeneration: active.generation, revisions: [row] }, active);
  return { valid: true, revision: row.revision };
};
const dependencies = async (kind, code) => {
  const active = await current();
  if (kind !== 'module') return [];
  const rows = await readEntries(active.entries.filter(r => r.kind === 'programme'));
  return rows.filter(r => r.payload.matieres.some(m => m.modules.some(ref => ref.code === code && ref.publie))).map(r => r.code);
};
const removeDraft = async (kind, code, expectedRevision, author) => {
  const row = await latest(kind, code);
  if (!row || row.revision !== expectedRevision || row.status !== 'draft') throw conflict();
  // Conserve aussi les brouillons référencés par d'autres brouillons.
  if (kind === 'module' && await Content.exists({ kind: 'programme', 'payload.matieres.modules.code': code })) throw invalid('Ce module est référencé par un programme');
  // Tombstone de révision : pas de réutilisation du numéro après une suppression.
  const removed = await Content.findOneAndUpdate({ _id: row._id, status: 'draft' }, { $set: { status: 'archived', payload: { code, deletedDraft: true } } });
  if (!removed) throw conflict();
  log.info('prep.deleteDraft', { actorId: author, key: key(row), count: expectedRevision });
};
module.exports = { current, latest, saveDraft, publish, validateDraft, dependencies, removeDraft, readEntries, validateRows, hash, assertKey };
