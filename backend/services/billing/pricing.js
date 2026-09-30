/**
 * Moteur tarifaire — fonctions pures, sans accès base de données, testées dans
 * tests/billingPricing.test.js. Toutes les règles viennent de config/billing.js.
 */
const defaultConfig = require('../../config/billing');

const DAY_MS = 24 * 60 * 60 * 1000;

const addMonthsUTC = (date, months) => {
  const source = new Date(date);
  const targetMonthIndex = source.getUTCMonth() + months;
  const lastDayOfTarget = new Date(Date.UTC(source.getUTCFullYear(), targetMonthIndex + 1, 0)).getUTCDate();
  return new Date(Date.UTC(
    source.getUTCFullYear(),
    targetMonthIndex,
    Math.min(source.getUTCDate(), lastDayOfTarget),
    source.getUTCHours(),
    source.getUTCMinutes(),
    source.getUTCSeconds(),
    source.getUTCMilliseconds()
  ));
};

const anchorOfYear = (year, config) => new Date(Date.UTC(year, config.annualRenewal.month - 1, config.annualRenewal.day));

/** Première date d'ancrage strictement postérieure à `date`. */
const nextAnchorAfter = (date, config = defaultConfig) => {
  const year = new Date(date).getUTCFullYear();
  const sameYear = anchorOfYear(year, config);
  return new Date(date) < sameYear ? sameYear : anchorOfYear(year + 1, config);
};

/**
 * Fin du cycle annuel ouvert par un paiement initial effectué à `cycleStart`.
 * À partir de cette date, le prochain paiement redevient un paiement initial (2 000 FCFA).
 *
 * ⚠️ Point d'ajustement de la règle « démarrage à partir du 8e mois » (voir config/billing.js).
 */
const computeCycleEnd = (cycleStart, config = defaultConfig) => {
  const { lateStartMonth, lateStartRule } = config.annualRenewal;
  const anchor = nextAnchorAfter(cycleStart, config);
  const startedLate = new Date(cycleStart).getUTCMonth() + 1 >= lateStartMonth;

  if (lateStartRule === 'B' && startedLate) {
    return anchorOfYear(anchor.getUTCFullYear() + 1, config);
  }

  return anchor;
};

/**
 * Calcule le prochain paiement attendu.
 *
 * @param {object} params
 * @param {{cycleStart?: Date, currentPeriodEnd?: Date}|null} params.subscription
 * @param {Date} params.now
 * @param {boolean} params.promoApplicable  code valide ET premier paiement du filleul
 */
const quoteNextPayment = ({ subscription, now = new Date(), promoApplicable = false, config = defaultConfig }) => {
  const current = subscription?.currentPeriodEnd ? new Date(subscription.currentPeriodEnd) : null;
  // Un paiement anticipé prolonge l'accès à partir de la fin de la période en cours.
  const periodStart = current && current > now ? current : new Date(now);
  const cycleStart = subscription?.cycleStart ? new Date(subscription.cycleStart) : null;
  const cycleEnd = cycleStart ? computeCycleEnd(cycleStart, config) : null;
  const kind = !cycleStart || periodStart >= cycleEnd ? 'initial' : 'monthly';
  const plan = config.plans[kind];

  const baseAmount = plan.amount;
  const amount = kind === 'initial' && promoApplicable
    ? Math.min(baseAmount, config.promo.discountedInitialAmount)
    : baseAmount;

  const nextCycleStart = kind === 'initial' ? periodStart : cycleStart;

  return {
    kind,
    label: plan.label,
    currency: config.currency,
    baseAmount,
    discount: baseAmount - amount,
    amount,
    periodStart,
    periodEnd: addMonthsUTC(periodStart, plan.months),
    cycleStart: nextCycleStart,
    cycleEnd: computeCycleEnd(nextCycleStart, config),
  };
};

/**
 * Statut d'abonnement dérivé des dates : jamais stocké comme vérité, donc jamais obsolète.
 * ACTIVE | EXPIRED | PENDING | NONE
 */
const resolveSubscriptionStatus = ({ subscription, now = new Date(), hasPendingPayment = false }) => {
  if (subscription?.currentPeriodEnd && new Date(subscription.currentPeriodEnd) > now) {
    return 'ACTIVE';
  }

  if (hasPendingPayment) {
    return 'PENDING';
  }

  return subscription?.currentPeriodEnd ? 'EXPIRED' : 'NONE';
};

/** Clé du jour pour les compteurs journaliers (UTC = heure d'Abidjan). */
const dayKey = (date = new Date()) => new Date(date).toISOString().slice(0, 10);

const nextDayStart = (date = new Date()) => new Date(Date.parse(`${dayKey(date)}T00:00:00.000Z`) + DAY_MS);

module.exports = {
  addMonthsUTC,
  nextAnchorAfter,
  computeCycleEnd,
  quoteNextPayment,
  resolveSubscriptionStatus,
  dayKey,
  nextDayStart,
  DAY_MS,
};
