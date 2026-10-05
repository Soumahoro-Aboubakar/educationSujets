/**
 * Outil d'exploitation GeniusPay (lit les variables GENIUSPAY_* du fichier .env).
 *
 *   npm run geniuspay -- check                      Vérifie les clés et l'environnement (GET /account)
 *   npm run geniuspay -- webhooks                   Liste les webhooks configurés
 *   npm run geniuspay -- create-webhook <url>       Crée le webhook ; affiche son secret UNE seule fois
 *
 * L'URL du webhook est https://<api>/api/payments/webhooks/geniuspay.
 * Les clés API ne sont jamais affichées.
 */
require('dotenv').config();
require('../config/network').applyNetworkDefaults();
const GeniusPayProvider = require('../services/payments/providers/GeniusPayProvider');
const { readConfig } = require('../config/geniuspay');

const EVENTS = ['payment.success', 'payment.failed', 'payment.cancelled', 'payment.expired'];

const run = async () => {
  const [command, arg] = process.argv.slice(2);
  // Le webhook n'existe pas encore lors de sa création : son secret n'est pas exigé ici.
  const config = readConfig();
  const provider = new GeniusPayProvider({ ...config, webhookSecret: config.webhookSecret || 'cli-unused' });

  if (command === 'check') {
    const account = await provider.request('GET', '/account');
    console.log(`Compte : ${account.business_name || account.name} (statut ${account.status})`);
    console.log(`Environnement GeniusPay : ${account.environment} — attendu : ${provider.environment}`);
    if (account.environment !== provider.environment) {
      console.error('⚠️  Les clés ne correspondent pas à GENIUSPAY_ENV.');
      process.exitCode = 1;
    }
    return;
  }

  if (command === 'webhooks') {
    const hooks = await provider.request('GET', '/webhooks');
    for (const hook of [].concat(hooks || [])) {
      console.log(`#${hook.id} ${hook.url} [${(hook.events || []).join(', ')}]`);
    }
    return;
  }

  if (command === 'create-webhook') {
    if (!/^https:\/\//.test(arg || '')) throw new Error('URL https du webhook requise.');
    const hook = await provider.request('POST', '/webhooks', { name: 'Fatafalta', url: arg, events: EVENTS });
    console.log(`Webhook #${hook.id} créé pour ${hook.url}.`);
    console.log('Copiez ce secret dans GENIUSPAY_WEBHOOK_SECRET (il ne sera plus affiché) :');
    console.log(hook.secret || hook.webhook_secret || '(secret absent de la réponse : consultez le tableau de bord GeniusPay)');
    return;
  }

  console.log('Commandes : check | webhooks | create-webhook <url>');
};

run().catch((error) => {
  console.error(`Erreur : ${error.message}${error.code ? ` (${error.code})` : ''}`);
  process.exitCode = 1;
});
