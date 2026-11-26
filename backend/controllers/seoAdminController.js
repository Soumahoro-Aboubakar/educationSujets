const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/api');
const AppError = require('../utils/errors');
const indexing = require('../services/seo/indexingService');
const google = require('../services/seo/googleSearchConsole');
const { toPath } = require('../services/seo/urlPolicy');

// Un autre passage (worker ou autre administrateur) tient le verrou : on le dit, sans prétendre avoir agi.
const run = async (options) => {
  if (!await indexing.tick(options)) throw new AppError('Une vérification est déjà en cours : réessayez dans une minute.', 409);
};

/*
 * Administration « SEO et indexation » (super administrateur, voir routes/admin.js).
 * Aucune réponse ne contient de secret : seulement des booléens « configuré ».
 */

// GET /api/admin/seo
exports.overview = asyncHandler(async (req, res) => {
  sendSuccess(res, { data: await indexing.overview() });
});

// GET /api/admin/seo/pages?filtre=pending|accepted|failed|removed|changed|indexed&q=&page=
exports.pages = asyncHandler(async (req, res) => {
  sendSuccess(res, { data: await indexing.listPages({ filter: req.query.filtre, q: req.query.q, page: req.query.page }) });
});

// POST /api/admin/seo/reconstruction — régénère le site et ses sitemaps (hook Cloudflare Pages).
exports.rebuild = asyncHandler(async (req, res) => {
  await indexing.requestRebuild();
  await run({ forceRebuild: true });
  sendSuccess(res, { data: await indexing.overview(), message: 'Reconstruction demandée : le sitemap sera à jour une fois le site redéployé.' });
});

// POST /api/admin/seo/verification — relit tout de suite la version en ligne et traite la file.
exports.check = asyncHandler(async (req, res) => {
  await run({ forceCheck: true });
  sendSuccess(res, { data: await indexing.overview() });
});

// POST /api/admin/seo/retraits/confirmer { buildId } — applique les retraits massifs suspendus, uniquement
// pour la version que l'administrateur a eue sous les yeux.
exports.confirmRemovals = asyncHandler(async (req, res) => {
  const buildId = typeof req.body?.buildId === 'string' ? req.body.buildId.slice(0, 80) : '';
  if (!buildId) throw new AppError('Version à confirmer manquante.', 400);
  try {
    await run({ forceCheck: true, approvedRemovals: buildId });
  } catch (error) {
    if (error.code === 'version_changee') throw new AppError(error.message, 409);
    throw error;
  }
  sendSuccess(res, { data: await indexing.overview(), message: 'Retraits appliqués.' });
});

// POST /api/admin/seo/indexnow { url }
exports.submitUrl = asyncHandler(async (req, res) => {
  const result = await indexing.queueManual(req.body?.url);
  if (!result.ok) throw new AppError(result.message, result.code === 'deja_envoyee' ? 429 : 400);
  sendSuccess(res, { data: result, message: result.message });
});

// POST /api/admin/seo/echecs/relancer
exports.retryFailed = asyncHandler(async (req, res) => {
  const count = await indexing.retryFailed();
  sendSuccess(res, { data: { count }, message: `${count} envoi(s) relancé(s).` });
});

// POST /api/admin/seo/google/inspection { url }
exports.inspect = asyncHandler(async (req, res) => {
  if (!google.configured()) throw new AppError('Search Console n’est pas configurée (voir docs/seo-indexation.md).', 400);
  const path = toPath(req.body?.url);
  if (!path) throw new AppError('Adresse refusée : seules les pages publiques de Fatafalta sont acceptées.', 400);
  try {
    sendSuccess(res, { data: await indexing.inspectPath(path) });
  } catch (error) {
    throw new AppError(error.message, 502);
  }
});

// POST /api/admin/seo/google/sitemap
exports.submitSitemap = asyncHandler(async (req, res) => {
  if (!google.configured()) throw new AppError('Search Console n’est pas configurée (voir docs/seo-indexation.md).', 400);
  try {
    await indexing.submitSitemapNow();
  } catch (error) {
    throw new AppError(error.message, 502);
  }
  sendSuccess(res, { data: await indexing.overview(), message: 'Sitemap soumis à Search Console.' });
});

// GET /api/admin/seo/rapport.csv
exports.report = asyncHandler(async (req, res) => {
  res.set('Content-Type', 'text/csv; charset=utf-8');
  res.set('Content-Disposition', `attachment; filename="fatafalta-seo-${new Date().toISOString().slice(0, 10)}.csv"`);
  res.send(`﻿${await indexing.report()}`);
});
