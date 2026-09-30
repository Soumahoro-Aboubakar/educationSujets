const Payment = require('../../models/Payment');
const Commission = require('../../models/Commission');
const User = require('../../models/User');
const billingConfig = require('../../config/billing');
const AppError = require('../../utils/errors');
const { getPaymentProvider, getProviderByName } = require('./index');
const {
  quoteForUser,
  hasSucceededPayment,
  applyPaymentToSubscription,
} = require('../billing/subscriptionService');
const { assertApplicablePromoCode } = require('../billing/promoCodeService');
const { DAY_MS } = require('../billing/pricing');

const OPEN_STATUSES = Payment.OPEN_STATUSES;

const findMethod = (methodId) => billingConfig.payments.methods.find((method) => method.id === methodId);

/** Numéro ivoirien : 10 chiffres, préfixe +225/00225 toléré. */
const normalizePhone = (value) => {
  const digits = String(value || '').replace(/\D/g, '').replace(/^(00)?225/, '');
  return /^0\d{9}$/.test(digits) ? digits : null;
};

const toPublicPayment = (payment) => ({
  id: payment._id,
  kind: payment.kind,
  status: payment.status,
  currency: payment.currency,
  baseAmount: payment.baseAmount,
  discount: payment.discount,
  amount: payment.amount,
  method: payment.method,
  methodLabel: findMethod(payment.method)?.label || payment.method,
  failureReason: payment.failureReason || null,
  createdAt: payment.createdAt,
  expiresAt: payment.expiresAt,
  periodEnd: payment.periodEnd,
});

/**
 * Devis côté serveur. Le client n'envoie jamais de montant : il n'envoie qu'un code éventuel.
 */
const buildQuote = async (user, rawPromoCode) => {
  const firstPayment = !(await hasSucceededPayment(user._id));
  let promo = null;

  if (rawPromoCode) {
    if (billingConfig.promo.firstPaymentOnly && !firstPayment) {
      throw new AppError('Le code promotionnel est réservé au premier abonnement.', 400, undefined, 'PROMO_FIRST_PAYMENT_ONLY');
    }
    promo = await assertApplicablePromoCode(rawPromoCode, user._id);
  }

  const quote = await quoteForUser(user._id, { promoApplicable: Boolean(promo) });

  // Un code n'a de sens que sur un paiement initial.
  if (promo && quote.kind !== 'initial') {
    promo = null;
  }

  return { quote, promo, firstPayment };
};

const quote = async (user, rawPromoCode) => {
  const result = await buildQuote(user, rawPromoCode);
  return {
    ...result.quote,
    promoCode: result.promo ? result.promo.code : null,
  };
};

/**
 * Transition atomique : seul le premier appelant (webhook, polling, expiration) fait passer
 * un paiement ouvert à un état final. Les appels suivants sont sans effet.
 */
const transition = async (paymentId, status, reason) => {
  const payment = await Payment.findOneAndUpdate(
    { _id: paymentId, status: { $in: OPEN_STATUSES } },
    {
      $set: { status, ...(reason ? { failureReason: reason } : {}) },
      $unset: { openFor: 1 },
      $push: { statusHistory: { status, note: reason } },
    },
    { new: true }
  );

  if (payment && status === 'SUCCEEDED') {
    await fulfil(payment);
  }

  return payment;
};

/**
 * Effets d'un paiement réussi. Chaque étape est idempotente : si le serveur s'arrête au
 * milieu, `fulfilledAt` reste vide et l'opération est rejouée à la prochaine lecture.
 */
const fulfil = async (payment) => {
  const subscription = await applyPaymentToSubscription(payment);

  if (payment.promoCode && payment.referrer) {
    try {
      await Commission.create({
        referrer: payment.referrer,
        referredUser: payment.user,
        payment: payment._id,
        promoCode: payment.promoCode,
        amount: Math.min(billingConfig.promo.referrerCommission, payment.amount),
        availableAt: new Date(Date.now() + billingConfig.promo.commissionHoldDays * DAY_MS),
      });
    } catch (error) {
      // 11000 : commission déjà attribuée pour ce filleul → règle « une seule fois » respectée.
      if (error.code !== 11000) throw error;
    }

    await User.updateOne({ _id: payment.user, referredBy: null }, { $set: { referredBy: payment.referrer } });
  }

  await Payment.updateOne(
    { _id: payment._id, fulfilledAt: null },
    { $set: { fulfilledAt: new Date(), periodEnd: subscription.currentPeriodEnd } }
  );
};

/** Met un paiement à jour auprès du fournisseur (réconciliation). */
const refreshPayment = async (payment) => {
  if (payment.status === 'SUCCEEDED' && !payment.fulfilledAt) {
    await fulfil(payment);
    return Payment.findById(payment._id);
  }

  if (!OPEN_STATUSES.includes(payment.status)) {
    return payment;
  }

  if (payment.expiresAt && payment.expiresAt < new Date()) {
    return (await transition(payment._id, 'EXPIRED', 'Délai de confirmation dépassé')) || Payment.findById(payment._id);
  }

  if (!payment.providerRef) {
    return payment;
  }

  const provider = getProviderByName(payment.provider) || getPaymentProvider();
  const result = await provider.getStatus(payment);

  if (result.status && result.status !== 'PENDING') {
    return (await transition(payment._id, result.status, result.reason)) || Payment.findById(payment._id);
  }

  return payment;
};

