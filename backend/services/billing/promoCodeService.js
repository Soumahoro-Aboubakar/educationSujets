const crypto = require('crypto');
const PromoCode = require('../../models/PromoCode');
const User = require('../../models/User');
const Commission = require('../../models/Commission');
const billingConfig = require('../../config/billing');
const AppError = require('../../utils/errors');
const { isSubscriptionActive } = require('./subscriptionService');

// Alphabet sans caractères ambigus (0/O, 1/I/L).
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

const generateCode = () => {
  const bytes = crypto.randomBytes(6);
  const suffix = Array.from(bytes, (byte) => ALPHABET[byte % ALPHABET.length]).join('');
  return `${billingConfig.promo.codePrefix}-${suffix}`;
};

const normalizeCode = (value) => String(value || '').trim().toUpperCase();

/** Crée le code de l'utilisateur s'il n'existe pas (inscription ou comptes historiques). */
const ensurePromoCode = async (userId) => {
  const existing = await PromoCode.findOne({ owner: userId });
  if (existing) return existing;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      return await PromoCode.create({
        owner: userId,
        code: generateCode(),
        history: [{ action: 'CREATED' }],
      });
    } catch (error) {
      if (error.code !== 11000) throw error;
      // Collision sur `owner` : un appel concurrent l'a créé.
      const created = await PromoCode.findOne({ owner: userId });
      if (created) return created;
    }
  }

  throw new AppError('Impossible de generer un code promotionnel', 500);
};

/**
 * État du code, par ordre de priorité :
 *  1. partenaire (comptes créés par l'administration) → toujours ACTIVE, sans condition d'abonnement ;
 *  2. forçage administratif explicite ;
 *  3. sinon, actif si et seulement si le propriétaire a un abonnement actif.
 */
const resolvePromoStatus = async (promoCode) => {
  const owner = await User.findById(promoCode.owner).select('role').lean();
  if (owner?.role === 'partner') return 'ACTIVE';
  if (promoCode.adminOverride) return promoCode.adminOverride;
  return (await isSubscriptionActive(promoCode.owner)) ? 'ACTIVE' : 'INACTIVE';
};

/**
 * Vérifie qu'un code saisi par un client peut être appliqué à son paiement.
 * Retourne le code ou lève une erreur explicite (affichée telle quelle par le client).
 */
const assertApplicablePromoCode = async (rawCode, buyerId) => {
  const code = normalizeCode(rawCode);
  const promoCode = await PromoCode.findOne({ code });

  if (!promoCode) {
    throw new AppError('Ce code promotionnel n’existe pas.', 400, undefined, 'PROMO_INVALID');
  }

  if (promoCode.owner.toString() === buyerId.toString()) {
    throw new AppError('Vous ne pouvez pas utiliser votre propre code.', 400, undefined, 'PROMO_SELF');
  }

  if ((await resolvePromoStatus(promoCode)) !== 'ACTIVE') {
    throw new AppError('Ce code promotionnel n’est pas actif actuellement.', 400, undefined, 'PROMO_INACTIVE');
  }

  return promoCode;
};

const describeMyPromoCode = async (userId) => {
  const promoCode = await ensurePromoCode(userId);
  const [status, commissions, owner] = await Promise.all([
    resolvePromoStatus(promoCode),
    Commission.find({ referrer: userId })
      .sort({ createdAt: -1 })
      .limit(100)
      .populate('referredUser', 'name')
      .lean(),
    User.findById(userId).select('role').lean(),
  ]);

  const now = new Date();

  return {
    code: promoCode.code,
    status,
    adminOverride: promoCode.adminOverride,
    // Partenaire : code actif en permanence, indépendamment de l'abonnement.
    alwaysActive: owner?.role === 'partner',
    stats: {
      referrals: commissions.length,
      earned: commissions.filter((c) => c.status === 'CONFIRMED').reduce((sum, c) => sum + c.amount, 0),
    },
    // Données minimales sur les filleuls : prénom abrégé, jamais l'email ni le téléphone.
    referrals: commissions.map((commission) => ({
      id: commission._id,
      name: maskName(commission.referredUser?.name),
      date: commission.createdAt,
      amount: commission.amount,
      status: commission.status === 'REVERSED'
        ? 'REVERSED'
        : new Date(commission.availableAt) <= now ? 'AVAILABLE' : 'PENDING',
    })),
    terms: {
      discountedPrice: billingConfig.promo.discountedInitialAmount,
      commission: billingConfig.promo.referrerCommission,
    },
  };
};

const maskName = (name = '') => {
  const [first = '', last = ''] = String(name).trim().split(/\s+/);
  return last ? `${first} ${last.charAt(0)}.` : first || 'Utilisateur';
};

/** Action administrative : force l'état du code (y compris pour un compte désactivé). */
const setAdminOverride = async (userId, override, adminId, note) => {
  const promoCode = await ensurePromoCode(userId);
  promoCode.adminOverride = override || null;
  promoCode.history.push({
    action: override ? `ADMIN_FORCE_${override}` : 'ADMIN_RESET_AUTOMATIC',
    by: adminId,
    isAdminAction: true,
    note,
  });
  await promoCode.save();
  return promoCode;
};

module.exports = {
  generateCode,
  normalizeCode,
  ensurePromoCode,
  resolvePromoStatus,
  assertApplicablePromoCode,
  describeMyPromoCode,
  setAdminOverride,
};
