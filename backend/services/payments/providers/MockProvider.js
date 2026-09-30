const crypto = require('crypto');
const PaymentProvider = require('../PaymentProvider');

/**
 * Fournisseur simulé (PAYMENT_MODE=mock). Il reproduit le cycle réel d'un paiement
 * Mobile Money : la transaction reste « en attente » le temps que l'utilisateur valide sur
 * son téléphone, puis aboutit selon le scénario déduit des 2 derniers chiffres du numéro :
 *
 *   …00 → échec (solde insuffisant)
 *   …11 → annulé par l'utilisateur
 *   …22 → jamais confirmé (expire après PAYMENT_PENDING_TTL_MINUTES)
 *   autre → réussi
 *
 * Le scénario est encodé dans la référence : aucun état en mémoire, résiste aux redémarrages.
 */
const SCENARIOS = { '00': 'FAILED', 11: 'CANCELLED', 22: 'NEVER' };
const FAILURE_REASONS = {
  FAILED: 'Solde insuffisant (simulation)',
  CANCELLED: 'Paiement refusé sur le téléphone (simulation)',
};

const delayMs = () => {
  const seconds = Number.parseInt(process.env.MOCK_PAYMENT_DELAY_SECONDS, 10);
  return (Number.isFinite(seconds) && seconds >= 0 ? seconds : 6) * 1000;
};

class MockProvider extends PaymentProvider {
  constructor() {
    super('mock');
  }

  async initiate({ phone, method }) {
    const scenario = SCENARIOS[phone.slice(-2)] || 'SUCCEEDED';
    return {
      providerRef: `MOCK-${scenario}-${crypto.randomUUID()}`,
      status: 'PENDING',
      instructions: `Une demande de paiement ${method.label} a été envoyée au ${phone}. Validez-la sur votre téléphone.`,
    };
  }

  async getStatus(payment) {
    const scenario = payment.providerRef?.split('-')[1];
    const startedAt = new Date(payment.createdAt).getTime();

    if (scenario === 'NEVER' || Date.now() - startedAt < delayMs()) {
      return { status: 'PENDING' };
    }

    return { status: scenario, reason: FAILURE_REASONS[scenario] };
  }

  async parseWebhook(req) {
    // Le mock n'émet pas de webhook ; on accepte néanmoins un appel manuel en développement.
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Webhook mock desactive en production');
    }
    return { providerRef: req.body.providerRef, status: req.body.status, reason: req.body.reason };
  }
}

module.exports = MockProvider;