const initiatePayment = async (user, { method: methodId, phone: rawPhone, promoCode: rawPromoCode, channel }) => {
  const method = findMethod(methodId);
  if (!method) {
    throw new AppError('Moyen de paiement non pris en charge.', 400, undefined, 'PAYMENT_METHOD_INVALID');
  }

  const phone = normalizePhone(rawPhone);
  if (!phone) {
    throw new AppError('Numéro Mobile Money invalide (10 chiffres attendus).', 400, undefined, 'PHONE_INVALID');
  }

  // Un paiement déjà en cours ? On le réconcilie d'abord : il est peut-être terminé.
  const open = await Payment.findOne({ openFor: user._id });
  if (open) {
    const refreshed = await refreshPayment(open);
    if (OPEN_STATUSES.includes(refreshed.status)) {
      throw new AppError('Un paiement est déjà en cours.', 409, { paymentId: refreshed._id }, 'PAYMENT_IN_PROGRESS');
    }
  }

  const provider = getPaymentProvider();
  const { quote: priced, promo } = await buildQuote(user, rawPromoCode);

  let payment;
  try {
    payment = await Payment.create({
      user: user._id,
      kind: priced.kind,
      currency: priced.currency,
      baseAmount: priced.baseAmount,
      discount: priced.discount,
      amount: priced.amount,
      method: method.id,
      phone,
      channel: channel === 'mobile' ? 'mobile' : 'web',
      provider: provider.name,
      promoCode: promo?._id || null,
      referrer: promo?.owner || null,
      openFor: user._id,
      expiresAt: new Date(Date.now() + billingConfig.payments.pendingTtlMinutes * 60 * 1000),
      periodStart: priced.periodStart,
      periodEnd: priced.periodEnd,
      statusHistory: [{ status: 'INITIATED' }],
    });
  } catch (error) {
    if (error.code === 11000) {
      throw new AppError('Un paiement est déjà en cours.', 409, undefined, 'PAYMENT_IN_PROGRESS');
    }
    throw error;
  }

  try {
    const started = await provider.initiate({ payment, phone, method });
    payment = await Payment.findOneAndUpdate(
      { _id: payment._id, status: 'INITIATED' },
      {
        $set: { providerRef: started.providerRef, status: 'PENDING' },
        $push: { statusHistory: { status: 'PENDING' } },
      },
      { new: true }
    );
    return { payment: toPublicPayment(payment), instructions: started.instructions };
  } catch (error) {
    await transition(payment._id, 'FAILED', 'Le fournisseur de paiement est indisponible');
    throw new AppError('Le paiement n’a pas pu être lancé. Réessayez dans un instant.', 502, undefined, 'PAYMENT_PROVIDER_ERROR');
  }
};

const getMyPayment = async (user, paymentId) => {
  const payment = await Payment.findOne({ _id: paymentId, user: user._id });
  if (!payment) {
    throw new AppError('Paiement introuvable', 404);
  }
  return toPublicPayment(await refreshPayment(payment));
};

const cancelMyPayment = async (user, paymentId) => {
  const payment = await Payment.findOne({ _id: paymentId, user: user._id });
  if (!payment) {
    throw new AppError('Paiement introuvable', 404);
  }

  const refreshed = await refreshPayment(payment);
  if (!OPEN_STATUSES.includes(refreshed.status)) {
    return toPublicPayment(refreshed);
  }

  const provider = getProviderByName(refreshed.provider) || getPaymentProvider();
  await provider.cancel(refreshed);
  const cancelled = await transition(refreshed._id, 'CANCELLED', 'Annulé par l’utilisateur');
  return toPublicPayment(cancelled || (await Payment.findById(refreshed._id)));
};

const listMyPayments = async (user) => {
  const payments = await Payment.find({ user: user._id }).sort({ createdAt: -1 }).limit(50);
  return payments.map(toPublicPayment);
};

const handleWebhook = async (providerName, req) => {
  const provider = getProviderByName(providerName);
  if (!provider) {
    throw new AppError('Fournisseur inconnu', 404);
  }

  const event = await provider.parseWebhook(req);
  const payment = await Payment.findOne({ providerRef: event.providerRef, provider: providerName });
  if (!payment) {
    throw new AppError('Paiement introuvable', 404);
  }

  const allowed = ['SUCCEEDED', 'FAILED', 'CANCELLED'];
  if (allowed.includes(event.status)) {
    await transition(payment._id, event.status, event.reason);
  }
};

const getPublicPlans = () => ({
  currency: billingConfig.currency,
  initial: billingConfig.plans.initial,
  monthly: billingConfig.plans.monthly,
  promo: {
    discountedInitialAmount: billingConfig.promo.discountedInitialAmount,
    referrerCommission: billingConfig.promo.referrerCommission,
  },
  methods: billingConfig.payments.methods,
  downloadsPerDay: billingConfig.downloads.dailyLimit,
  // Permet à l'interface de signaler clairement un paiement simulé.
  sandbox: billingConfig.payments.mode === 'mock',
});

module.exports = {
  normalizePhone,
  quote,
  initiatePayment,
  getMyPayment,
  cancelMyPayment,
  listMyPayments,
  handleWebhook,
  refreshPayment,
  toPublicPayment,
  getPublicPlans,
};
