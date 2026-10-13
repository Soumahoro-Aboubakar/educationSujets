const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/api');
const { buildActor, getQuotaStatus } = require('../services/billing/downloadGuard');
const bundles = require('../services/downloads/bundleService');

// Le jeton visiteur éventuellement créé est aussi renvoyé dans le corps (en-tête non lisible partout).
const withVisitor = (res, data) => (res.locals.visitorToken ? { ...data, visitorToken: res.locals.visitorToken } : data);

/** État du quota de sujets récents du demandeur (visiteur ou compte). */
exports.getQuota = asyncHandler(async (req, res) => {
  const actor = await buildActor(req, res);
  // Inclut les documents récents déjà accordés dans la fenêtre (re-téléchargement sans décompte).
  sendSuccess(res, { data: withVisitor(res, await getQuotaStatus(actor)) });
});

/** Documents d'un périmètre : organisme, cycle, année, matières. */
exports.getScope = asyncHandler(async (req, res) => {
  const actor = await buildActor(req, res);
  const scope = await bundles.listScope({
    organisme: req.query.organisme || req.query.organismeId,
    parcoursTypeId: req.query.parcoursTypeId || req.query.cycle,
    annee: req.query.annee,
    matiereIds: req.query.matiereIds,
    includeCorrections: req.query.includeCorrections !== 'false',
  }, actor);
  sendSuccess(res, { data: withVisitor(res, scope) });
});

/** Contrôle d'une sélection avant téléchargement (rien n'est consommé). */
exports.previewSelection = asyncHandler(async (req, res) => {
  const actor = await buildActor(req, res);
  sendSuccess(res, { data: withVisitor(res, await bundles.previewSelection(req.body.documentIds, actor)) });
});

/** Réserve le quota et renvoie un lien à usage unique (archive ZIP ou liens individuels). */
exports.createBundle = asyncHandler(async (req, res) => {
  const actor = await buildActor(req, res);
  const delivery = req.body.delivery === 'files' ? 'files' : 'zip';
  const bundle = await bundles.createBundle(req.body.documentIds, actor, { delivery });
  sendSuccess(res, { statusCode: 201, data: withVisitor(res, bundle) });
});

exports.streamArchive = asyncHandler(async (req, res) => {
  await bundles.streamArchive(req.params.token, req, res);
});

exports.deliverFiles = asyncHandler(async (req, res) => {
  sendSuccess(res, { data: await bundles.deliverFiles(req.params.token, req) });
});

exports.listYearIssues = asyncHandler(async (req, res) => {
  sendSuccess(res, { data: await bundles.listYearIssues() });
});
