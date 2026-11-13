const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const sessions = require('../services/auth/sessionService');
const { extractToken, parseCookies } = require('../utils/request');
const User = require('../models/User');
const securityConfig = require('../config/security');
const abuse = require('../services/security/abuseTracker');
const securityLog = require('../services/security/securityLogger');
const { verifyHumanChallenge } = require('../middleware/security');
const { clientIp } = require('../utils/request');
const AuthHandoff = require('../models/AuthHandoff');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/errors');
const { sendSuccess } = require('../utils/api');
const { ensurePromoCode } = require('../services/billing/promoCodeService');

const sendTokenResponse = async (user, statusCode, res, req, rotated) => {
  await require('../services/prep/identityService').canonicalFor(user);
  const { token, refreshToken, session } = rotated || await sessions.create(user, req.body?.platform);
  res.set('Cache-Control', 'private, no-store');
  res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/api/auth', expires: session.expiresAt });
  const cookieExpireDays = Number.parseInt(process.env.JWT_COOKIE_EXPIRE, 10) || 30;

  res
    .status(statusCode)
    .cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: new Date(Date.now() + cookieExpireDays * 24 * 60 * 60 * 1000),
    })
    .json({
      success: true,
      token,
      refreshToken,
      user: {
        _id: user._id,
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isSuperAdmin: Boolean(user.isSuperAdmin),
        isVerified: user.isVerified,
        accountStatus: user.accountStatus || 'ACTIVE',
        mustChangePassword: Boolean(user.mustChangePassword),
        accountHint: accountHint(user._id),
      },
    });
};

// Haché factice : un email inconnu coûte le même temps qu'un mot de passe faux, la durée de
// réponse ne révèle donc pas si un compte existe.
const DUMMY_PASSWORD_HASH = bcrypt.hashSync('fatafalta-timing-guard', 10);

exports.register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  const normalizedEmail = email.trim().toLowerCase();

  const existingUser = await User.findOne({ email: normalizedEmail }).select('_id').lean();

  if (existingUser) {
    // L'inscription doit indiquer qu'un compte existe (pas de vérification d'email à ce jour) :
    // l'énumération est freinée par la limite stricte d'inscriptions par IP.
    securityLog.info('auth.register_existing', { requestId: req.id, ip: clientIp(req), emailHash: securityLog.hashEmail(normalizedEmail) });
    throw new AppError('Impossible de créer un compte avec cet email. Si vous avez déjà un compte, connectez-vous.', 409, undefined, 'EMAIL_UNAVAILABLE');
  }

  const user = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    password,
    role: 'user',
  });

  // Code de parrainage créé dès l'inscription (inactif tant que l'abonnement ne l'est pas).
  // Un échec ici ne bloque pas l'inscription : le code sera créé à la première consultation.
  await ensurePromoCode(user._id).catch((error) => {
    console.error(`[PROMO_CODE] Creation differee pour ${user._id}: ${error.message}`);
  });

  securityLog.info('auth.register', { requestId: req.id, ip: clientIp(req), userId: user._id });
  await sendTokenResponse(user, 201, res, req);
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = email.trim().toLowerCase();
  const ip = clientIp(req);

  // Vérification humaine uniquement après plusieurs échecs sur ce couple IP + email.
  const failures = abuse.loginFailureCount(ip, normalizedEmail);
  if (securityConfig.captcha.secret && failures >= securityConfig.captcha.loginFailuresBeforeChallenge) {
    if (!(await verifyHumanChallenge(req.body.captchaToken, ip))) {
      securityLog.warn('auth.captcha_required', { requestId: req.id, ip, emailHash: securityLog.hashEmail(normalizedEmail), count: failures });
      throw new AppError('Vérification de sécurité requise avant de réessayer.', 403, undefined, 'CAPTCHA_REQUIRED');
    }
  }

  const user = await User.findOne({ email: normalizedEmail }).select('+password');
  const passwordOk = user
    ? await user.matchPassword(password)
    : await bcrypt.compare(password, DUMMY_PASSWORD_HASH).then(() => false);

  if (!passwordOk) {
    const count = abuse.recordLoginFailure({ ip, email: normalizedEmail, requestId: req.id });
    securityLog.warn('auth.login_failed', { requestId: req.id, ip, emailHash: securityLog.hashEmail(normalizedEmail), count, userAgent: req.get('user-agent') });
    // Même message que le compte existe ou non.
    throw new AppError('Identifiants invalides', 401);
  }

  abuse.clearLoginFailures(ip, normalizedEmail);

  if (user.accountStatus && user.accountStatus !== 'ACTIVE') {
    throw new AppError('Ce compte est desactive. Contactez le support.', 403, undefined, 'ACCOUNT_DISABLED');
  }

  securityLog.info('auth.login_success', { requestId: req.id, ip, userId: user._id });
  await sendTokenResponse(user, 200, res, req);
});

