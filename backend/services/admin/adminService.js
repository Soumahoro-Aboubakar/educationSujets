const crypto = require('crypto');
const mongoose = require('mongoose');
const User = require('../../models/User');
const Subscription = require('../../models/Subscription');
const Payment = require('../../models/Payment');
const PromoCode = require('../../models/PromoCode');
const Commission = require('../../models/Commission');
const Withdrawal = require('../../models/Withdrawal');
const DownloadLog = require('../../models/DownloadLog');
const DownloadCounter = require('../../models/DownloadCounter');
const billingConfig = require('../../config/billing');
const AppError = require('../../utils/errors');
const { dayKey, DAY_MS } = require('../billing/pricing');
const { describeSubscription } = require('../billing/subscriptionService');
const { ensurePromoCode, resolvePromoStatus, setAdminOverride } = require('../billing/promoCodeService');
const { computeBalances, toPublicWithdrawal } = require('../billing/walletService');
const { toPublicPayment } = require('../payments/paymentService');

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const TEMP_EMAIL_DOMAIN = process.env.TEMP_EMAIL_DOMAIN || 'invite.fatafalta.com';
const ADMIN_ROLES = ['user', 'partner', 'sub-admin', 'admin'];
const ACCOUNT_STATUSES = ['ACTIVE', 'DISABLED', 'SUSPENDED'];

const paginate = ({ page, limit }) => {
  const safeLimit = Math.min(Math.max(Number.parseInt(limit, 10) || 20, 1), 100);
  const safePage = Math.max(Number.parseInt(page, 10) || 1, 1);
  return { page: safePage, limit: safeLimit, skip: (safePage - 1) * safeLimit };
};

const pagination = ({ page, limit }, total) => ({ page, limit, total, pages: Math.ceil(total / limit) });

// Mot de passe temporaire lisible (sans caractères ambigus), communiqué une seule fois.
const generateTempPassword = () => {
  const alphabet = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
  return Array.from(crypto.randomBytes(12), (byte) => alphabet[byte % alphabet.length]).join('');
};

// ── Indicateurs ────────────────────────────────────────
const getStats = async () => {
  const now = new Date();
  const since7 = new Date(now.getTime() - 7 * DAY_MS);
  const since30 = new Date(now.getTime() - 30 * DAY_MS);
  const today = dayKey(now);

  const [
    usersTotal, usersActive, usersDisabled, usersNew,
    subsActive, subsExpired,
    paymentTotals, paymentsPending, paymentsFailed, renewals,
    commissionTotals, partnerIds, inactiveOverrides, activeOwners,
    downloadsToday, popular, usersAtLimit,
    withdrawalsPending,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ accountStatus: { $in: ['ACTIVE', null] } }),
    User.countDocuments({ accountStatus: { $in: ['DISABLED', 'SUSPENDED'] } }),
    User.countDocuments({ createdAt: { $gte: since7 } }),
    Subscription.countDocuments({ currentPeriodEnd: { $gt: now } }),
    Subscription.countDocuments({ currentPeriodEnd: { $lte: now } }),
    Payment.aggregate([{ $match: { status: 'SUCCEEDED' } }, { $group: { _id: null, amount: { $sum: '$amount' }, count: { $sum: 1 } } }]),
    Payment.countDocuments({ status: { $in: Payment.OPEN_STATUSES } }),
    Payment.countDocuments({ status: { $in: ['FAILED', 'EXPIRED'] }, createdAt: { $gte: since30 } }),
    // Renouvellement : paiement initial réussi d'un utilisateur déjà abonné auparavant.
    Payment.aggregate([
      { $match: { status: 'SUCCEEDED', kind: 'initial', createdAt: { $gte: since30 } } },
      { $lookup: { from: 'subscriptions', localField: 'user', foreignField: 'user', as: 'subscription' } },
      { $unwind: '$subscription' },
      { $match: { $expr: { $lt: ['$subscription.firstActivatedAt', { $subtract: ['$createdAt', DAY_MS] }] } } },
      { $count: 'count' },
    ]),
    Commission.aggregate([{ $match: { status: 'CONFIRMED' } }, { $group: { _id: null, amount: { $sum: '$amount' }, count: { $sum: 1 } } }]),
    User.find({ role: 'partner' }).distinct('_id'),
    PromoCode.find({ adminOverride: 'INACTIVE' }).distinct('owner'),
    Subscription.find({ currentPeriodEnd: { $gt: now } }).distinct('user'),
    DownloadLog.countDocuments({ day: today }),
    DownloadLog.aggregate([
      { $match: { createdAt: { $gte: since30 } } },
      { $group: { _id: '$document', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
      { $lookup: { from: 'documents', localField: '_id', foreignField: '_id', as: 'document' } },
      { $unwind: '$document' },
      { $project: { count: 1, title: { $ifNull: ['$document.title', '$document.originalFileName'] } } },
    ]),
    DownloadCounter.countDocuments({ day: today, count: { $gte: billingConfig.downloads.dailyLimit } }),
    Withdrawal.aggregate([{ $match: { status: 'PENDING' } }, { $group: { _id: null, amount: { $sum: '$amount' }, count: { $sum: 1 } } }]),
  ]);

  // Codes actifs : partenaires (toujours), forçages actifs, abonnés non forcés inactifs.
  const partnerSet = new Set(partnerIds.map(String));
  const inactiveSet = new Set(inactiveOverrides.map(String));
  const [partnerCodes, forcedActive, naturallyActive] = await Promise.all([
    PromoCode.countDocuments({ owner: { $in: partnerIds } }),
    PromoCode.countDocuments({ adminOverride: 'ACTIVE', owner: { $nin: partnerIds } }),
    PromoCode.countDocuments({
      owner: { $in: activeOwners.filter((id) => !inactiveSet.has(String(id)) && !partnerSet.has(String(id))) },
      adminOverride: null,
    }),
  ]);

  return {
    users: { total: usersTotal, active: usersActive, disabled: usersDisabled, newLast7Days: usersNew },
    subscriptions: { active: subsActive, expired: subsExpired, renewalsLast30Days: renewals[0]?.count || 0 },
    payments: {
      totalAmount: paymentTotals[0]?.amount || 0,
      succeeded: paymentTotals[0]?.count || 0,
      pending: paymentsPending,
      failedLast30Days: paymentsFailed,
    },
    referrals: {
      activeCodes: partnerCodes + forcedActive + naturallyActive,
      commissions: commissionTotals[0]?.count || 0,
      commissionAmount: commissionTotals[0]?.amount || 0,
      pendingWithdrawals: withdrawalsPending[0]?.count || 0,
      pendingWithdrawalAmount: withdrawalsPending[0]?.amount || 0,
    },
    downloads: { today: downloadsToday, usersAtLimit, dailyLimit: billingConfig.downloads.dailyLimit, popular },
  };
};

