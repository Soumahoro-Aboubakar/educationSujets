const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
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

const sendTokenResponse = (user, statusCode, res) => {
  const token = user.getSignedJwtToken();
  const refreshToken = user.getRefreshToken();
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
  sendTokenResponse(user, 201, res);
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
  sendTokenResponse(user, 200, res);
});

// Sessions sans état (JWT) : rien à révoquer côté serveur. On efface le cookie du web ; le
// mobile supprime lui-même son jeton. Pas d'authentification exigée : un jeton expiré doit
// aussi pouvoir se déconnecter proprement.
exports.logout = (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });
  sendSuccess(res, { message: 'Déconnecté' });
};

exports.getMe = asyncHandler(async (req, res) => {
  sendSuccess(res, { data: req.user });
});

exports.refreshToken = asyncHandler(async (req, res) => {
  const decoded = jwt.verify(
    req.body.refreshToken,
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    { algorithms: ['HS256'] }
  );

  // Un jeton d'accès ne peut pas servir à se renouveler une session.
  if (decoded.typ === 'access') {
    throw new AppError('Session invalide ou expiree', 401);
  }

  const user = await User.findById(decoded.id);

  if (!user) {
    throw new AppError('Utilisateur non trouve', 401);
  }

  if (user.accountStatus && user.accountStatus !== 'ACTIVE') {
    throw new AppError('Ce compte est desactive. Contactez le support.', 403, undefined, 'ACCOUNT_DISABLED');
  }

  sendTokenResponse(user, 200, res);
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
  sendSuccess(res, { statusCode: 201, data: { code, expiresIn: HANDOFF_TTL_MS / 1000 } });
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

  sendTokenResponse(user, 200, res);
});
