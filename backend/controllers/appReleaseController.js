const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/api');
const service = require('../services/appReleaseService');

// GET /api/app/version/:platform — public, court cache : une décision d'admin s'applique en une minute.
exports.getPolicy = asyncHandler(async (req, res) => {
  res.set('Cache-Control', 'public, max-age=60');
  sendSuccess(res, { data: await service.getPolicy(req.params.platform) });
});

// GET /api/admin/app-releases
exports.listPolicies = asyncHandler(async (req, res) => {
  sendSuccess(res, { data: await service.listPolicies() });
});

// PUT /api/admin/app-releases/:platform
exports.updatePolicy = asyncHandler(async (req, res) => {
  const data = await service.updatePolicy(req.params.platform, req.body || {}, req.user);
  sendSuccess(res, { message: 'Politique de mise à jour enregistrée', data });
});
