const billingConfig = require('../../config/billing');
const MockProvider = require('./providers/MockProvider');

/**
 * Registre des fournisseurs. Pour brancher un agrégateur réel (CinetPay, PayDunya, Hub2…) :
 *  1. créer providers/<Nom>Provider.js qui étend PaymentProvider ;
 *  2. l'ajouter ci-dessous ;
 *  3. définir PAYMENT_MODE=<clé> et ses variables d'environnement.
 */
const registry = {
  mock: () => new MockProvider(),
};

let instance = null;

const getPaymentProvider = () => {
  if (instance) return instance;

  const factory = registry[billingConfig.payments.mode];
  if (!factory) {
    throw new Error(`PAYMENT_MODE inconnu : ${billingConfig.payments.mode}`);
  }

  if (billingConfig.payments.mode === 'mock' && process.env.NODE_ENV === 'production' && process.env.ALLOW_MOCK_PAYMENTS !== 'true') {
    throw new Error('PAYMENT_MODE=mock interdit en production (definir ALLOW_MOCK_PAYMENTS=true pour une recette).');
  }

  instance = factory();
  return instance;
};

const getProviderByName = (name) => (registry[name] ? registry[name]() : null);

module.exports = { getPaymentProvider, getProviderByName };
