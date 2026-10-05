/**
 * Faux serveur GeniusPay pour les tests : reproduit les formats de la documentation officielle
 * (POST /payments, GET /payments/{reference}, erreurs { success:false, error:{ code } }) et
 * signe des webhooks comme GeniusPay : HMAC-SHA256(timestamp + "." + corps, secret).
 */
const http = require('http');
const crypto = require('crypto');

const KEYS = {
  sandbox: { apiKey: 'pk_sandbox_test', apiSecret: 'sk_sandbox_test', environment: 'sandbox' },
  production: { apiKey: 'pk_live_test', apiSecret: 'sk_live_test', environment: 'live' },
};
const WEBHOOK_SECRET = 'whsec_test_secret';

const startFakeGeniusPay = async ({ env = 'sandbox' } = {}) => {
  const keys = KEYS[env];
  const transactions = new Map();
  const requests = [];
  let counter = 0;
  let failNext = null;
  let failCount = 0;
  // Opérateurs PawaPay ouverts en Côte d'Ivoire (comme constaté en production : pas de Moov).
  let openOperators = ['MTN_MOMO_CIV', 'ORANGE_CIV'];

  const server = http.createServer((req, res) => {
    let raw = '';
    req.on('data', (chunk) => { raw += chunk; });
    req.on('end', () => {
      const send = (status, body) => {
        res.writeHead(status, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(body));
      };
      const body = raw ? JSON.parse(raw) : null;
      requests.push({ method: req.method, url: req.url, headers: req.headers, body });

      if (req.headers['x-api-key'] !== keys.apiKey || req.headers['x-api-secret'] !== keys.apiSecret) {
        return send(401, { success: false, error: { code: 'INVALID_API_KEY', message: 'Invalid API key' } });
      }
      if (failNext) {
        const failure = failNext;
        failCount -= 1;
        if (failCount <= 0) failNext = null;
        if (failure === 'network') return req.socket.destroy();
        return send(failure.status, { success: false, error: { code: failure.code, message: 'raw provider detail' } });
      }

      if (req.method === 'POST' && req.url === '/payments') {
        if (!body?.amount || body.amount < 200) {
          return send(422, { success: false, error: { code: 'VALIDATION_ERROR', message: 'amount' } });
        }
        counter += 1;
        const reference = `MTX-TEST${String(counter).padStart(6, '0')}`;
        const transaction = {
          id: counter,
          reference,
          amount: body.amount,
          currency: body.currency || 'XOF',
          fees: Math.round(body.amount * 0.03),
          status: 'pending',
          payment_method: body.payment_method || null,
          environment: keys.environment,
          metadata: body.metadata || {},
          created_at: new Date().toISOString(),
          completed_at: null,
        };
        transactions.set(reference, transaction);
        return send(201, {
          success: true,
          // PawaPay envoie une demande sur le téléphone : pas de page de paiement.
          data: { ...transaction, ...(body.payment_method === 'pawapay' ? {} : { payment_url: `https://pay.example/${reference}` }), gateway: body.payment_method },
        });
      }

      if (req.method === 'GET' && req.url.startsWith('/pawapay/providers')) {
        return send(200, {
          success: true,
          data: { country: 'CI', currency: 'XOF', providers: openOperators.map((code) => ({ code, name: code, type: 'MMO' })) },
        });
      }

      const match = req.method === 'GET' && req.url.match(/^\/payments\/([^/?]+)$/);
      if (match) {
        const transaction = transactions.get(decodeURIComponent(match[1]));
        if (!transaction) return send(404, { success: false, error: { code: 'TRANSACTION_NOT_FOUND', message: 'Transaction not found' } });
        return send(200, { success: true, data: transaction });
      }

      return send(404, { success: false, error: { code: 'NOT_FOUND' } });
    });
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();

  return {
    baseUrl: `http://127.0.0.1:${port}`,
    keys,
    webhookSecret: WEBHOOK_SECRET,
    requests,
    transactions,
    /** Change le statut côté GeniusPay (ce que verrait GET /payments/{reference}). */
    setStatus(reference, status, patch = {}) {
      Object.assign(transactions.get(reference), { status, ...patch });
    },
    setOpenOperators(codes) {
      openOperators = codes;
    },
    /** Fait échouer les `times` prochaines requêtes (erreur HTTP ou coupure réseau). */
    failNextRequest(failure, times = 1) {
      failNext = failure;
      failCount = times;
    },
    /** Construit un webhook signé comme GeniusPay. */
    webhook(reference, event, { id = crypto.randomUUID(), timestamp = Math.floor(Date.now() / 1000), secret = WEBHOOK_SECRET, environment = keys.environment, data = {} } = {}) {
      const transaction = transactions.get(reference) || {};
      const payload = {
        id,
        event,
        timestamp,
        data: { object: 'transaction', ...transaction, ...data, reference },
        environment,
        api_version: '2024-01-01',
      };
      const raw = JSON.stringify(payload);
      const signature = crypto.createHmac('sha256', secret).update(`${timestamp}.${raw}`).digest('hex');
      return {
        raw,
        payload,
        headers: {
          'content-type': 'application/json',
          'x-webhook-signature': signature,
          'x-webhook-timestamp': String(timestamp),
          'x-webhook-event': event,
          'x-webhook-environment': environment,
        },
      };
    },
    close: () => new Promise((resolve) => server.close(resolve)),
  };
};

/** Requête Express minimale (req.get, body, rawBody) à partir d'un webhook signé. */
const toExpressRequest = ({ raw, headers }) => ({
  body: JSON.parse(raw),
  rawBody: Buffer.from(raw),
  get: (name) => headers[name.toLowerCase()],
});

module.exports = { startFakeGeniusPay, toExpressRequest, KEYS, WEBHOOK_SECRET };
