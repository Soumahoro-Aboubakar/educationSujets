const crypto = require('crypto');
const mongoose = require('mongoose');
const User = require('../../models/User');
const Subscription = require('../../models/Subscription');
const Payment = require('../../models/Payment');
const PromoCode = require('../../models/PromoCode');
const Commission = require('../../models/Commission');
const Withdrawal = require('../../models/Withdrawal');
const DownloadLog = require('../../models/DownloadLog');
const DownloadQuota = require('../../models/DownloadQuota');
const Document = require('../../models/Document');
const Organisme = require('../../models/Organisme');
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
  const safePage = Math.min(Math.max(Number.parseInt(page, 10) || 1, 1), 500);
  return { page: safePage, limit: safeLimit, skip: (safePage - 1) * safeLimit };
};

const pagination = ({ page, limit }, total) => ({ page, limit, total, pages: Math.ceil(total / limit) });

// Mot de passe temporaire lisible (sans caractères ambigus), communiqué une seule fois.
const generateTempPassword = () => {
  const alphabet = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
  return Array.from(crypto.randomBytes(12), (byte) => alphabet[byte % alphabet.length]).join('');
};

// ── Indicateurs ────────────────────────────────────────

// Droits confirmés d'un quota gratuit à vie (« free:u:… »).
const FREE_QUOTA_USED = { $size: { $filter: { input: '$grants', cond: { $eq: ['$$this.status', 'consumed'] } } } };

const countExhaustedFreeAccounts = async () => {
  const [row] = await DownloadQuota.aggregate([
    { $match: { subject: /^free:u:/ } },
    { $project: { used: FREE_QUOTA_USED } },
    { $match: { used: { $gte: billingConfig.downloads.recentLimits.free } } },
    { $count: 'count' },
  ]);
  return row?.count || 0;
};

/** Comptes à la limite : quota gratuit à vie épuisé, ou quota glissant d'abonné entièrement utilisé. */
const countAccountsAtLimit = async (now) => {
  const { recentLimits, windowHours } = billingConfig.downloads;
  const since = new Date(now.getTime() - windowHours * 60 * 60 * 1000);
  const rows = await DownloadQuota.aggregate([
    { $match: { subject: /^u:/ } },
    {
      $project: {
        subject: 1,
        used: {
          $size: {
            $filter: {
              input: '$grants',
              cond: { $and: [{ $gt: ['$$this.grantedAt', since] }, { $eq: ['$$this.status', 'consumed'] }] },
            },
          },
        },
      },
    },
    { $match: { used: { $gte: recentLimits.subscriber } } },
  ]);
  const userIds = rows.map((row) => row.subject.slice(2)).filter((id) => mongoose.Types.ObjectId.isValid(id));
  const subscribed = userIds.length ? await Subscription.countDocuments({ user: { $in: userIds }, currentPeriodEnd: { $gt: now } }) : 0;
  return subscribed + await countExhaustedFreeAccounts();
};

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
    countAccountsAtLimit(now),
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
      providerStatus: payment.providerStatus || null,
      providerEnvironment: payment.providerEnvironment || null,
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

// ── Téléchargements gratuits (quota 2010-2020 sans abonnement) ─────────────────

const parseDate = (value, label, endOfDay = false) => {
  if (!value) return null;
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) && endOfDay ? `${value}T23:59:59.999Z` : value);
  if (Number.isNaN(date.getTime())) throw new AppError(`Date ${label} invalide.`, 400);
  return date;
};

const findIds = (Model, filter, max = 500) => Model.find(filter).select('_id').limit(max).lean().then((rows) => rows.map((row) => row._id));

/** Historique paginé des téléchargements sur le quota gratuit ; recherche par utilisateur ou titre. */
const listFreeDownloads = async ({ search, from, to, year, organisme, page, limit }) => {
  const paging = paginate({ page, limit });
  const filter = { access: 'free_quota' };
  const since = parseDate(from, 'de début');
  const until = parseDate(to, 'de fin', true);
  if (since || until) filter.createdAt = { ...(since ? { $gte: since } : {}), ...(until ? { $lte: until } : {}) };
  if (year) {
    if (!/^\d{4}$/.test(String(year))) throw new AppError('Année invalide.', 400);
    filter.year = Number(year);
  }
  if (organisme) {
    if (!mongoose.isValidObjectId(organisme)) throw new AppError('Organisme invalide.', 400);
    filter.organisme = organisme;
  }
  if (search && search.trim()) {
    const regex = new RegExp(escapeRegex(search.trim()), 'i');
    const [userIds, documentIds] = await Promise.all([
      findIds(User, { $or: [{ name: regex }, { email: regex }] }),
      findIds(Document, { $or: [{ title: regex }, { titre: regex }, { originalFileName: regex }] }),
    ]);
    filter.$or = [{ user: { $in: userIds } }, { document: { $in: documentIds } }];
  }

  const [logs, total] = await Promise.all([
    DownloadLog.find(filter).sort({ createdAt: -1 }).skip(paging.skip).limit(paging.limit)
      .populate('user', 'name email')
      .populate({
        path: 'document',
        select: 'title titre originalFileName matiereId parcoursTypeId',
        populate: [{ path: 'matiereId', select: 'nom' }, { path: 'parcoursTypeId', select: 'nom' }],
      })
      .populate('organisme', 'nom')
      .lean(),
    DownloadLog.countDocuments(filter),
  ]);

  return {
    data: logs.map((log) => ({
      id: log._id,
      date: log.createdAt,
      user: log.user ? { id: log.user._id, name: log.user.name, email: log.user.email } : null,
      // Visiteur sans compte : identifiant abrégé, jamais le jeton.
      visitor: log.user ? null : (log.visitor ? String(log.visitor).slice(0, 8) : null),
      document: {
        id: log.document?._id || log.document || null,
        title: log.document ? (log.document.title || log.document.titre || log.document.originalFileName) : 'Document supprimé',
      },
      year: log.year,
      organisme: log.organisme ? { id: log.organisme._id, nom: log.organisme.nom } : null,
      parcoursType: log.document?.parcoursTypeId?.nom || null,
      matiere: log.document?.matiereId?.nom || null,
      access: log.access,
      charged: Boolean(log.charged),
    })),
    pagination: pagination(paging, total),
  };
};

