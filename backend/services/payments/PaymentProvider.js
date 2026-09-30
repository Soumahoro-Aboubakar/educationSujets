/**
 * Contrat commun à tous les fournisseurs de paiement (agrégateurs Mobile Money, mock…).
 * PaymentService ne connaît que cette interface : changer d'agrégateur = ajouter une classe
 * dans providers/ et la déclarer dans index.js, puis modifier PAYMENT_MODE.
 *
 * Statuts normalisés renvoyés par un provider : PENDING | SUCCEEDED | FAILED | CANCELLED.
 */
class PaymentProvider {
  constructor(name) {
    this.name = name;
  }

  /**
   * Démarre la transaction chez le fournisseur.
   * @returns {Promise<{providerRef: string, status: 'PENDING', instructions: string}>}
   */
  // eslint-disable-next-line no-unused-vars
  async initiate({ payment, phone, method }) {
    throw new Error(`${this.name}.initiate() non implemente`);
  }

  /** Interroge le fournisseur (réconciliation quand un webhook n'est pas encore arrivé). */
  // eslint-disable-next-line no-unused-vars
  async getStatus(payment) {
    throw new Error(`${this.name}.getStatus() non implemente`);
  }

  /** Annule une transaction encore en attente, si le fournisseur le permet. */
  // eslint-disable-next-line no-unused-vars
  async cancel(payment) {
    return { status: 'CANCELLED' };
  }

  /**
   * Vérifie la signature d'un webhook et le traduit en statut normalisé.
   * Doit lever une erreur si la signature est invalide.
   * @returns {Promise<{providerRef: string, status: string, reason?: string}>}
   */
  // eslint-disable-next-line no-unused-vars
  async parseWebhook(req) {
    throw new Error(`${this.name}.parseWebhook() non implemente`);
  }
}

module.exports = PaymentProvider;