// ── Utilisateurs ───────────────────────────────────────
const listUsers = async ({ search, status, role, page, limit }) => {
  const paging = paginate({ page, limit });
  const filter = {};
  if (search) {
    const regex = new RegExp(escapeRegex(search.trim()), 'i');
    filter.$or = [{ name: regex }, { email: regex }, { phone: regex }];
  }
  if (ACCOUNT_STATUSES.includes(status)) filter.accountStatus = status === 'ACTIVE' ? { $in: ['ACTIVE', null] } : status;
  if (ADMIN_ROLES.includes(role) || role === 'contributor') filter.role = role;

  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(paging.skip).limit(paging.limit).lean(),
    User.countDocuments(filter),
  ]);

  const ids = users.map((user) => user._id);
  const now = new Date();
  const [subscriptions, promoCodes] = await Promise.all([
    Subscription.find({ user: { $in: ids } }).select('user currentPeriodEnd').lean(),
    PromoCode.find({ owner: { $in: ids } }).select('owner code adminOverride').lean(),
  ]);
  const subByUser = new Map(subscriptions.map((sub) => [String(sub.user), sub]));
  const codeByUser = new Map(promoCodes.map((code) => [String(code.owner), code]));

  return {
    data: users.map((user) => {
      const subscription = subByUser.get(String(user._id));
      const subscriptionStatus = !subscription?.currentPeriodEnd ? 'NONE' : subscription.currentPeriodEnd > now ? 'ACTIVE' : 'EXPIRED';
      const code = codeByUser.get(String(user._id));
      return {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone || null,
        role: user.role,
        accountStatus: user.accountStatus || 'ACTIVE',
        createdAt: user.createdAt,
        subscription: { status: subscriptionStatus, currentPeriodEnd: subscription?.currentPeriodEnd || null },
        promoCode: code ? {
          code: code.code,
          status: user.role === 'partner'
            ? 'ACTIVE'
            : code.adminOverride || (subscriptionStatus === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE'),
          forced: user.role !== 'partner' && Boolean(code.adminOverride),
        } : null,
      };
    }),
    pagination: pagination(paging, total),
  };
};

