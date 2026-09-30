const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess } = require('../utils/api');
const billingConfig = require('../config/billing');
const { describeSubscription, quoteForUser } = require('../services/billing/subscriptionService');
const { describeMyPromoCode, ensurePromoCode, resolvePromoStatus } = require('../services/billing/promoCodeService');
const { describeWallet, requestWithdrawal, cancelMyWithdrawal } = require('../services/billing/walletService');
const { getDailyUsage, isExempt } = require('../services/billing/downloadGuard');
const { listMyPayments } = require('../services/payments/paymentService');
const DownloadLog = require('../models/DownloadLog');
const User = require('../models/User');
const AppError = require('../utils/errors');

/**
 * Vue unique des droits de l'utilisateur. Le mobile et le web s'appuient exclusivement sur
 * cette réponse pour afficher cadenas, quotas et parcours d'abonnement.
 */
exports.getEntitlements = asyncHandler(async (req, res) => {
  const user = req.user;
  const [subscription, usage, promoCode, nextPayment] = await Promise.all([
    describeSubscription(user._id),
    getDailyUsage(user._id),
    ensurePromoCode(user._id),
    quoteForUser(user._id),
  ]);
  const exempt = isExempt(user);

  sendSuccess(res, {
    data: {
      account: { status: user.accountStatus || 'ACTIVE', role: user.role, mustChangePassword: Boolean(user.mustChangePassword) },
      subscription,
      canDownload: exempt || subscription.status === 'ACTIVE',
      downloads: { ...usage, unlimited: exempt },
      promoCode: { code: promoCode.code, status: await resolvePromoStatus(promoCode) },
      nextPayment: { kind: nextPayment.kind, amount: nextPayment.amount, currency: nextPayment.currency },
      checkout: {
        mobileWebCheckout: billingConfig.payments.mobileWebCheckout,
        webCheckoutUrl: billingConfig.payments.webCheckoutUrl,
      },
    },
  });
});

exports.getMySubscription = asyncHandler(async (req, res) => {
  const [subscription, payments, nextPayment] = await Promise.all([
    describeSubscription(req.user._id),
    listMyPayments(req.user),
    quoteForUser(req.user._id),
  ]);

  sendSuccess(res, {
    data: {
      ...subscription,
      nextPayment: {
        kind: nextPayment.kind,
        label: nextPayment.label,
        amount: nextPayment.amount,
        currency: nextPayment.currency,
        // Date à partir de laquelle le prochain paiement prolonge l'accès.
        dueAt: nextPayment.periodStart,
      },
      payments,
    },
  });
});

exports.getMyPromoCode = asyncHandler(async (req, res) => {
  sendSuccess(res, { data: await describeMyPromoCode(req.user._id) });
});

exports.getMyWallet = asyncHandler(async (req, res) => {
  sendSuccess(res, { data: await describeWallet(req.user._id) });
});

exports.createWithdrawal = asyncHandler(async (req, res) => {
  const withdrawal = await requestWithdrawal(req.user, req.body);
  sendSuccess(res, { statusCode: 201, message: 'Demande de retrait enregistrée', data: withdrawal });
});

exports.cancelWithdrawal = asyncHandler(async (req, res) => {
  sendSuccess(res, { message: 'Retrait annulé', data: await cancelMyWithdrawal(req.user, req.params.id) });
});

exports.getMyDownloads = asyncHandler(async (req, res) => {
  const logs = await DownloadLog.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .limit(50)
    .populate('document', 'title titre originalFileName documentType type extension fileSize isDeleted')
    .lean();

  sendSuccess(res, {
    data: logs
      .filter((log) => log.document && !log.document.isDeleted)
      .map((log) => ({ id: log._id, date: log.createdAt, document: log.document })),
  });
});

const PROFILE_FIELDS = ['name', 'firstName', 'lastName', 'phone'];

exports.updateProfile = asyncHandler(async (req, res) => {
  const updates = Object.fromEntries(
    PROFILE_FIELDS.filter((field) => typeof req.body[field] === 'string').map((field) => [field, req.body[field].trim()])
  );

  if (updates.name === '') {
    throw new AppError('Le nom est obligatoire', 400);
  }

  const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
  sendSuccess(res, { message: 'Profil mis à jour', data: user });
});

// Changement de mot de passe : l'ancien est toujours exigé (y compris pour un mot de passe
// temporaire créé par l'administration), puis l'obligation de changement est levée.
exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (typeof newPassword !== 'string' || newPassword.length < 8) {
    throw new AppError('Le nouveau mot de passe doit contenir au moins 8 caractères.', 400, undefined, 'PASSWORD_TOO_SHORT');
  }

  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.matchPassword(String(currentPassword || '')))) {
    throw new AppError('Mot de passe actuel incorrect.', 400, undefined, 'PASSWORD_MISMATCH');
  }

  user.password = newPassword;
  user.mustChangePassword = false;
  await user.save();
  sendSuccess(res, { message: 'Mot de passe modifié' });
});
