const Payment = require('../../models/Payment');
const PaymentWebhookEvent = require('../../models/PaymentWebhookEvent');
const Commission = require('../../models/Commission');
const User = require('../../models/User');
const billingConfig = require('../../config/billing');
const securityConfig = require('../../config/security');
const AppError = require('../../utils/errors');
const log = require('./paymentLogger');
const breaker = require('./circuitBreaker');
const { getPaymentProvider, getProviderByName } = require('./index');
const { assertUsableMethod, labelFor, listEnabled } = require('./paymentMethodService');
const {
  quoteForUser,
  hasSucceededPayment,
  applyPaymentToSubscription,
} = require('../billing/subscriptionService');
const { assertApplicablePromoCode } = require('../billing/promoCodeService');
const { DAY_MS } = require('../billing/pricing');

const OPEN_STATUSES = Payment.OPEN_STATUSES;
const FINAL_FAILURES = ['FAILED', 'CANCELLED', 'EXPIRED'];
// Un paiement clos chez nous (annulé, expiré) mais confirmé ensuite par le fournisseur a bien été
// encaissé : il est honoré. On le revérifie pendant la durée de vie d'un lien GeniusPay (24 h).
const LATE_SUCCESS_FROM = ['CANCELLED', 'EXPIRED'];
const LATE_SUCCESS_WINDOW_MS = DAY_MS;

/** Numéro ivoirien : 10 chiffres, préfixe +225/00225 toléré. */
const normalizePhone = (value) => {
  const digits = String(value || '').replace(/\D/g, '').replace(/^(00)?225/, '');
  return /^0\d{9}$/.test(digits) ? digits : null;
};

/** Numéro lisible, montré uniquement à son propriétaire : 07 01 02 03 04. */
const formatPhone = (phone) => (phone ? phone.replace(/(\d{2})(?=\d)/g, '$1 ') : null);

/** Numéro masqué affiché à l'abonné : 07 •• •• •• 04. */
const maskPhone = (phone) => (phone ? `${phone.slice(0, 2)} •• •• •• ${phone.slice(-2)}` : null);

/** Consignes présentées à l'abonné selon le parcours du moyen choisi. */
const instructionsFor = (flow, method, phoneHint) => (flow === 'push'
  ? `Une demande de paiement ${method.label} a été envoyée au ${phoneHint}. Validez-la sur votre téléphone avec votre code secret.`
  : `Finalisez le paiement sur la page sécurisée ${method.label}.`);

// Retour vers l'application mobile : seuls ses schémas sont acceptés (pas de redirection ouverte).
const safeAppReturnUrl = (value) => (typeof value === 'string' && /^(fatafalta|exp|exps):\/\/[^\s]{1,300}$/i.test(value) ? value : null);

const toPublicPayment = (payment) => {
  const open = OPEN_STATUSES.includes(payment.status);
  return {
    id: payment._id,
    kind: payment.kind,
    status: payment.status,
    currency: payment.currency,
    baseAmount: payment.baseAmount,
    discount: payment.discount,
    amount: payment.amount,
    method: payment.method,
    methodLabel: labelFor(payment),
    // Référence du fournisseur, utile pour le support (jamais un secret).
    reference: payment.providerRef || null,
    // 'redirect' : page de paiement (QR code Wave…) ; 'push' : validation sur le téléphone.
    flow: payment.flow || (payment.redirectUrl ? 'redirect' : 'push'),
    phoneHint: payment.phoneHint || null,
    // Permet de reprendre un paiement interrompu tant qu'il est ouvert (parcours « redirect »).
    redirectUrl: open && payment.flow !== 'push' ? payment.redirectUrl || null : null,
    // Étapes de confirmation de l'opérateur de CETTE tentative (vide pour une page de paiement).
    confirmSteps: payment.confirmSteps || [],
    failureReason: payment.failureReason || null,
    createdAt: payment.createdAt,
    expiresAt: payment.expiresAt,
    periodEnd: payment.periodEnd,
  };
};

/**
 * Vue destinée au titulaire du paiement : ajoute le numéro réellement utilisé pour la
 * transaction, afin que l'écran de confirmation affiche exactement ce qui a été envoyé.
 */