const getUserDetails = async (userId) => {
  const user = await User.findById(userId).lean();
  if (!user) throw new AppError('Utilisateur introuvable', 404);

  const promoCode = await ensurePromoCode(userId);
  const [subscription, payments, downloads, commissions, withdrawals, balances, promoStatus, referredBy] = await Promise.all([
    describeSubscription(userId),
    Payment.find({ user: userId }).sort({ createdAt: -1 }).limit(50),
    DownloadLog.find({ user: userId }).sort({ createdAt: -1 }).limit(30).populate('document', 'title originalFileName').lean(),
    Commission.find({ referrer: userId }).sort({ createdAt: -1 }).limit(50).populate('referredUser', 'name email').lean(),
    Withdrawal.find({ user: userId }).sort({ createdAt: -1 }).limit(50).lean(),
    computeBalances(userId),
    resolvePromoStatus(promoCode),
    user.referredBy ? User.findById(user.referredBy).select('name email').lean() : null,
  ]);

  return {
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone || null,
      role: user.role,
      accountStatus: user.accountStatus || 'ACTIVE',
      statusReason: user.statusReason || null,
      mustChangePassword: Boolean(user.mustChangePassword),
      createdAt: user.createdAt,
      referredBy,
    },
    subscription,
    payments: payments.map(toPublicPayment),
    downloads: downloads.map((log) => ({ id: log._id, date: log.createdAt, title: log.document?.title || log.document?.originalFileName || 'Document supprimé' })),
    promoCode: {
      code: promoCode.code,
      status: promoStatus,
      adminOverride: promoCode.adminOverride,
      history: promoCode.history.slice(-20).reverse(),
    },
    commissions: commissions.map((commission) => ({
      id: commission._id,
      date: commission.createdAt,
      amount: commission.amount,
      status: commission.status,
      referredUser: commission.referredUser,
    })),
    withdrawals: withdrawals.map(toPublicWithdrawal),
    balances,
  };
};

// Les comptes créés par l'administration sont des partenaires : leur code promotionnel
// est toujours actif (voir promoCodeService.resolvePromoStatus).
const createUser = async ({ name, phone, email }, admin) => {
  if (!String(name || '').trim()) throw new AppError('Le nom est obligatoire', 400);
  const role = 'partner';

  const tempPassword = generateTempPassword();
  const finalEmail = String(email || '').trim().toLowerCase()
    || `membre-${crypto.randomBytes(4).toString('hex')}@${TEMP_EMAIL_DOMAIN}`;

  const user = await User.create({
    name: name.trim(),
    phone: phone ? String(phone).trim() : undefined,
    email: finalEmail,
    password: tempPassword,
    role,
    mustChangePassword: true,
  });
  await ensurePromoCode(user._id);

  console.info(`[ADMIN] user_created by=${admin._id} user=${user._id} role=${role}`);

  // Le mot de passe temporaire n'est renvoyé qu'ici : il n'est stocké que haché.
  return { id: user._id, email: user.email, tempPassword, temporaryEmail: !email };
};

const updateUser = async (userId, payload, admin) => {
  const user = await User.findById(userId);
  if (!user) throw new AppError('Utilisateur introuvable', 404);

  const isSelf = String(user._id) === String(admin._id);

  if (payload.name !== undefined) user.name = String(payload.name).trim();
  if (payload.phone !== undefined) user.phone = String(payload.phone).trim();
  if (payload.email !== undefined) user.email = String(payload.email).trim().toLowerCase();

  if (payload.role !== undefined && payload.role !== user.role) {
    if (!ADMIN_ROLES.includes(payload.role)) throw new AppError('Rôle invalide', 400);
    if (isSelf) throw new AppError('Vous ne pouvez pas modifier votre propre rôle.', 400);
    user.role = payload.role;
    if (payload.role !== 'admin') user.isSuperAdmin = false;
  }

  if (payload.accountStatus !== undefined && payload.accountStatus !== user.accountStatus) {
    if (!ACCOUNT_STATUSES.includes(payload.accountStatus)) throw new AppError('Statut invalide', 400);
    if (isSelf) throw new AppError('Vous ne pouvez pas désactiver votre propre compte.', 400);
    user.accountStatus = payload.accountStatus;
    user.statusReason = payload.statusReason ? String(payload.statusReason).trim() : undefined;
  }

  await user.save();
  console.info(`[ADMIN] user_updated by=${admin._id} user=${user._id} fields=${Object.keys(payload).join(',')}`);
  return getUserDetails(user._id);
};

const resetPassword = async (userId, admin) => {
  const user = await User.findById(userId);
  if (!user) throw new AppError('Utilisateur introuvable', 404);
  const tempPassword = generateTempPassword();
  user.password = tempPassword;
  user.mustChangePassword = true;
  await user.save();
  console.info(`[ADMIN] password_reset by=${admin._id} user=${user._id}`);
  return { tempPassword };
};

