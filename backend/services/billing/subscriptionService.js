const Subscription = require('../../models/Subscription');
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
    firstActivatedAt: subscription?.firstActivatedAt || null,
    cycleStart: subscription?.cycleStart || null,
    currentPeriodEnd: subscription?.currentPeriodEnd || null,
    renewalDate: subscription?.cycleStart ? computeCycleEnd(subscription.cycleStart) : null,
    hasPendingPayment: pending,
  };
};

const isSubscriptionActive = async (userId, now = new Date()) => {
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

module.exports = {
  getSubscription,
  describeSubscription,
  isSubscriptionActive,
  hasSucceededPayment,
  quoteForUser,
  applyPaymentToSubscription,
};