const toOwnerPayment = async (payment) => {
  const stored = await Payment.findById(payment._id).select('+phone').lean();
  return { ...toPublicPayment(payment), phone: formatPhone(stored?.phone) };
};

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
 * un paiement d'un état `from` à un état final. Les appels suivants sont sans effet.
 */
const transition = async (paymentId, status, reason, { from = OPEN_STATUSES, note } = {}) => {
  const payment = await Payment.findOneAndUpdate(
    { _id: paymentId, status: { $in: from } },
    {
      $set: { status, ...(reason && status !== 'SUCCEEDED' ? { failureReason: reason } : {}) },
      $unset: { openFor: 1, ...(status === 'SUCCEEDED' ? { failureReason: 1 } : {}) },
      $push: { statusHistory: { status, note: note || reason } },
    },
    { new: true }
  );

  if (payment) {
    log.info('payment.transition', { paymentId, userId: payment.user, reference: payment.providerRef, to: status, reason: note || reason });
    if (status === 'SUCCEEDED') await fulfil(payment);
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

  const result = await Payment.updateOne(
    { _id: payment._id, fulfilledAt: null },
    { $set: { fulfilledAt: new Date(), periodEnd: subscription.currentPeriodEnd } }
  );
  if (result.modifiedCount) {
    log.info('subscription.activated', { paymentId: payment._id, userId: payment.user, reference: payment.providerRef });
  }
};

/**
 * Un succès n'est accepté que si la transaction du fournisseur correspond exactement à la nôtre :
 * même référence, même environnement, même montant, même devise, même paiement interne.
 */
const verifyProviderSuccess = (payment, result, provider) => {
  const problems = [];
  if (result.providerRef && result.providerRef !== payment.providerRef) problems.push('reference');
  if (provider.environment && result.environment !== provider.environment) problems.push('environment');
  if (provider.environment || result.amount !== undefined) {
    if (!Number.isFinite(result.amount) || Math.round(result.amount) !== payment.amount) problems.push('amount');
  }
  if (result.currency && result.currency !== payment.currency) problems.push('currency');
  if (result.metadata?.payment_id && String(result.metadata.payment_id) !== String(payment._id)) problems.push('metadata');
  return problems;
};

/** Applique un statut obtenu du fournisseur (API ou webhook vérifié). */
const applyProviderResult = async (payment, result, provider, source) => {
  if (result.providerStatus && (result.providerStatus !== payment.providerStatus || result.environment !== payment.providerEnvironment)) {
    await Payment.updateOne(
      { _id: payment._id },
      { $set: { providerStatus: result.providerStatus, ...(result.environment ? { providerEnvironment: result.environment } : {}) } }
    );
  }

  if (result.status === 'SUCCEEDED') {
    const problems = verifyProviderSuccess(payment, result, provider);
    if (problems.length) {
      // Ne jamais activer un abonnement sur une transaction non conforme : alerte et clôture.
      log.error('payment.verification_failed', { paymentId: payment._id, reference: payment.providerRef, reason: problems.join(','), amount: result.amount, currency: result.currency, environment: result.environment });
      return (await transition(payment._id, 'FAILED', 'Paiement non conforme. Contactez le support avec la référence indiquée.', { note: `verification:${problems.join(',')}` }))
        || Payment.findById(payment._id);
    }
    const from = [...OPEN_STATUSES, ...LATE_SUCCESS_FROM];
    const note = LATE_SUCCESS_FROM.includes(payment.status) ? `Confirmé par ${source} après clôture locale` : `Confirmé par ${source}`;
    return (await transition(payment._id, 'SUCCEEDED', null, { from, note })) || Payment.findById(payment._id);
  }

  if (FINAL_FAILURES.includes(result.status)) {
    return (await transition(payment._id, result.status, result.reason, { note: `${result.reason || result.status} (${source})` })) || Payment.findById(payment._id);
  }

  if (result.status === 'PROCESSING') {
    return (await Payment.findOneAndUpdate(
      { _id: payment._id, status: { $in: ['INITIATED', 'PENDING'] } },
      { $set: { status: 'PROCESSING' }, $push: { statusHistory: { status: 'PROCESSING', note: source } } },
      { new: true }
    )) || Payment.findById(payment._id);
  }

  return Payment.findById(payment._id);
};

// Interrogations du fournisseur en cours, par paiement.
const inFlightStatusChecks = new Map();

/**
 * Plusieurs lectures simultanées d'un même paiement (onglets, web + mobile, polling, webhook)
 * partagent un seul appel au fournisseur. L'état reste toujours à jour (aucun cache) ; le volume
 * d'appels par utilisateur est borné par la limite `payment-status` et le coupe-circuit.
 */
const getProviderStatus = (provider, payment) => {
  const key = `${provider.name}:${payment._id}`;
  if (inFlightStatusChecks.has(key)) return inFlightStatusChecks.get(key);
  const promise = breaker.run(provider.name, 'status', () => provider.getStatus(payment))
    .finally(() => inFlightStatusChecks.delete(key));
  inFlightStatusChecks.set(key, promise);
  return promise;
};

const queryProvider = async (payment) => {
  const provider = getProviderByName(payment.provider) || getPaymentProvider();
  try {
    return { provider, result: await getProviderStatus(provider, payment) };
  } catch (error) {
    // Fournisseur momentanément injoignable : on réessaiera à la prochaine lecture.
    log.warn('payment.status_unavailable', { paymentId: payment._id, reference: payment.providerRef, reason: error.message });
    return { provider, result: null };
  }
};

const canStillSucceed = (payment) => LATE_SUCCESS_FROM.includes(payment.status)
  && payment.providerRef
  && payment.provider !== 'mock'
  && Date.now() - new Date(payment.createdAt).getTime() < LATE_SUCCESS_WINDOW_MS;

/** Met un paiement à jour auprès du fournisseur (réconciliation). */
const refreshPayment = async (payment) => {
  if (payment.status === 'SUCCEEDED' && !payment.fulfilledAt) {
    await fulfil(payment);
    return Payment.findById(payment._id);
  }

  const open = OPEN_STATUSES.includes(payment.status);
  if (!open && !canStillSucceed(payment)) {
    return payment;
  }

  let current = payment;
  if (payment.providerRef) {
    const { provider, result } = await queryProvider(payment);
    if (result?.status && result.status !== 'PENDING' && (open || result.status === 'SUCCEEDED')) {
      current = await applyProviderResult(payment, result, provider, 'api');
    }
  }

  // Le fournisseur a été interrogé d'abord : un paiement encaissé n'expire jamais à tort.
  if (OPEN_STATUSES.includes(current.status) && current.expiresAt && current.expiresAt < new Date()) {
    return (await transition(current._id, 'EXPIRED', 'Délai de confirmation dépassé')) || Payment.findById(current._id);
  }

  return current;
};

const providerErrorToAppError = (error) => {
  if (error.circuitOpen) {
    const unavailable = new AppError('Le service de paiement est momentanément injoignable. Réessayez dans un instant.', 503, undefined, 'PAYMENT_PROVIDER_UNAVAILABLE');
    unavailable.retryAfter = Math.ceil(error.retryAfterMs / 1000);
    return unavailable;
  }
  if (error.retriable || !error.httpStatus) {
    return new AppError('Le service de paiement est momentanément injoignable. Réessayez dans un instant.', 503, undefined, 'PAYMENT_PROVIDER_UNAVAILABLE');
  }
  return new AppError('Ce moyen de paiement est momentanément indisponible. Réessayez ou choisissez-en un autre.', 502, undefined, 'PAYMENT_PROVIDER_ERROR');
};

const buildReturnUrls = (payment, appReturnUrl) => {
  const url = (outcome) => {
    const params = new URLSearchParams({ payment: String(payment._id), outcome });
    if (appReturnUrl) params.set('return', appReturnUrl);
    return `${billingConfig.payments.webCheckoutUrl}?${params.toString()}`;
  };
  return { successUrl: url('success'), errorUrl: url('error') };
};

/** Réponse d'initiation commune (création ou rejeu d'une même tentative). */
const describeInitiated = async (payment) => {
  const publicPayment = await toOwnerPayment(payment);
  return {
    payment: publicPayment,
    flow: publicPayment.flow,
    instructions: instructionsFor(publicPayment.flow, { label: publicPayment.methodLabel }, publicPayment.phoneHint),
    // Seul le parcours « redirect » envoie l'abonné sur une page externe.
    redirectUrl: publicPayment.flow === 'redirect' ? publicPayment.redirectUrl : null,
  };
};

/**
 * Tentative précédente encore ouverte. Règle : chaque nouvelle tentative utilise exclusivement
 * les informations qu'elle transporte. Une tentative abandonnée (en attente, rien validé) est
 * close et remplacée ; on ne la réutilise jamais à la place de la nouvelle.
 *  - même attemptId  → rejeu de la même requête (double clic, réseau) : même transaction ;
 *  - création en cours (INITIATED) → patienter, pour ne pas créer deux transactions à la fois ;
 *  - validation en cours chez l'opérateur (PROCESSING) → jamais remplacée (risque de double débit).
 * Une tentative remplacée mais finalement payée reste honorée (voir LATE_SUCCESS_FROM).
 */
const settlePreviousAttempt = async (user, attemptId) => {
  const open = await Payment.findOne({ openFor: user._id });
  if (!open) return null;

  if (attemptId && open.attemptId === attemptId) {
    return { replay: await refreshPayment(open) };
  }

  const refreshed = await refreshPayment(open);
  if (!OPEN_STATUSES.includes(refreshed.status)) return null;

  if (refreshed.status === 'INITIATED') {
    throw new AppError('Un paiement est en cours de création. Patientez quelques secondes puis réessayez.', 409, undefined, 'PAYMENT_IN_PROGRESS');
  }
  if (refreshed.status === 'PROCESSING') {
    throw new AppError('Votre paiement précédent est en cours de validation par l’opérateur. Patientez quelques instants.', 409, { paymentId: refreshed._id }, 'PAYMENT_PROCESSING');
  }

  const provider = getProviderByName(refreshed.provider) || getPaymentProvider();
  await provider.cancel(refreshed);
  await transition(refreshed._id, 'CANCELLED', 'Remplacé par une nouvelle tentative', { note: 'superseded' });
  log.info('payment.superseded', { paymentId: refreshed._id, userId: user._id, reference: refreshed.providerRef });
  return null;
};

const HOUR_MS = 60 * 60 * 1000;

/**
 * Plafonds de créations de transactions, comptés en base (persistants et communs à toutes les
 * instances). Un rejeu (même attemptId) ne crée rien et n'est donc jamais compté.
 */
const assertCreationQuota = async (user) => {
  const { maxPerHour, maxPerDay } = securityConfig.payments;
  const now = Date.now();
  const windows = [
    { max: maxPerHour, ms: HOUR_MS, code: 'PAYMENT_HOURLY_LIMIT', label: 'cette heure' },
    { max: maxPerDay, ms: DAY_MS, code: 'PAYMENT_DAILY_LIMIT', label: 'aujourd’hui' },
  ];
  for (const window of windows) {
    if (!window.max) continue;
    const since = new Date(now - window.ms);
    const count = await Payment.countDocuments({ user: user._id, createdAt: { $gte: since } });
    if (count >= window.max) {
      // Réessai possible quand la plus ancienne tentative de la fenêtre en sort.
      const oldest = await Payment.findOne({ user: user._id, createdAt: { $gte: since } }).sort({ createdAt: 1 }).select('createdAt').lean();
      const retryAfter = Math.max(60, Math.ceil(((oldest ? new Date(oldest.createdAt).getTime() : now) + window.ms - now) / 1000));
      log.warn('payment.quota_reached', { userId: user._id, reason: window.code, status: `${count}/${window.max}` });
      const error = new AppError(`Nombre maximal de tentatives de paiement atteint pour ${window.label}. Réessayez plus tard ou contactez le support.`, 429, undefined, window.code);
      error.retryAfter = retryAfter;
      throw error;
    }
  }
};

/**
 * Même attemptId déjà utilisé : c'est la même demande (double clic, renvoi réseau).
 *  - paiement réussi ou encore ouvert → on renvoie ce paiement, rien n'est recréé ;
 *  - paramètres différents (autre opérateur, autre numéro) → refus : une clé d'idempotence ne
 *    peut pas servir à une autre demande ;
 *  - tentative échouée/annulée/expirée → nouvelle tentative légitime (bouton « Réessayer »).
 */
const findSameAttempt = async (user, attemptId, { method, phone }) => {
  if (!attemptId) return null;
  const existing = await Payment.findOne({ user: user._id, attemptId }).sort({ createdAt: -1 }).select('+phone');
  if (!existing) return null;
  if (existing.method !== method.code || (existing.phone || null) !== (phone || null)) {
    log.warn('payment.idempotency_mismatch', { paymentId: existing._id, userId: user._id, method: method.code });
    throw new AppError('Cette demande de paiement a déjà été envoyée avec d’autres informations. Recommencez depuis le formulaire.', 422, undefined, 'IDEMPOTENCY_KEY_REUSED');
  }
  if (existing.status === 'SUCCEEDED' || OPEN_STATUSES.includes(existing.status)) {
    log.info('payment.replayed', { paymentId: existing._id, userId: user._id, status: existing.status });
    return existing;
  }
  return null;
};

// Requêtes identiques simultanées (double clic) : elles partagent le même traitement et la même réponse.
const inFlightInitiations = new Map();

const initiatePayment = async (user, payload) => {
  const attemptId = typeof payload.attemptId === 'string' && /^[A-Za-z0-9_-]{8,64}$/.test(payload.attemptId) ? payload.attemptId : null;
  if (!attemptId) return doInitiatePayment(user, payload, null);

  const key = `${user._id}:${attemptId}`;
  if (inFlightInitiations.has(key)) {
    log.info('payment.duplicate_request_joined', { userId: user._id });
    return inFlightInitiations.get(key);
  }
  const promise = doInitiatePayment(user, payload, attemptId).finally(() => inFlightInitiations.delete(key));
  inFlightInitiations.set(key, promise);
  return promise;
};

const doInitiatePayment = async (user, { method: methodCode, phone: rawPhone, promoCode: rawPromoCode, channel, returnUrl }, attemptId) => {
  // Contrôle serveur : le moyen doit exister ET être activé par l'administrateur.
  const method = await assertUsableMethod(methodCode);

  const phone = normalizePhone(rawPhone);
  if (method.requiresPhone && !phone) {
    throw new AppError('Numéro Mobile Money invalide (10 chiffres attendus).', 400, undefined, 'PHONE_INVALID');
  }

  const sameAttempt = await findSameAttempt(user, attemptId, { method, phone });
  if (sameAttempt) {
    return describeInitiated(await refreshPayment(sameAttempt));
  }

  await assertCreationQuota(user);

  // Tentative précédente : rejouée si c'est la même, sinon close et remplacée par celle-ci.
  const previous = await settlePreviousAttempt(user, attemptId);
  if (previous?.replay) {
    return describeInitiated(previous.replay);
  }

  let provider;
  try {
    provider = getPaymentProvider();
  } catch (error) {
    log.error('provider.misconfigured', { reason: error.message });
    throw new AppError('Le paiement est momentanément indisponible.', 503, undefined, 'PAYMENT_PROVIDER_UNAVAILABLE');
  }

  // Montant, type et remise : calculés exclusivement par le serveur.
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
      method: method.code,
      methodLabel: method.label,
      confirmSteps: method.confirmSteps?.length ? method.confirmSteps : undefined,
      attemptId: attemptId || undefined,
      phone: phone || undefined,
      phoneHint: maskPhone(phone) || undefined,
      flow: method.flow,
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

  log.info('payment.initiated', { paymentId: payment._id, userId: user._id, provider: provider.name, method: method.code, amount: payment.amount, currency: payment.currency });

  try {
    const plan = billingConfig.plans[priced.kind];
    const started = await breaker.run(provider.name, 'initiate', () => provider.initiate({
      payment,
      phone,
      method,
      user,
      description: `Fatafalta · ${plan.label} ${plan.months} mois`,
      ...buildReturnUrls(payment, safeAppReturnUrl(returnUrl)),
    }));

    const openStatus = started.status === 'PROCESSING' ? 'PROCESSING' : 'PENDING';
    payment = await Payment.findOneAndUpdate(
      { _id: payment._id, status: 'INITIATED' },
      {
        $set: {
          providerRef: started.providerRef,
          status: openStatus,
          redirectUrl: started.redirectUrl || undefined,
          // Sans page de paiement renvoyée, l'abonné valide forcément sur son téléphone.
          flow: started.redirectUrl ? method.flow : 'push',
          providerStatus: started.providerStatus || undefined,
          providerEnvironment: started.environment || undefined,
        },
        $push: { statusHistory: { status: openStatus } },
      },
      { new: true }
    );

    log.info('payment.provider_created', { paymentId: payment._id, reference: started.providerRef, environment: started.environment });
    return describeInitiated(payment);
  } catch (error) {
    log.error('payment.provider_init_failed', { paymentId: payment._id, httpStatus: error.httpStatus, errorCode: error.code, reason: error.circuitOpen ? 'circuit_open' : error.name });
    await transition(payment._id, 'FAILED', 'Le paiement n’a pas pu être lancé.');
    throw providerErrorToAppError(error);
  }
};

const getMyPayment = async (user, paymentId) => {
  const payment = await Payment.findOne({ _id: paymentId, user: user._id });
  if (!payment) {
    throw new AppError('Paiement introuvable', 404);
  }
  return toOwnerPayment(await refreshPayment(payment));
};

const cancelMyPayment = async (user, paymentId) => {
  const payment = await Payment.findOne({ _id: paymentId, user: user._id });
  if (!payment) {
    throw new AppError('Paiement introuvable', 404);
  }

  const refreshed = await refreshPayment(payment);
  if (!OPEN_STATUSES.includes(refreshed.status)) {
    return toOwnerPayment(refreshed);
  }

  const provider = getProviderByName(refreshed.provider) || getPaymentProvider();
  await provider.cancel(refreshed);
  const cancelled = await transition(refreshed._id, 'CANCELLED', 'Annulé par l’utilisateur');
  return toOwnerPayment(cancelled || (await Payment.findById(refreshed._id)));
};

/**
 * Synchronisation à la lecture de l'état : si l'abonné a un paiement ouvert, il est revérifié
 * auprès du fournisseur avant de répondre. Le web et le mobile lisent donc toujours un état à
 * jour, même si le paiement vient d'être confirmé ailleurs. Une erreur fournisseur n'empêche
 * jamais la lecture (la réconciliation serveur prendra le relais).
 */
const syncOpenPayment = async (userId) => {
  const open = await Payment.findOne({ openFor: userId });
  if (!open) return;
  try {
    await refreshPayment(open);
  } catch (error) {
    log.warn('payment.sync_failed', { paymentId: open._id, reason: error.message });
  }
};

const listMyPayments = async (user) => {
  const payments = await Payment.find({ user: user._id }).sort({ createdAt: -1 }).limit(50);
  return payments.map(toPublicPayment);
};

/** Paiement visé par un webhook : par référence, ou par nos metadata si la référence n'est pas encore enregistrée. */
const findWebhookPayment = async (providerName, event) => {
  if (event.providerRef) {
    const byRef = await Payment.findOne({ providerRef: event.providerRef, provider: providerName });
    if (byRef) return byRef;
  }
  const internalId = event.metadata?.payment_id;
  if (internalId && /^[a-f0-9]{24}$/i.test(String(internalId))) {
    return Payment.findOne({ _id: internalId, provider: providerName });
  }
  return null;
};

/**
 * Webhook : signature et environnement vérifiés par le provider, réception dédoublonnée par
 * identifiant d'événement, puis statut reconfirmé auprès de l'API avant toute activation.
 */
const handleWebhook = async (providerName, req) => {
  const provider = getProviderByName(providerName);
  if (!provider) {
    throw new AppError('Fournisseur inconnu', 404);
  }

  let event;
  try {
    event = await provider.parseWebhook(req);
  } catch (error) {
    log.warn('webhook.rejected', { provider: providerName, reason: error.message });
    throw new AppError('Webhook refusé', error.statusCode || 401);
  }

  const eventId = event.eventId || `${providerName}:${event.providerRef}:${event.status}`;
  let record;
  try {
    record = await PaymentWebhookEvent.create({
      provider: providerName,
      eventId,
      event: event.event,
      reference: event.providerRef,
      environment: event.environment,
    });
  } catch (error) {
    if (error.code === 11000) {
      log.info('webhook.duplicate', { provider: providerName, eventId, reference: event.providerRef });
      return { duplicate: true };
    }
    throw error;
  }

  log.info('webhook.received', { provider: providerName, eventId, event: event.event, reference: event.providerRef, providerStatus: event.providerStatus });

  try {
    const payment = await findWebhookPayment(providerName, event);
    if (!payment) {
      log.warn('webhook.unknown_payment', { provider: providerName, eventId, reference: event.providerRef });
      await PaymentWebhookEvent.updateOne({ _id: record._id }, { $set: { outcome: 'unknown_payment' } });
      return { ignored: true };
    }

    if (!payment.providerRef && event.providerRef) {
      await Payment.updateOne({ _id: payment._id, providerRef: null }, { $set: { providerRef: event.providerRef } });
      payment.providerRef = event.providerRef;
    }

    // Le statut faisant autorité est celui de l'API ; à défaut (API injoignable), celui du webhook signé.
    let result = event;
    if (event.status && event.status !== 'PENDING' && payment.providerRef) {
      const confirmed = await queryProvider(payment);
      if (confirmed.result?.status) result = confirmed.result;
    }

    let outcome = 'no_change';
    if (result.status && result.status !== 'PENDING' && (OPEN_STATUSES.includes(payment.status) || (result.status === 'SUCCEEDED' && LATE_SUCCESS_FROM.includes(payment.status)))) {
      const updated = await applyProviderResult(payment, result, provider, 'webhook');
      outcome = updated?.status || outcome;
    } else if (payment.status === 'SUCCEEDED' && !payment.fulfilledAt) {
      await fulfil(payment);
    }

    await PaymentWebhookEvent.updateOne({ _id: record._id }, { $set: { payment: payment._id, outcome } });
    return { paymentId: payment._id, outcome };
  } catch (error) {
    // Échec de traitement : on libère l'événement pour que la relivraison soit retraitée.
    await PaymentWebhookEvent.deleteOne({ _id: record._id });
    log.error('webhook.processing_failed', { provider: providerName, eventId, reference: event.providerRef, reason: error.message });
    throw error;
  }
};

const getPublicPlans = async () => {
  const { mode } = billingConfig.payments;
  const geniusPayEnv = (process.env.GENIUSPAY_ENV || 'sandbox').toLowerCase();
  return {
    currency: billingConfig.currency,
    initial: billingConfig.plans.initial,
    monthly: billingConfig.plans.monthly,
    promo: {
      discountedInitialAmount: billingConfig.promo.discountedInitialAmount,
      referrerCommission: billingConfig.promo.referrerCommission,
    },
    // Uniquement les moyens activés par l'administrateur.
    methods: await listEnabled(),
    downloadsPerDay: billingConfig.downloads.dailyLimit,
    // Aucun débit réel : simulation locale (mock) ou environnement de test du fournisseur.
    sandbox: mode === 'mock' || (mode === 'geniuspay' && geniusPayEnv !== 'production'),
    // Simulation locale : les scénarios dépendent des derniers chiffres du numéro.
    simulated: mode === 'mock',
  };
};

module.exports = {
  normalizePhone,
  quote,
  initiatePayment,
  getMyPayment,
  cancelMyPayment,
  listMyPayments,
  syncOpenPayment,
  handleWebhook,
  refreshPayment,
  toPublicPayment,
  getPublicPlans,
};
