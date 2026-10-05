const Payment = require('../../models/Payment');
const log = require('./paymentLogger');
const { refreshPayment } = require('./paymentService');

/*
 * Réconciliation serveur des paiements ouverts : interroge le fournisseur à intervalle régulier.
 * Garantit l'activation de l'abonnement même si le webhook n'arrive pas (secret absent, serveur
 * injoignable depuis GeniusPay) et que l'abonné a fermé la page avant la confirmation.
 * Sans risque de double traitement : refreshPayment repose sur des transitions atomiques.
 */
const BATCH_SIZE = 50;
// Laisse au webhook et au polling client le temps d'agir avant d'interroger nous-mêmes.
const MIN_AGE_MS = 30 * 1000;

const reconcileOpenPayments = async () => {
  const payments = await Payment.find({
    status: { $in: Payment.OPEN_STATUSES },
    createdAt: { $lt: new Date(Date.now() - MIN_AGE_MS) },
  }).sort({ updatedAt: 1 }).limit(BATCH_SIZE);

  let closed = 0;
  for (const payment of payments) {
    try {
      const refreshed = await refreshPayment(payment);
      if (!Payment.OPEN_STATUSES.includes(refreshed.status)) closed += 1;
      else await Payment.updateOne({ _id: payment._id }, { $currentDate: { updatedAt: true } });
    } catch (error) {
      log.error('reconcile.payment_failed', { paymentId: payment._id, reference: payment.providerRef, reason: error.message });
    }
  }

  if (payments.length) log.info('reconcile.run', { status: `${closed}/${payments.length} clos` });
  return { checked: payments.length, closed };
};

const startPaymentReconciler = () => {
  const seconds = Number.parseInt(process.env.PAYMENT_RECONCILE_INTERVAL_SECONDS || '60', 10);
  if (!Number.isFinite(seconds) || seconds <= 0) return null;

  let running = false;
  const timer = setInterval(async () => {
    if (running) return;
    running = true;
    try {
      await reconcileOpenPayments();
    } catch (error) {
      log.error('reconcile.run_failed', { reason: error.message });
    } finally {
      running = false;
    }
  }, seconds * 1000);
  timer.unref();
  return timer;
};

module.exports = { reconcileOpenPayments, startPaymentReconciler };
