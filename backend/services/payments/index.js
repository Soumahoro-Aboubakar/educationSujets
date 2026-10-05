const billingConfig = require('../../config/billing');
const MockProvider = require('./providers/MockProvider');
const GeniusPayProvider = require('./providers/GeniusPayProvider');

/**
 * Registre des fournisseurs. Pour brancher un autre agrégateur :
 *  1. créer providers/<Nom>Provider.js qui étend PaymentProvider ;
 *  2. l'ajouter ci-dessous ;
 *  3. définir PAYMENT_MODE=<clé> et ses variables d'environnement.
 */
const registry = {
  mock: () => new MockProvider(),
  geniuspay: () => new GeniusPayProvider(),
};

const instances = new Map();

const build = (name) => {
  if (!instances.has(name)) instances.set(name, registry[name]());
  return instances.get(name);
};

const getPaymentProvider = () => {
  const { mode } = billingConfig.payments;
  if (!registry[mode]) {
    throw new Error(`PAYMENT_MODE inconnu : ${mode}`);
  }

  if (mode === 'mock' && process.env.NODE_ENV === 'production' && process.env.ALLOW_MOCK_PAYMENTS !== 'true') {
    throw new Error('PAYMENT_MODE=mock interdit en production (definir ALLOW_MOCK_PAYMENTS=true pour une recette).');
  }

  return build(mode);
};

const getProviderByName = (name) => (registry[name] ? build(name) : null);

module.exports = { getPaymentProvider, getProviderByName };