const overridePromoCode = async (userId, override, note, admin) => {
  if (![null, 'ACTIVE', 'INACTIVE'].includes(override)) throw new AppError('Valeur invalide', 400);
  const owner = await User.findById(userId).select('role').lean();
  if (!owner) throw new AppError('Utilisateur introuvable', 404);
  if (owner.role === 'partner') {
    throw new AppError('Le code d’un partenaire est toujours actif. Changez son rôle pour modifier ce comportement.', 400, undefined, 'PARTNER_CODE_ALWAYS_ACTIVE');
  }
  await setAdminOverride(userId, override, admin._id, note);
  return getUserDetails(userId);
};

// ── Finances ───────────────────────────────────────────
const listPayments = async ({ status, search, page, limit }) => {
  const paging = paginate({ page, limit });
  const filter = {};
  if (Payment.STATUSES.includes(status)) filter.status = status;
  if (search) {
    const regex = new RegExp(escapeRegex(search.trim()), 'i');
    const users = await User.find({ $or: [{ name: regex }, { email: regex }] }).select('_id').limit(200).lean();
    filter.$or = [
      { user: { $in: users.map((user) => user._id) } },
      ...(mongoose.isValidObjectId(search.trim()) ? [{ _id: search.trim() }] : []),
      { providerRef: regex },
    ];
  }

  const [payments, total] = await Promise.all([
    Payment.find(filter).sort({ createdAt: -1 }).skip(paging.skip).limit(paging.limit)
      .populate('user', 'name email').populate('promoCode', 'code').lean(),
    Payment.countDocuments(filter),
  ]);

  return {
    data: payments.map((payment) => ({
      ...toPublicPayment(payment),
      user: payment.user,
      promoCode: payment.promoCode?.code || null,
      provider: payment.provider,
      providerRef: payment.providerRef,
      channel: payment.channel,
    })),
    pagination: pagination(paging, total),
  };
};

const listCommissions = async ({ page, limit }) => {
  const paging = paginate({ page, limit });
  const [commissions, total] = await Promise.all([
    Commission.find().sort({ createdAt: -1 }).skip(paging.skip).limit(paging.limit)
      .populate('referrer', 'name email').populate('referredUser', 'name email').populate('promoCode', 'code').lean(),
    Commission.countDocuments(),
  ]);
  return {
    data: commissions.map((commission) => ({
      id: commission._id,
      date: commission.createdAt,
      amount: commission.amount,
      status: commission.status,
      availableAt: commission.availableAt,
      referrer: commission.referrer,
      referredUser: commission.referredUser,
      code: commission.promoCode?.code,
    })),
    pagination: pagination(paging, total),
  };
};

const listWithdrawals = async ({ status, page, limit }) => {
  const paging = paginate({ page, limit });
  const filter = Withdrawal.STATUSES.includes(status) ? { status } : {};
  const [withdrawals, total] = await Promise.all([
    Withdrawal.find(filter).sort({ createdAt: -1 }).skip(paging.skip).limit(paging.limit).populate('user', 'name email').lean(),
    Withdrawal.countDocuments(filter),
  ]);
  return {
    // L'administration voit le numéro complet : elle en a besoin pour effectuer le transfert.
    data: withdrawals.map((withdrawal) => ({
      ...toPublicWithdrawal(withdrawal),
      phone: withdrawal.phone,
      firstName: withdrawal.firstName,
      lastName: withdrawal.lastName,
      reference: withdrawal.reference || null,
      user: withdrawal.user,
    })),
    pagination: pagination(paging, total),
  };
};

const processWithdrawal = async (withdrawalId, { status, reference, reason }, admin) => {
  if (!['PROCESSED', 'FAILED'].includes(status)) throw new AppError('Statut invalide', 400);
  if (status === 'FAILED' && !String(reason || '').trim()) throw new AppError('Indiquez la raison de l’échec.', 400);

  const withdrawal = await Withdrawal.findOneAndUpdate(
    { _id: withdrawalId, status: 'PENDING' },
    {
      $set: {
        status,
        reference: reference ? String(reference).trim() : undefined,
        failureReason: status === 'FAILED' ? String(reason).trim() : undefined,
        processedBy: admin._id,
        processedAt: new Date(),
      },
      $unset: { openFor: 1 },
    },
    { new: true }
  );

  if (!withdrawal) throw new AppError('Ce retrait n’est plus en attente.', 409);
  console.info(`[ADMIN] withdrawal_${status.toLowerCase()} by=${admin._id} withdrawal=${withdrawal._id}`);
  return toPublicWithdrawal(withdrawal);
};

module.exports = {
  getStats,
  listUsers,
  getUserDetails,
  createUser,
  updateUser,
  resetPassword,
  overridePromoCode,
  listPayments,
  listCommissions,
  listWithdrawals,
  processWithdrawal,
};
