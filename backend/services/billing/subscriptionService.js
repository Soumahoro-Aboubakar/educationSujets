const Subscription = require('../../models/Subscription');
const User = require('../../models/User');
const AppError = require('../../utils/errors');
const log = require('../security/securityLogger');
const Payment = require('../../models/Payment');
const billingConfig = require('../../config/billing');
const { quoteNextPayment, resolveSubscriptionStatus, computeCycleEnd, addMonthsUTC } = require('./pricing');

const getSubscription = (userId) => Subscription.findOne({ user: userId }).lean();

const hasOpenPayment = async (userId) => Boolean(await Payment.exists({ openFor: userId }));

/** Vue publique de l'abonnement, partagée par le mobile, le web et l'admin. */
const describeSubscription = async (userId, now = new Date()) => {
  const [subscription, pending] = await Promise.all([getSubscription(userId), hasOpenPayment(userId)]);
  const status = resolveSubscriptionStatus({ subscription, now, hasPendingPayment: pending });

  return {
    status,
    accessState: subscription?.accessState || 'enabled',
    version: subscription?.accessVersion || 0,
    firstActivatedAt: subscription?.firstActivatedAt || null,
    cycleStart: subscription?.cycleStart || null,
    currentPeriodEnd: subscription?.currentPeriodEnd || null,
    renewalDate: subscription?.cycleStart ? computeCycleEnd(subscription.cycleStart) : null,
    hasPendingPayment: pending,
  };
};

const isSubscriptionActive = async (userId, now = new Date()) => {
  const user = await User.findById(userId).select('accountStatus').lean();
  if (!user || (user.accountStatus && user.accountStatus !== 'ACTIVE')) return false;
  const subscription = await getSubscription(userId);
  return resolveSubscriptionStatus({ subscription, now }) === 'ACTIVE';
};

/** L'utilisateur a-t-il déjà un paiement réussi ? (détermine l'éligibilité au code promo) */
const hasSucceededPayment = async (userId) => Boolean(await Payment.exists({ user: userId, status: 'SUCCEEDED' }));

const quoteForUser = async (userId, { promoApplicable = false, now = new Date() } = {}) => {
  const subscription = await getSubscription(userId);
  return quoteNextPayment({ subscription, now, promoApplicable });
};

/**
 * Prolonge l'accès suite à un paiement réussi. Idempotent : le filtre `appliedPayments: { $ne }`
 * garantit qu'un même paiement n'est appliqué qu'une fois, même en cas d'appels concurrents.
 */
const applyPaymentToSubscription = async (payment, now = new Date(), attempt = 0) => {
  const plan = billingConfig.plans[payment.kind];

  // Upsert sans effet si déjà présent, pour disposer d'un document à mettre à jour.
  await Subscription.updateOne({ user: payment.user }, { $setOnInsert: { user: payment.user } }, { upsert: true });

  const subscription = await Subscription.findOne({ user: payment.user }).lean();
  if (subscription.appliedPayments?.some((id) => id.toString() === payment._id.toString())) {
    return subscription;
  }

  const current = subscription.currentPeriodEnd ? new Date(subscription.currentPeriodEnd) : null;
  const periodStart = current && current > now ? current : now;
  const update = {
    $set: { currentPeriodEnd: addMonthsUTC(periodStart, plan.months) },
    $push: { appliedPayments: payment._id },
    $inc: { accessVersion: 1 },
  };

  if (payment.kind === 'initial') {
    update.$set.cycleStart = periodStart;
  }

  if (!subscription.firstActivatedAt) {
    update.$set.firstActivatedAt = now;
  }

  // La condition sur currentPeriodEnd évite qu'un autre paiement appliqué entre-temps soit écrasé.
  const updated = await Subscription.findOneAndUpdate(
    { _id: subscription._id, appliedPayments: { $ne: payment._id }, currentPeriodEnd: subscription.currentPeriodEnd },
    update,
    { new: true }
  ).lean();

  if (!updated) {
    // Conflit concurrent : on relit et on réessaie (le paiement a peut-être déjà été appliqué).
    if (attempt >= 5) throw new Error(`Conflit persistant sur l'abonnement du paiement ${payment._id}`);
    return applyPaymentToSubscription(payment, now, attempt + 1);
  }

  return updated;
};

/** Même instant et même source pour les capacités PREP et téléchargement. */
const accessSnapshot = async (user, now = new Date()) => {
  const subscription = user ? await describeSubscription(user._id, now) : null;
  const accountActive = !user || !user.accountStatus || user.accountStatus === 'ACTIVE';
  const accessState = !accountActive ? 'suspended' : subscription?.accessState || 'enabled';
  const blocked = accessState !== 'enabled';
  const admin = Boolean(user && accountActive && !blocked && billingConfig.downloads.exemptRoles.includes(user.role));
  const premium = !blocked && (admin || subscription?.status === 'ACTIVE');
  const validUntil = premium ? new Date(Math.min(now.getTime() + 86400000,
    admin ? Infinity : new Date(subscription.currentPeriodEnd).getTime())) : now;
  return { serverTime: now, checkedAt: now, validUntil, accessState, version: subscription?.version || 0,
    capabilities: { premium, prep: premium, download: premium }, admin, subscription };
};
const setAccessState = async (userId, { accessState, reason }, actor) => {
  if (!['enabled', 'suspended', 'revoked'].includes(accessState) || typeof reason !== 'string' || !reason.trim() || reason.length > 500) {
    throw new AppError('État et motif (1 à 500 caractères) obligatoires', 400);
  }
  if (!await User.exists({ _id: userId })) throw new AppError('Utilisateur introuvable', 404);
  await Subscription.findOneAndUpdate({ user: userId }, {
    $set: { accessState, accessReason: reason.trim(), accessChangedAt: new Date(), accessChangedBy: actor._id },
    $inc: { accessVersion: 1 },
  }, { upsert: true, new: true, runValidators: true });
  log.info('subscription.access_changed', { userId, actorId: actor._id, status: accessState });
  return describeSubscription(userId);
};

module.exports = {
  accessSnapshot,
  setAccessState,
  getSubscription,
  describeSubscription,
  isSubscriptionActive,
  hasSucceededPayment,
  quoteForUser,
  applyPaymentToSubscription,
};
