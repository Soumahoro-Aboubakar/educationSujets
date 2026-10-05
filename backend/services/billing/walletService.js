const mongoose = require('mongoose');
const Commission = require('../../models/Commission');
const Withdrawal = require('../../models/Withdrawal');
const billingConfig = require('../../config/billing');
const AppError = require('../../utils/errors');
const { normalizePhone } = require('../payments/paymentService');

/**
 * Le solde n'est jamais stocké : il est recalculé à partir des commissions et des retraits.
 * Aucun client ne peut donc le modifier.
 */
const computeBalances = async (userId, now = new Date()) => {
  const referrer = new mongoose.Types.ObjectId(userId);

  const [commissionTotals] = await Commission.aggregate([
    { $match: { referrer, status: 'CONFIRMED' } },
    {
      $group: {
        _id: null,
        earned: { $sum: '$amount' },
        matured: { $sum: { $cond: [{ $lte: ['$availableAt', now] }, '$amount', 0] } },
        referrals: { $sum: 1 },
      },
    },
  ]);

  const withdrawalTotals = await Withdrawal.aggregate([
    { $match: { user: referrer, status: { $in: ['PENDING', 'PROCESSED'] } } },
    { $group: { _id: '$status', total: { $sum: '$amount' } } },
  ]);

  const byStatus = Object.fromEntries(withdrawalTotals.map((row) => [row._id, row.total]));
  const earned = commissionTotals?.earned || 0;
  const matured = commissionTotals?.matured || 0;
  const withdrawn = byStatus.PROCESSED || 0;
  const pendingWithdrawal = byStatus.PENDING || 0;

  return {
    currency: billingConfig.currency,
    available: Math.max(0, matured - withdrawn - pendingWithdrawal),
    earned,
    // Commissions encore dans le délai de sécurité.
    onHold: earned - matured,
    withdrawn,
    pendingWithdrawal,
    referrals: commissionTotals?.referrals || 0,
  };
};

const toPublicWithdrawal = (withdrawal) => ({
  id: withdrawal._id,
  amount: withdrawal.amount,
  currency: withdrawal.currency,
  operator: withdrawal.operator,
  operatorLabel: billingConfig.withdrawals.operators.find((m) => m.id === withdrawal.operator)?.label || withdrawal.operator,
  // Numéro masqué : seuls les 2 derniers chiffres restent visibles.
  phone: `•••• ${String(withdrawal.phone).slice(-2)}`,
  status: withdrawal.status,
  failureReason: withdrawal.failureReason || null,
  createdAt: withdrawal.createdAt,
  processedAt: withdrawal.processedAt || null,
});

const describeWallet = async (userId) => {
  const [balances, commissions, withdrawals] = await Promise.all([
    computeBalances(userId),
    Commission.find({ referrer: userId }).sort({ createdAt: -1 }).limit(50).lean(),
    Withdrawal.find({ user: userId }).sort({ createdAt: -1 }).limit(50).lean(),
  ]);

  const now = new Date();
  const history = [
    ...commissions.map((c) => ({
      id: c._id,
      type: 'COMMISSION',
      amount: c.amount,
      date: c.createdAt,
      status: c.status === 'REVERSED' ? 'REVERSED' : new Date(c.availableAt) <= now ? 'AVAILABLE' : 'PENDING',
      availableAt: c.availableAt,
    })),
    ...withdrawals.map((w) => ({ ...toPublicWithdrawal(w), type: 'WITHDRAWAL', date: w.createdAt })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  return {
    balances,
    history,
    withdrawalRules: {
      minAmount: billingConfig.withdrawals.minAmount,
      feesPaidBy: billingConfig.withdrawals.feesPaidBy,
      operators: billingConfig.withdrawals.operators,
    },
  };
};

const requestWithdrawal = async (user, { amount, operator, phone: rawPhone, firstName, lastName }) => {
  const value = Number(amount);
  if (!Number.isInteger(value) || value <= 0) {
    throw new AppError('Montant invalide.', 400, undefined, 'AMOUNT_INVALID');
  }

  if (value < billingConfig.withdrawals.minAmount) {
    throw new AppError(`Le retrait minimum est de ${billingConfig.withdrawals.minAmount} FCFA.`, 400, undefined, 'AMOUNT_TOO_LOW');
  }

  if (!billingConfig.withdrawals.operators.some((m) => m.id === operator)) {
    throw new AppError('Opérateur non pris en charge.', 400, undefined, 'OPERATOR_INVALID');
  }

  const phone = normalizePhone(rawPhone);
  if (!phone) {
    throw new AppError('Numéro Mobile Money invalide (10 chiffres attendus).', 400, undefined, 'PHONE_INVALID');
  }

  if (!String(firstName || '').trim() || !String(lastName || '').trim()) {
    throw new AppError('Nom et prénom du bénéficiaire obligatoires.', 400, undefined, 'IDENTITY_REQUIRED');
  }

  const { available } = await computeBalances(user._id);
  if (value > available) {
    throw new AppError('Solde disponible insuffisant.', 400, undefined, 'INSUFFICIENT_BALANCE');
  }

  try {
    // `openFor` unique : un second retrait concurrent échoue ici, après le contrôle de solde.
    const withdrawal = await Withdrawal.create({
      user: user._id,
      amount: value,
      operator,
      phone,
      firstName: String(firstName).trim(),
      lastName: String(lastName).trim(),
      openFor: user._id,
    });
    return toPublicWithdrawal(withdrawal);
  } catch (error) {
    if (error.code === 11000) {
      throw new AppError('Un retrait est déjà en attente de traitement.', 409, undefined, 'WITHDRAWAL_IN_PROGRESS');
    }
    throw error;
  }
};

const cancelMyWithdrawal = async (user, withdrawalId) => {
  const withdrawal = await Withdrawal.findOneAndUpdate(
    { _id: withdrawalId, user: user._id, status: 'PENDING' },
    { $set: { status: 'CANCELLED' }, $unset: { openFor: 1 } },
    { new: true }
  );

  if (!withdrawal) {
    throw new AppError('Ce retrait ne peut plus être annulé.', 409, undefined, 'WITHDRAWAL_NOT_CANCELLABLE');
  }

  return toPublicWithdrawal(withdrawal);
};

module.exports = {
  computeBalances,
  describeWallet,
  requestWithdrawal,
  cancelMyWithdrawal,
  toPublicWithdrawal,
};
