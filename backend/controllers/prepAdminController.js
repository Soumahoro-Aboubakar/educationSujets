const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/errors');
const Content = require('../models/PrepContent');
const service = require('../services/prep/publicationService');
const actor = req => req.user._id;
exports.list = asyncHandler(async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(req.query.limit, 10) || 20));
  const filter = {};
  if (req.query.kind) { service.assertKey(req.query.kind, 'valid'); filter.kind = req.query.kind; }
  if (req.query.status) {
    if (!['draft', 'published', 'archived'].includes(req.query.status)) throw new AppError('Statut invalide', 400);
    filter.status = req.query.status;
  }
  const [data, total, active] = await Promise.all([
    Content.find(filter).select('-payload').sort({ updatedAt: -1, _id: 1 }).skip((page - 1) * limit).limit(limit).lean(),
    Content.countDocuments(filter), service.current(),
  ]);
  const listed = data.map(row => ({ ...row, active: active.entries.some(r => r.kind === row.kind && r.code === row.code && r.revision === row.revision), withdrawn: active.tombstones.some(r => r.kind === row.kind && r.code === row.code) }));
  res.json({ success: true, data: listed, meta: { pagination: { page, limit, total, pages: Math.ceil(total / limit) }, generation: active.generation,
    entries: active.entries, history: active.history.map(h => ({ generation: h.generation })) } });
});
exports.get = asyncHandler(async (req, res) => {
  const { kind, code } = req.params;
  const row = await service.latest(kind, code);
  if (!row) throw new AppError('Contenu introuvable', 404);
  res.json({ success: true, data: { ...row, dependencies: await service.dependencies(kind, code) } });
});
exports.create = asyncHandler(async (req, res) => {
  res.status(201).json({ success: true, data: await service.saveDraft({ ...req.body, author: actor(req) }, true) });
});
exports.patch = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await service.saveDraft({ ...req.body, ...req.params, author: actor(req) }) });
});
exports.validate = asyncHandler(async (req, res) => {
  service.assertKey(req.params.kind, req.params.code);
  res.json({ success: true, data: await service.validateDraft(req.params.kind, req.params.code, req.body?.revision) });
});
exports.publish = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await service.publish(req.body || {}, actor(req)) });
});
exports.archive = asyncHandler(async (req, res) => {
  const data = await service.publish({ expectedGeneration: req.body?.expectedGeneration, removals: [req.params] }, actor(req));
  res.json({ success: true, data });
});
exports.remove = asyncHandler(async (req, res) => {
  await service.removeDraft(req.params.kind, req.params.code, req.body?.expectedRevision, actor(req));
  res.json({ success: true });
});
