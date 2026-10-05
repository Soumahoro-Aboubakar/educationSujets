const crypto = require('crypto');
const PaymentProvider = require('../PaymentProvider');
const { readConfig, assertValidConfig, configWarnings } = require('../../../config/geniuspay');
const log = require('../paymentLogger');

/**
 * Intégration GeniusPay (https://geniuspay.ci/docs/api), en mode « direct » : le moyen choisi
 * par l'abonné parmi ceux activés par l'administrateur est imposé à GeniusPay
 * (`payment_method`, et `mmo_provider` pour les opérateurs routés par PawaPay).
 *
 * Endpoints utilisés (et seulement eux) :
 *   POST /payments              → crée la transaction, renvoie `reference` (+ `payment_url`)
 *   GET  /payments/{reference}  → statut faisant autorité (réconciliation et contrôle des webhooks)
 *   GET  /pawapay/providers     → opérateurs Mobile Money réellement ouverts dans le pays
 * Webhooks : signature HMAC-SHA256(timestamp + "." + corps, whsec_…), fenêtre anti-rejeu de 5 min.
 */

// Statuts GeniusPay → statuts internes. `refunded` n'est pas traité automatiquement.
const STATUS_MAP = {
  pending: 'PENDING',
  initiated: 'PENDING',
  processing: 'PROCESSING',
  completed: 'SUCCEEDED',
  success: 'SUCCEEDED',
  succeeded: 'SUCCEEDED',
  failed: 'FAILED',
  cancelled: 'CANCELLED',
  canceled: 'CANCELLED',
  expired: 'EXPIRED',
};

const EVENT_MAP = {
  'payment.initiated': 'PENDING',
  'payment.success': 'SUCCEEDED',
  'payment.failed': 'FAILED',
  'payment.cancelled': 'CANCELLED',
  'payment.expired': 'EXPIRED',
};

// Raisons présentées à l'abonné : jamais le message brut du fournisseur.
const REASONS = {
  FAILED: 'Le paiement a été refusé par l’opérateur.',
  CANCELLED: 'Le paiement a été annulé.',
  EXPIRED: 'Le délai de paiement est dépassé.',
};

class GeniusPayError extends Error {
  constructor(message, { httpStatus, code, retriable } = {}) {
    super(message);
    this.name = 'GeniusPayError';
    this.httpStatus = httpStatus;
    this.code = code;
    this.retriable = Boolean(retriable);
  }
}

class WebhookRejectedError extends Error {
  constructor(message, statusCode = 401) {
    super(message);
    this.name = 'WebhookRejectedError';
    this.statusCode = statusCode;
  }
}

/** Format international attendu par GeniusPay pour un numéro ivoirien à 10 chiffres. */
const toInternationalPhone = (phone) => (phone ? `+225${phone}` : undefined);

/**
 * Reproduit json_encode() de PHP (barres obliques et non-ASCII échappés). Sert uniquement de
 * seconde forme candidate si le corps reçu a été reformaté en chemin ; le secret reste requis.
 */
