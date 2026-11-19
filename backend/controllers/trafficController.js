const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/api');
const traffic = require('../services/trafficService');

const short = (value, max) => (typeof value === 'string' ? value.slice(0, max) : '');

// POST /api/analytics/visit — public, une fois par session ; rien de personnel n'est conservé.
exports.visit = asyncHandler(async (req, res) => {
  const body = req.body || {};
  const data = await traffic.recordVisit({
    referrerHost: short(body.referrerHost, 120),
    utmSource: short(body.utmSource, 60),
    path: short(body.path, 200),
    standalone: body.standalone === true,
    userAgent: req.get('user-agent') || '',
  });
  res.set('Cache-Control', 'no-store');
  sendSuccess(res, { data });
});

// POST /api/analytics/signup — inscription attribuée à la source de première arrivée.
exports.signup = asyncHandler(async (req, res) => {
  await traffic.recordSignup({ source: short(req.body?.source, 60), userAgent: req.get('user-agent') || '' });
  res.set('Cache-Control', 'no-store');
  sendSuccess(res, { data: null });
});

// GET /api/admin/traffic?range=7j|30j|90j|12m&granularity=jour|semaine|mois
exports.report = asyncHandler(async (req, res) => {
  sendSuccess(res, { data: await traffic.report({ range: req.query.range, granularity: req.query.granularity }) });
});
