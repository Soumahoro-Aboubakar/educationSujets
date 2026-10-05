const PaymentMethod = require('../../models/PaymentMethod');
const billingConfig = require('../../config/billing');
const AppError = require('../../utils/errors');
const log = require('./paymentLogger');
const { getPaymentProvider } = require('./index');

/*
 * Moyens de paiement : source unique pour le web, le mobile et la validation serveur.
 * GeniusPay ne publie pas la liste des moyens actifs d'un marchand ; elle est donc tenue en
 * base par l'administrateur, initialisée une seule fois avec billingConfig.payments.defaultMethods.
 * Les opérateurs routés par PawaPay ne sont proposés que s'ils sont ouverts chez GeniusPay.
 */

const ROUTING_FIELDS = ['gatewayMethod', 'mmoProvider', 'flow'];

// Étapes génériques d'une validation sur le téléphone, si l'opérateur n'en définit pas.
const DEFAULT_PUSH_STEPS = ['Ouvrez la demande de paiement reçue sur votre téléphone', 'Saisissez votre code secret', 'Confirmez le paiement'];

// Libellés des identifiants utilisés avant l'arrivée de GeniusPay (paiements historiques).
const LEGACY_LABELS = { mtn_momo: 'MTN Mobile Money' };

let seeded = false;

/**
 * Insère les moyens par défaut absents et complète le routage des moyens enregistrés avant
 * son introduction, sans jamais modifier un réglage de l'administrateur.
 */
const ensureDefaults = async () => {
  if (seeded) return;
  await PaymentMethod.bulkWrite(
    billingConfig.payments.defaultMethods.flatMap((method) => [
      { updateOne: { filter: { code: method.code }, update: { $setOnInsert: method }, upsert: true } },
      {
        updateOne: {
          filter: { code: method.code, gatewayMethod: { $exists: false } },
          update: { $set: Object.fromEntries(ROUTING_FIELDS.map((field) => [field, method[field]])) },
        },
      },
      ...(method.confirmSteps ? [{
        updateOne: {
          filter: { code: method.code, confirmSteps: { $exists: false } },
          update: { $set: { confirmSteps: method.confirmSteps } },
        },
      }] : []),
    ]),
    { ordered: true }
  );
  seeded = true;
};

/** Routage effectif chez le fournisseur (un moyen ajouté sans routage utilise son code). */
const routingOf = (method) => ({
  gatewayMethod: method.gatewayMethod || method.code,
  mmoProvider: method.mmoProvider || null,
  flow: method.flow === 'push' ? 'push' : 'redirect',
});

/** Ouvert chez le fournisseur ? true / false, ou null si on ne peut pas le savoir. */
const providerAvailability = (method, openOperators) => {
  const { gatewayMethod, mmoProvider } = routingOf(method);
  if (gatewayMethod !== 'pawapay' || !mmoProvider || !openOperators) return null;
  return openOperators.includes(mmoProvider);
};

const fetchOpenOperators = async () => {
  try {
    return await getPaymentProvider().listMobileMoneyProviders('CI');
  } catch (error) {
    return null;
  }
};

const toPublicMethod = (method) => ({
  id: method.code,
  code: method.code,
  label: method.label,
  requiresPhone: method.requiresPhone !== false,
  logoUrl: method.logoUrl || null,
  // 'redirect' : page de paiement (QR code Wave…) ; 'push' : validation sur le téléphone.
  flow: routingOf(method).flow,
});

const toAdminMethod = (method, openOperators) => ({
  ...toPublicMethod(method),
  ...routingOf(method),
  confirmSteps: method.confirmSteps || [],
  enabled: Boolean(method.enabled),
  availableAtProvider: providerAvailability(method, openOperators),
  sortOrder: method.sortOrder,
  updatedAt: method.updatedAt,
});

const listAll = async () => {
  await ensureDefaults();
  return PaymentMethod.find().sort({ sortOrder: 1, label: 1 }).lean();
};

/** Moyens visibles par les abonnés : activés par l'administrateur ET ouverts chez le fournisseur. */
const listEnabled = async () => {
  await ensureDefaults();
  const [methods, openOperators] = await Promise.all([
    PaymentMethod.find({ enabled: true }).sort({ sortOrder: 1, label: 1 }).lean(),
    fetchOpenOperators(),
  ]);
  return methods.filter((method) => providerAvailability(method, openOperators) !== false).map(toPublicMethod);
};

/**
 * Contrôle serveur d'un moyen choisi par le client. Lu en base à chaque initiation : une
 * désactivation prend effet immédiatement, y compris pour une requête qui contourne l'interface.
 */
const assertUsableMethod = async (code) => {
  await ensureDefaults();
  const method = typeof code === 'string' ? await PaymentMethod.findOne({ code: code.trim().toLowerCase() }).lean() : null;
  if (!method) {
    throw new AppError('Moyen de paiement non pris en charge.', 400, undefined, 'PAYMENT_METHOD_INVALID');
  }
  if (!method.enabled) {
    throw new AppError('Ce moyen de paiement est temporairement indisponible. Choisissez-en un autre.', 400, undefined, 'PAYMENT_METHOD_DISABLED');
  }
  if (providerAvailability(method, await fetchOpenOperators()) === false) {
    throw new AppError(`${method.label} n’est pas disponible pour le moment. Choisissez un autre moyen de paiement.`, 400, undefined, 'PAYMENT_METHOD_UNAVAILABLE');
  }
  const routing = routingOf(method);
  return {
    ...toPublicMethod(method),
    ...routing,
    confirmSteps: routing.flow === 'push' ? (method.confirmSteps?.length ? method.confirmSteps : DEFAULT_PUSH_STEPS) : [],
  };
};