const phpJsonEncode = (value) => JSON.stringify(value)
  .replace(/\//g, '\\/')
  .replace(/[\u007f-￿]/g, (char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`);

const safeEqualHex = (expected, received) => {
  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(String(received || ''), 'hex');
  return a.length > 0 && a.length === b.length && crypto.timingSafeEqual(a, b);
};

// Échecs survenus avant l'envoi de la requête (aucune transaction n'a pu être créée).
const CONNECT_ERRORS = new Set(['ECONNREFUSED', 'ENETUNREACH', 'EHOSTUNREACH', 'ENOTFOUND', 'EAI_AGAIN', 'UND_ERR_CONNECT_TIMEOUT', 'ETIMEDOUT']);

const mapStatus = (raw) => STATUS_MAP[String(raw || '').toLowerCase()] || null;

class GeniusPayProvider extends PaymentProvider {
  constructor(config = readConfig()) {
    super('geniuspay');
    assertValidConfig(config);
    this.config = config;
    for (const warning of configWarnings(config)) {
      log.warn('provider.config_warning', { environment: config.apiEnvironment, reason: warning });
    }
  }

  get environment() {
    return this.config.apiEnvironment;
  }

  async request(method, path, body, attempt = 1) {
    const startedAt = Date.now();
    let response;
    try {
      response = await fetch(`${this.config.baseUrl}${path}`, {
        method,
        headers: {
          'X-API-Key': this.config.apiKey,
          'X-API-Secret': this.config.apiSecret,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(this.config.timeoutMs),
      });
    } catch (error) {
      const code = error.cause?.code || error.name;
      // Une seule nouvelle tentative, et seulement sans risque de doublon : une lecture, ou une
      // création dont la connexion n'a jamais abouti (la requête n'a pas pu atteindre GeniusPay).
      const retry = attempt === 1 && (method === 'GET' || CONNECT_ERRORS.has(code));
      log[retry ? 'warn' : 'error']('geniuspay.network_error', { reason: code, durationMs: Date.now() - startedAt, status: retry ? 'retrying' : 'failed' });
      if (retry) return this.request(method, path, body, attempt + 1);
      throw new GeniusPayError('GeniusPay injoignable', { retriable: true });
    }

    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.success) {
      const code = payload?.error?.code || payload?.error_code || null;
      log.error('geniuspay.api_error', { httpStatus: response.status, errorCode: code, durationMs: Date.now() - startedAt });
      throw new GeniusPayError('Réponse GeniusPay en erreur', {
        httpStatus: response.status,
        code,
        retriable: response.status >= 500 || response.status === 429,
      });
    }

    return payload.data;
  }

  /** Traduit une transaction GeniusPay (réponse API ou objet de webhook) en vue normalisée. */
  normalize(data) {
    const status = mapStatus(data?.status);
    return {
      providerRef: data?.reference,
      providerStatus: data?.status ? String(data.status).toLowerCase() : null,
      status,
      reason: REASONS[status],
      amount: data?.amount !== undefined ? Number(data.amount) : undefined,
      currency: data?.currency,
      environment: data?.environment,
      metadata: data?.metadata || {},
    };
  }

  async initiate({ payment, phone, method, user, description, successUrl, errorUrl }) {
    const data = await this.request('POST', '/payments', {
      amount: payment.amount,
      currency: payment.currency,
      payment_method: method.gatewayMethod || method.code,
      ...(method.mmoProvider ? { mmo_provider: method.mmoProvider } : {}),
      description,
      customer: {
        name: user?.name,
        email: user?.email,
        phone: toInternationalPhone(phone),
        country: 'CI',
      },
      success_url: successUrl,
      error_url: errorUrl,
      // Renvoyées telles quelles dans les réponses et les webhooks : relient la transaction à la nôtre.
      metadata: {
        payment_id: String(payment._id),
        user_id: String(payment.user),
        kind: payment.kind,
      },
    });

    // Parcours « push » (PawaPay) : la demande part sur le téléphone, une page n'est pas requise.
    const redirectUrl = data.payment_url || data.checkout_url || null;
    if (!data.reference || (method.flow !== 'push' && !redirectUrl)) {
      log.error('geniuspay.invalid_init_response', { paymentId: payment._id, method: method.code });
      throw new GeniusPayError('Réponse GeniusPay incomplète');
    }

    log.info('geniuspay.initiated', { paymentId: payment._id, reference: data.reference, method: data.payment_method || method.code, providerStatus: data.status });
    return {
      ...this.normalize({ environment: data.environment, ...data }),
      // Une transaction tout juste créée reste ouverte, quel que soit le libellé renvoyé.
      status: mapStatus(data.status) === 'PROCESSING' ? 'PROCESSING' : 'PENDING',
      redirectUrl,
    };
  }

  /**
   * Codes opérateurs PawaPay ouverts dans le pays (ex. MTN_MOMO_CIV), ou null si inconnu.
   * Mis en cache 10 minutes : la liste change rarement.
   */
  async listMobileMoneyProviders(country = 'CI') {
    const cached = this.mmoCache?.[country];
    if (cached && cached.expiresAt > Date.now()) return cached.codes;
    try {
      const data = await this.request('GET', `/pawapay/providers?country=${encodeURIComponent(country)}`);
      const codes = (data?.providers || []).map((provider) => String(provider.code).toUpperCase());
      this.mmoCache = { ...this.mmoCache, [country]: { codes, expiresAt: Date.now() + 10 * 60 * 1000 } };
      return codes;
    } catch (error) {
      log.warn('geniuspay.mmo_discovery_failed', { reason: error.message });
      return cached?.codes || null;
    }
  }

  async getStatus(payment) {
    return this.normalize(await this.request('GET', `/payments/${encodeURIComponent(payment.providerRef)}`));
  }

  // GeniusPay ne documente pas d'annulation côté marchand : la transaction expirera d'elle-même.
  async cancel() {
    return { status: 'CANCELLED' };
  }

  verifySignature(req) {
    if (!this.config.webhookSecret) {
      throw new WebhookRejectedError('Secret webhook non configuré', 503);
    }

    const signature = String(req.get('x-webhook-signature') || '').replace(/^sha256=/i, '');
    const timestamp = req.get('x-webhook-timestamp');
    if (!signature || !/^\d+$/.test(String(timestamp || ''))) {
      throw new WebhookRejectedError('En-têtes de signature manquants');
    }

    if (Math.abs(Date.now() / 1000 - Number(timestamp)) > this.config.webhookToleranceSeconds) {
      throw new WebhookRejectedError('Horodatage hors délai', 400);
    }

    const candidates = [];
    if (req.rawBody) candidates.push(req.rawBody.toString('utf8'));
    if (req.body && typeof req.body === 'object') candidates.push(phpJsonEncode(req.body));

    const valid = candidates.some((body) => {
      const expected = crypto.createHmac('sha256', this.config.webhookSecret).update(`${timestamp}.${body}`).digest('hex');
      return safeEqualHex(expected, signature);
    });
    if (!valid) {
      throw new WebhookRejectedError('Signature invalide');
    }
  }

  async parseWebhook(req) {
    this.verifySignature(req);

    const body = req.body || {};
    const environment = body.environment || req.get('x-webhook-environment');
    if (environment !== this.environment) {
      throw new WebhookRejectedError(`Environnement inattendu (${environment})`, 400);
    }

    const event = body.event || req.get('x-webhook-event');
    const transaction = this.normalize({ ...(body.data || {}), environment });
    return {
      ...transaction,
      eventId: String(body.id || req.get('x-webhook-delivery') || `${event}:${transaction.providerRef}`),
      event,
      status: EVENT_MAP[event] || transaction.status,
    };
  }
}

module.exports = GeniusPayProvider;
module.exports.GeniusPayError = GeniusPayError;
module.exports.WebhookRejectedError = WebhookRejectedError;
module.exports.phpJsonEncode = phpJsonEncode;
