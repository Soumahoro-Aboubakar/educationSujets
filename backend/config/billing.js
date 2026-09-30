/**
 * Règles commerciales de Fatafalta — SOURCE UNIQUE DE VÉRITÉ.
 *
 * Aucun prix, durée ou limite ne doit être écrit ailleurs (ni dans le mobile, ni dans le web) :
 * les clients lisent ces valeurs via GET /api/billing/plans et /api/me/entitlements.
 *
 * Fuseau : Côte d'Ivoire (Africa/Abidjan = UTC+0, sans heure d'été). Toutes les dates
 * de calcul sont donc manipulées en UTC.
 */
const toInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

const billing = {
  currency: 'XOF',

  plans: {
    // Paiement « initial » : première souscription et chaque renouvellement annuel.
    initial: { amount: 2000, months: 4, label: 'Abonnement' },
    // Paiement mensuel entre la fin de la période initiale et le renouvellement annuel.
    monthly: { amount: 500, months: 1, label: 'Mensualité' },
  },

  annualRenewal: {
    // Date d'ancrage du cycle annuel (mois 1-12, jour). Par défaut : 1er janvier.
    month: 1,
    day: 1,

    /*
     * ⚠️ RÈGLE À CONFIRMER PAR LE PRODUIT — abonnements démarrés à partir du mois `lateStartMonth`.
     *
     *  'A' : le renouvellement à 2 000 FCFA a lieu à la prochaine date d'ancrage (1er janvier),
     *        comme pour tout le monde. Entre-temps : 500 FCFA/mois.
     *  'B' : la prochaine date d'ancrage est sautée ; l'abonné reste à 500 FCFA/mois jusqu'à
     *        l'ancrage de l'année suivante (cycle annuel suivant).
     *
     * La règle est appliquée dans services/billing/pricing.js → computeCycleEnd().
     */
    lateStartMonth: 8,
    lateStartRule: process.env.BILLING_LATE_START_RULE === 'B' ? 'B' : 'A',
  },

  promo: {
    codePrefix: 'FATA',
    // Prix du paiement initial lorsqu'un code promotionnel valide est appliqué.
    discountedInitialAmount: 1500,
    // Commission versée au propriétaire du code, une seule fois par filleul.
    referrerCommission: 500,
    // Le code ne s'applique qu'au tout premier paiement du filleul.
    firstPaymentOnly: true,
    // Délai avant qu'une commission devienne retirable (protection contre les litiges).
    commissionHoldDays: toInt(process.env.COMMISSION_HOLD_DAYS, 7),
  },

  downloads: {
    // 'all' : tout sujet/corrigé exige un abonnement actif. 'premium' : seuls les documents isPremmuim.
    protection: process.env.DOWNLOAD_PROTECTION === 'premium' ? 'premium' : 'all',
    dailyLimit: toInt(process.env.DOWNLOAD_DAILY_LIMIT, 15),
    // Rôles qui gèrent le contenu : pas d'abonnement ni de quota requis.
    exemptRoles: ['admin', 'sub-admin'],
  },

  payments: {
    mode: (process.env.PAYMENT_MODE || 'mock').toLowerCase(),
    methods: [
      { id: 'orange_money', label: 'Orange Money' },
      { id: 'mtn_momo', label: 'MTN Mobile Money' },
      { id: 'moov_money', label: 'Moov Money' },
      { id: 'wave', label: 'Wave' },
    ],
    // Un paiement non confirmé au-delà de ce délai est considéré comme expiré (échoué).
    pendingTtlMinutes: toInt(process.env.PAYMENT_PENDING_TTL_MINUTES, 15),
    // Le mobile peut-il renvoyer vers la souscription web ? À désactiver si l'app est
    // distribuée sur un store qui impose son propre système de paiement.
    mobileWebCheckout: process.env.MOBILE_WEB_CHECKOUT !== 'false',
    webCheckoutUrl: `${(process.env.PUBLIC_WEB_URL || 'http://localhost:3000').replace(/\/$/, '')}/abonnement`,
  },

  withdrawals: {
    minAmount: toInt(process.env.WITHDRAWAL_MIN_AMOUNT, 1000),
    // Les frais de l'opérateur Mobile Money sont à la charge du bénéficiaire.
    feesPaidBy: 'user',
  },
};

module.exports = billing;