// Les appels cookie sensibles exigent une origine connue ; les clients natifs utilisent le corps/header.
const checkCookieOrigin = (req) => {
  const origin = req.get('origin');
  const allowed = [process.env.FRONTEND_URL, ...(process.env.CORS_ORIGINS || '').split(',')].filter(Boolean);
  if (!origin || !allowed.includes(origin)) throw new AppError('Origine non autorisée', 403);
};
exports.logout = asyncHandler(async (req, res) => {
  if (!req.headers.authorization && req.headers.cookie) checkCookieOrigin(req);
  await sessions.revokeToken(extractToken(req));
  await sessions.revokeToken(req.body?.refreshToken || parseCookies(req.headers.cookie).refreshToken, true);
  res.clearCookie('token', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' });
  res.clearCookie('refreshToken', { path: '/api/auth', httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' });
  sendSuccess(res, { message: 'Déconnecté' });
});
exports.revokeSessions = asyncHandler(async (req, res) => {
  if (!req.headers.authorization) checkCookieOrigin(req);
  await sessions.revokeAll(req.user._id);
  sendSuccess(res, { message: 'Sessions révoquées' });
});

/**
 * Empreinte courte et non réversible du compte (aucune donnée personnelle) : l'application la
 * joint au lien « Voir mon abonnement » pour que le site détecte un navigateur connecté à un
 * AUTRE compte avant un paiement. Ce n'est pas un secret ni une preuve d'identité.
 */
const accountHint = (userId) => crypto.createHmac('sha256', process.env.JWT_SECRET || 'fatafalta-account-hint')
  .update(`account-hint:${userId}`).digest('base64url').slice(0, 16);
exports.accountHint = accountHint;

exports.getMe = asyncHandler(async (req, res) => {
  const data = typeof req.user?.toObject === 'function' ? req.user.toObject() : { ...req.user };
  sendSuccess(res, { data: { ...data, accountHint: accountHint(req.user._id) } });
});

exports.refreshToken = asyncHandler(async (req, res) => {
  const cookieToken = parseCookies(req.headers.cookie).refreshToken;
  if (!req.body.refreshToken) checkCookieOrigin(req);
  const rotated = await sessions.rotate(req.body.refreshToken || cookieToken);
  await sendTokenResponse(rotated.user, 200, res, req, rotated);
});

const HANDOFF_TTL_MS = 2 * 60 * 1000;
const hashCode = (code) => crypto.createHash('sha256').update(code).digest('hex');

// Émis par l'application mobile juste avant d'ouvrir la souscription web.
exports.createHandoff = asyncHandler(async (req, res) => {
  const code = crypto.randomBytes(24).toString('base64url');
  await AuthHandoff.create({
    codeHash: hashCode(code),
    user: req.user._id,
    expiresAt: new Date(Date.now() + HANDOFF_TTL_MS),
  });
  sendSuccess(res, { statusCode: 201, data: { code, expiresIn: HANDOFF_TTL_MS / 1000, accountHint: accountHint(req.user._id) } });
});

// Échangé une seule fois par le site web contre une session normale.
exports.exchangeHandoff = asyncHandler(async (req, res) => {
  const handoff = await AuthHandoff.findOneAndDelete({
    codeHash: hashCode(String(req.body.code || '')),
    expiresAt: { $gt: new Date() },
  });

  if (!handoff) {
    securityLog.warn('auth.handoff_invalid', { requestId: req.id, ip: clientIp(req) });
    throw new AppError('Lien expiré. Reprenez depuis l’application.', 401, undefined, 'HANDOFF_INVALID');
  }

  const user = await User.findById(handoff.user);
  if (!user || (user.accountStatus && user.accountStatus !== 'ACTIVE')) {
    throw new AppError('Ce compte est desactive. Contactez le support.', 403, undefined, 'ACCOUNT_DISABLED');
  }

  await sendTokenResponse(user, 200, res, req);
});
