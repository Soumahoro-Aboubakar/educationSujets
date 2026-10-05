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

// Site web public. En production, jamais localhost : sans FRONTEND_URL, le domaine officiel.
const PRODUCTION_WEB_URL = 'https://fatafalta.com';
const publicWebUrl = () => {
  const configured = (process.env.FRONTEND_URL || '').trim().replace(/\/$/, '');
  const isProduction = process.env.NODE_ENV === 'production';
  if (configured && !(isProduction && /\/\/(localhost|127\.0\.0\.1)(:|$)/.test(configured))) return configured;
  if (isProduction) {
    console.warn(`[billing] FRONTEND_URL ${configured ? 'pointe vers localhost' : 'non défini'} en production : ${PRODUCTION_WEB_URL} utilisé.`);
    return PRODUCTION_WEB_URL;
  }
  return 'http://localhost:3000';
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
    // Fournisseur actif. Par défaut : GeniusPay dès que ses clés sont présentes, sinon le mock.
    mode: (process.env.PAYMENT_MODE || (process.env.GENIUSPAY_API_KEY ? 'geniuspay' : 'mock')).toLowerCase(),
    /*
     * Moyens de paiement proposés à l'installation. Ce n'est qu'une valeur initiale : la liste
     * réelle vit en base (modèle PaymentMethod) et l'administrateur l'active, la désactive ou
     * la complète depuis le web ou le mobile.
     *
     * Routage GeniusPay constaté en Côte d'Ivoire : Wave a sa passerelle (page de paiement / QR
     * code) ; MTN, Orange et Moov passent par PawaPay avec un code opérateur (demande de
     * validation envoyée sur le téléphone). `payment_method: mtn_money` est réorienté vers Wave
     * par GeniusPay et ne doit pas être utilisé. Les opérateurs PawaPay réellement ouverts sont
     * relus via GET /pawapay/providers : un opérateur absent n'est pas proposé aux abonnés.
     *   flow 'redirect' : l'abonné finalise sur la page du fournisseur ;
     *   flow 'push'     : l'abonné valide la demande reçue sur son téléphone.
     *
     * Pour l'instant seul Wave est activé : les opérateurs PawaPay restent configurés et se
     * réactivent depuis l'administration (Méthodes de paiement), sans modification du code.
     */
    defaultMethods: [
      { code: 'wave', label: 'Wave', enabled: true, requiresPhone: true, sortOrder: 10, gatewayMethod: 'wave', mmoProvider: null, flow: 'redirect' },
      {
        code: 'orange_money', label: 'Orange Money', enabled: false, requiresPhone: true, sortOrder: 20, gatewayMethod: 'pawapay', mmoProvider: 'ORANGE_CIV', flow: 'push',
        confirmSteps: ['Composez #120#', 'Saisissez votre mot de passe', 'Confirmez le paiement'],
      },
      {
        code: 'mtn_money', label: 'MTN Mobile Money', enabled: false, requiresPhone: true, sortOrder: 30, gatewayMethod: 'pawapay', mmoProvider: 'MTN_MOMO_CIV', flow: 'push',
        confirmSteps: ['Composez *133#', 'Choisissez l’option 1', 'Confirmez le paiement'],
      },
      { code: 'moov_money', label: 'Moov Money', enabled: false, requiresPhone: true, sortOrder: 40, gatewayMethod: 'pawapay', mmoProvider: 'MOOV_CIV', flow: 'push' },
      { code: 'card', label: 'Carte bancaire', enabled: false, requiresPhone: false, sortOrder: 50, gatewayMethod: 'card', mmoProvider: null, flow: 'redirect' },
    ],
    // Un paiement non confirmé au-delà de ce délai est considéré comme expiré (échoué).
    // Le fournisseur est toujours interrogé avant : un paiement réellement encaissé n'expire jamais.
    pendingTtlMinutes: toInt(process.env.PAYMENT_PENDING_TTL_MINUTES, 30),
    // Le mobile peut-il proposer l'abonnement ? À désactiver si l'app est distribuée sur un
    // store qui impose son propre système de paiement.
    mobileWebCheckout: process.env.MOBILE_WEB_CHECKOUT !== 'false',
    // Page d'abonnement ouverte depuis le mobile, et adresse de retour après un paiement GeniusPay.
    webCheckoutUrl: `${publicWebUrl()}/abonnement`,
  },

  withdrawals: {
    // Opérateurs de versement des commissions (traités manuellement par l'administration),
    // indépendants des moyens de paiement activés pour les abonnements.
    operators: [
      { id: 'orange_money', label: 'Orange Money' },
      { id: 'mtn_momo', label: 'MTN Mobile Money' },
      { id: 'moov_money', label: 'Moov Money' },
      { id: 'wave', label: 'Wave' },
    ],
    minAmount: toInt(process.env.WITHDRAWAL_MIN_AMOUNT, 1000),
    // Les frais de l'opérateur Mobile Money sont à la charge du bénéficiaire.
    feesPaidBy: 'user',
  },
};

module.exports = billing;
