const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
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

exports.register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  const normalizedEmail = email.trim().toLowerCase();

  const existingUser = await User.findOne({ email: normalizedEmail });

  if (existingUser) {
    throw new AppError('Cet email est deja utilise', 409);
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

  sendTokenResponse(user, 201, res);
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = email.trim().toLowerCase();
  const user = await User.findOne({ email: normalizedEmail }).select('+password');

  if (!user || !(await user.matchPassword(password))) {
    throw new AppError('Identifiants invalides', 401);
  }

  if (user.accountStatus && user.accountStatus !== 'ACTIVE') {
    throw new AppError('Ce compte est desactive. Contactez le support.', 403, undefined, 'ACCOUNT_DISABLED');
  }

  sendTokenResponse(user, 200, res);
});

exports.getMe = asyncHandler(async (req, res) => {
  sendSuccess(res, { data: req.user });
});

exports.refreshToken = asyncHandler(async (req, res) => {
  const decoded = jwt.verify(
    req.body.refreshToken,
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET
  );

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
    throw new AppError('Lien expiré. Reprenez depuis l’application.', 401, undefined, 'HANDOFF_INVALID');
  }

  const user = await User.findById(handoff.user);
  if (!user || (user.accountStatus && user.accountStatus !== 'ACTIVE')) {
    throw new AppError('Ce compte est desactive. Contactez le support.', 403, undefined, 'ACCOUNT_DISABLED');
  }

  sendTokenResponse(user, 200, res);
});