/** Comptes ayant utilisé le quota gratuit : utilisés, restants, épuisés ; les plus actifs d'abord. */
const listFreeQuotaUsers = async ({ search, status, page, limit }) => {
  const paging = paginate({ page, limit });
  const quotaLimit = billingConfig.downloads.recentLimits.free;
  let subjectMatch = /^free:u:/;
  if (search && search.trim()) {
    const regex = new RegExp(escapeRegex(search.trim()), 'i');
    subjectMatch = { $in: (await findIds(User, { $or: [{ name: regex }, { email: regex }] })).map((userId) => `free:u:${userId}`) };
  }
  const [result] = await DownloadQuota.aggregate([
    { $match: { subject: subjectMatch } },
    { $project: { subject: 1, used: FREE_QUOTA_USED, lastAt: { $max: '$grants.grantedAt' } } },
    ...(status === 'exhausted' ? [{ $match: { used: { $gte: quotaLimit } } }] : []),
    ...(status === 'available' ? [{ $match: { used: { $lt: quotaLimit } } }] : []),
    { $sort: { used: -1, lastAt: -1 } },
    { $facet: { rows: [{ $skip: paging.skip }, { $limit: paging.limit }], total: [{ $count: 'count' }] } },
  ]);
  const rows = result?.rows || [];
  const userIds = rows.map((row) => row.subject.slice('free:u:'.length)).filter((userId) => mongoose.isValidObjectId(userId));
  const [users, deliveries] = await Promise.all([
    User.find({ _id: { $in: userIds } }).select('name email').lean(),
    DownloadLog.aggregate([
      { $match: { access: 'free_quota', user: { $in: userIds.map((userId) => new mongoose.Types.ObjectId(userId)) } } },
      { $group: { _id: '$user', count: { $sum: 1 } } },
    ]),
  ]);
  const userById = new Map(users.map((user) => [String(user._id), user]));
  const deliveriesById = new Map(deliveries.map((row) => [String(row._id), row.count]));

  return {
    data: rows.map((row) => {
      const userId = row.subject.slice('free:u:'.length);
      const user = userById.get(userId);
      return {
        user: { id: userId, name: user?.name || 'Compte supprimé', email: user?.email || null },
        used: row.used,
        limit: quotaLimit,
        remaining: Math.max(0, quotaLimit - row.used),
        exhausted: row.used >= quotaLimit,
        // Livraisons gratuites (re-téléchargements compris).
        deliveries: deliveriesById.get(userId) || 0,
        lastAt: row.lastAt || null,
      };
    }),
    pagination: pagination(paging, result?.total?.[0]?.count || 0),
  };
};

/** Indicateurs du quota gratuit et valeurs des filtres (années, organismes). */
const getFreeDownloadStats = async () => {
  const [charged, deliveries, accounts, exhausted, years, organismeIds, top] = await Promise.all([
    DownloadLog.countDocuments({ access: 'free_quota', charged: true }),
    DownloadLog.countDocuments({ access: 'free_quota' }),
    DownloadQuota.countDocuments({ subject: /^free:u:/ }),
    countExhaustedFreeAccounts(),
    DownloadLog.distinct('year', { access: 'free_quota' }),
    DownloadLog.distinct('organisme', { access: 'free_quota' }),
    DownloadLog.aggregate([
      { $match: { access: 'free_quota', user: { $ne: null } } },
      { $group: { _id: '$user', count: { $sum: 1 }, lastAt: { $max: '$createdAt' } } },
      { $sort: { count: -1, lastAt: -1 } },
      { $limit: 5 },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
    ]),
  ]);
  const organismes = await Organisme.find({ _id: { $in: organismeIds.filter(Boolean) } }).select('nom').sort('nom').lean();
  return {
    limit: billingConfig.downloads.recentLimits.free,
    freeUntilYear: billingConfig.downloads.freeUntilYear,
    freeQuotaUntilYear: billingConfig.downloads.freeQuotaUntilYear,
    // Téléchargements ayant consommé le quota / livraisons totales (re-téléchargements compris).
    charged,
    deliveries,
    accounts,
    exhausted,
    topUsers: top.map((row) => ({ id: row._id, name: row.user[0]?.name || 'Compte supprimé', email: row.user[0]?.email || null, count: row.count, lastAt: row.lastAt })),
    filters: {
      years: years.filter(Number.isInteger).sort((a, b) => b - a),
      organismes: organismes.map((item) => ({ id: item._id, nom: item.nom })),
    },
  };
};

module.exports = {
  getStats,
  listFreeDownloads,
  listFreeQuotaUsers,
  getFreeDownloadStats,
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