const labelFor = (payment) => payment.methodLabel || LEGACY_LABELS[payment.method] || payment.method;

// ── Administration ──────────────────────────────────────

const pickAdminFields = (input) => {
  const update = {};
  if (input.enabled !== undefined) {
    if (typeof input.enabled !== 'boolean') throw new AppError('« enabled » doit être un booléen.', 400, undefined, 'VALIDATION_ERROR');
    update.enabled = input.enabled;
  }
  if (input.label !== undefined) {
    const label = String(input.label).trim();
    if (!label || label.length > 60) throw new AppError('Libellé invalide (1 à 60 caractères).', 400, undefined, 'VALIDATION_ERROR');
    update.label = label;
  }
  if (input.requiresPhone !== undefined) update.requiresPhone = Boolean(input.requiresPhone);
  if (input.sortOrder !== undefined) {
    const order = Number(input.sortOrder);
    if (!Number.isInteger(order) || order < 0 || order > 10000) throw new AppError('Ordre invalide.', 400, undefined, 'VALIDATION_ERROR');
    update.sortOrder = order;
  }
  if (input.logoUrl !== undefined) {
    const logoUrl = input.logoUrl ? String(input.logoUrl).trim() : null;
    if (logoUrl && !/^https:\/\/[^\s]{4,490}$/i.test(logoUrl)) {
      throw new AppError('Le logo doit être une adresse https.', 400, undefined, 'VALIDATION_ERROR');
    }
    update.logoUrl = logoUrl;
  }
  if (input.gatewayMethod !== undefined) {
    const gatewayMethod = String(input.gatewayMethod || '').trim().toLowerCase();
    if (!/^[a-z0-9_]{2,40}$/.test(gatewayMethod)) throw new AppError('Passerelle invalide.', 400, undefined, 'VALIDATION_ERROR');
    update.gatewayMethod = gatewayMethod;
  }
  if (input.mmoProvider !== undefined) {
    const mmoProvider = input.mmoProvider ? String(input.mmoProvider).trim().toUpperCase() : null;
    if (mmoProvider && !/^[A-Z0-9_]{2,40}$/.test(mmoProvider)) throw new AppError('Code opérateur invalide.', 400, undefined, 'VALIDATION_ERROR');
    update.mmoProvider = mmoProvider;
  }
  if (input.confirmSteps !== undefined) {
    const steps = Array.isArray(input.confirmSteps) ? input.confirmSteps.map((step) => String(step).trim()).filter(Boolean) : null;
    if (!steps || steps.length > 5 || steps.some((step) => step.length > 120)) {
      throw new AppError('Étapes de confirmation invalides (5 au plus, 120 caractères chacune).', 400, undefined, 'VALIDATION_ERROR');
    }
    update.confirmSteps = steps;
  }
  if (input.flow !== undefined) {
    if (!['redirect', 'push'].includes(input.flow)) throw new AppError('Parcours invalide.', 400, undefined, 'VALIDATION_ERROR');
    update.flow = input.flow;
  }
  return update;
};

const adminList = async () => {
  const [methods, openOperators] = await Promise.all([listAll(), fetchOpenOperators()]);
  return methods.map((method) => toAdminMethod(method, openOperators));
};

const adminUpdate = async (code, input, actor) => {
  await ensureDefaults();
  const update = pickAdminFields(input);
  const method = await PaymentMethod.findOneAndUpdate(
    { code: String(code).toLowerCase() },
    { $set: { ...update, updatedBy: actor._id } },
    { new: true, runValidators: true }
  ).lean();
  if (!method) throw new AppError('Moyen de paiement introuvable', 404);

  log.info('method.updated', { method: method.code, status: method.enabled ? 'enabled' : 'disabled', userId: actor._id });
  return toAdminMethod(method, await fetchOpenOperators());
};

/** Ajout d'un moyen pris en charge par le fournisseur, sans modifier le code de l'application. */
const adminCreate = async (input, actor) => {
  const code = String(input.code || '').trim().toLowerCase();
  if (!/^[a-z0-9_]{2,40}$/.test(code)) {
    throw new AppError('Identifiant technique invalide (lettres minuscules, chiffres et « _ »).', 400, undefined, 'VALIDATION_ERROR');
  }
  if (!input.label) throw new AppError('Libellé requis.', 400, undefined, 'VALIDATION_ERROR');

  await ensureDefaults();
  try {
    const method = await PaymentMethod.create({ enabled: false, ...pickAdminFields(input), code, updatedBy: actor._id });
    log.info('method.created', { method: code, userId: actor._id });
    return toAdminMethod(method.toObject(), await fetchOpenOperators());
  } catch (error) {
    if (error.code === 11000) throw new AppError('Ce moyen de paiement existe déjà.', 409, undefined, 'PAYMENT_METHOD_EXISTS');
    throw error;
  }
};

module.exports = {
  listEnabled,
  assertUsableMethod,
  labelFor,
  adminList,
  adminUpdate,
  adminCreate,
  // Pour les tests : force une nouvelle initialisation après un vidage de la base.
  resetSeedCache: () => { seeded = false; },
};
