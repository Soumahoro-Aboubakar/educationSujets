const crypto = require('crypto');
const { ipKeyGenerator } = require('express-rate-limit');
const DownloadLog = require('../../models/DownloadLog');
const billingConfig = require('../../config/billing');
const AppError = require('../../utils/errors');
const { clientIp } = require('../../utils/request');
const { isSubscriptionActive } = require('./subscriptionService');
const { dayKey } = require('./pricing');
const quota = require('./quotaService');
const { resolveAccessForDocument } = require('../access/documentYear');
const { resolveVisitor } = require('../access/visitorIdentity');

/*
 * Droit de télécharger un document (politique freemium, règles dans config/billing.js) :
 *
 *   | Profil                         | <= freeUntilYear | Plus récent (ou année inconnue)      |
 *   | Visiteur sans compte           | gratuit          | quota « free » (3 / 24 h glissantes) |
 *   | Compte sans abonnement / expiré| gratuit          | quota « free » (3 / 24 h glissantes) |
 *   | Abonnement actif               | gratuit          | quota « subscriber » (20 / 24 h)     |
 *   | Administration                 | gratuit          | illimité                             |
 *
 * Les documents gratuits ne consomment jamais de quota. Un document récent déjà accordé dans la
 * fenêtre de 24 h ne recompte pas (nouvel essai après un échec, second appareil). Le serveur est
 * seul juge : les interfaces ne font qu'anticiper ces réponses.
 */

const { downloads } = billingConfig;

const isExempt = (user) => downloads.exemptRoles.includes(user?.role);

/** Documents réservés aux abonnés quel que soit le quota gratuit (mode historique « premium »). */
const requiresSubscription = (document) => downloads.protection === 'premium' && Boolean(document?.isPremmuim);

const ipKeyOf = (req) => ipKeyGenerator(clientIp(req), 56);

const ACTOR = Symbol('download-actor');

/** Profil de téléchargement d'un compte : 'unlimited' | 'subscriber' | 'free'. */
const buildActorForUser = async (user, { ipKey = null } = {}) => {
  if (user?.accountStatus && user.accountStatus !== 'ACTIVE') {
    throw new AppError('Ce compte est désactivé. Contactez le support Fatafalta.', 403, undefined, 'ACCOUNT_DISABLED');
  }
  const exempt = isExempt(user);
  const subscribed = !exempt && await isSubscriptionActive(user._id);
  return {
    [ACTOR]: true,
    user,
    visitorId: null,
    ipKey,
    plan: exempt ? 'unlimited' : subscribed ? 'subscriber' : 'free',
  };
};

/** Profil de la requête : compte connecté, sinon visiteur (identifiant créé au besoin). */
const buildActor = async (req, res, { mintVisitor = true } = {}) => {
  const ipKey = ipKeyOf(req);
  if (req.user) return buildActorForUser(req.user, { ipKey });
  return { [ACTOR]: true, user: null, visitorId: resolveVisitor(req, res, { mint: mintVisitor }), ipKey, plan: 'free' };
};

const toActor = async (actorOrUser) => {
  if (actorOrUser?.[ACTOR]) return actorOrUser;
  if (actorOrUser?._id) return buildActorForUser(actorOrUser);
  return { [ACTOR]: true, user: null, visitorId: null, ipKey: null, plan: 'free' };
};

const limitOf = (plan) => (plan === 'subscriber' ? downloads.recentLimits.subscriber : downloads.recentLimits.free);

/** Quotas à respecter, le principal en premier. Un visiteur a aussi un plafond par IP. */
const subjectsOf = (actor) => {
  const limit = limitOf(actor.plan);
  if (actor.user) return [{ subject: `u:${actor.user._id}`, limit }];
  const subjects = [];
  if (actor.visitorId) subjects.push({ subject: `v:${actor.visitorId}`, limit });
  if (actor.ipKey) subjects.push({ subject: `ip:${actor.ipKey}`, limit: Math.max(limit, downloads.anonymousIpLimit), shared: true });
  return subjects.length ? subjects : [{ subject: 'ip:unknown', limit, shared: true }];
};

const formatRenewal = (date) => (date
  ? new Date(date).toLocaleString('fr-FR', {
    timeZone: 'Africa/Abidjan', weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
  }).replace(':', ' h ')
  : null);

/**
 * État du quota de sujets récents pour l'interface (compteurs, prochain renouvellement).
 * Un visiteur voit la plus restrictive de ses deux limites (identifiant, connexion partagée).
 */
const getQuotaStatus = async (actorOrUser, now = new Date()) => {
  const actor = await toActor(actorOrUser);
  const base = {
    plan: actor.plan,
    isVisitor: !actor.user,
    windowHours: downloads.windowHours,
    freeUntilYear: downloads.freeUntilYear,
    limits: { ...downloads.recentLimits },
  };
  if (actor.plan === 'unlimited') {
    return { ...base, unlimited: true, limit: null, used: 0, remaining: null, nextRenewalAt: null, documentIds: [] };
  }
  const usages = await Promise.all(subjectsOf(actor).map(async (item) => ({ ...item, usage: await quota.getUsage(item.subject, item.limit, now) })));
  const main = usages[0].usage;
  const tightest = usages.reduce((best, item) => (item.usage.remaining < best.usage.remaining ? item : best), usages[0]);
  return {
    ...base,
    unlimited: false,
    limit: main.limit,
    used: main.used,
    remaining: tightest.usage.remaining,
    sharedConnectionLimited: tightest !== usages[0] && tightest.usage.remaining < main.remaining,
    nextRenewalAt: tightest.usage.remaining > 0 ? main.nextRenewalAt : tightest.usage.nextRenewalAt,
    documentIds: main.documentIds,
  };
};

const subscriptionRequiredError = () => new AppError(
  `Ce sujet fait partie de nos ressources récentes, réservées aux abonnés Fatafalta. Vous pouvez télécharger gratuitement les anciens sujets jusqu'à l'année ${downloads.freeUntilYear}. Pour accéder à ce document et aux autres sujets récents, découvrez notre abonnement.`,
  403,
  { freeUntilYear: downloads.freeUntilYear, canSubscribe: true },
  'SUBSCRIPTION_REQUIRED'
);

const quotaExceededError = (actor, usage, requested, { shared = false } = {}) => {
  const renewal = formatRenewal(usage.nextRenewalAt);
  const free = actor.plan !== 'subscriber';
  const what = free
    ? `vos ${usage.limit} téléchargements gratuits de sujets récents`
    : `vos ${usage.limit} téléchargements de sujets récents`;
  const message = [
    shared
      ? `La limite de téléchargements de sujets récents est atteinte pour cette connexion (partagée par plusieurs visiteurs).${free ? ' Créez un compte gratuit pour disposer de votre propre quota.' : ''}`
      : `Vous avez utilisé ${what} sur les dernières ${downloads.windowHours} heures.`,
    renewal ? `Un nouveau téléchargement sera possible à partir du ${renewal} (heure d'Abidjan).` : null,
    `Les sujets de ${downloads.freeUntilYear} et avant restent gratuits et illimités.`,
    free && !shared ? 'Avec un abonnement, vous pouvez télécharger jusqu’à ' + `${downloads.recentLimits.subscriber} sujets récents par période de ${downloads.windowHours} heures.` : null,
  ].filter(Boolean).join(' ');
  return new AppError(message, 429, {
    plan: actor.plan,
    limit: usage.limit,
    used: usage.used,
    remaining: usage.remaining,
    requested,
    nextRenewalAt: usage.nextRenewalAt,
    // Ancien champ lu par les clients existants.
    resetsAt: usage.nextRenewalAt,
    windowHours: downloads.windowHours,
    freeUntilYear: downloads.freeUntilYear,
    canSubscribe: free,
    sharedConnection: shared,
  }, 'DAILY_LIMIT_REACHED');
};

/**
 * Accorde (ou réserve) des droits sur des documents récents, pour tous les quotas de l'acteur.
 * Tout ou rien ; en cas de refus, les droits déjà posés pour cette opération sont annulés.
 */
const chargeRecent = async (actorOrUser, documentIds, { op = crypto.randomUUID(), reserveMinutes = null, now = new Date() } = {}) => {
  const actor = await toActor(actorOrUser);
  if (actor.plan === 'unlimited' || !documentIds.length) return { op, charged: [], alreadyGranted: [] };
  if (limitOf(actor.plan) === 0) throw subscriptionRequiredError();

  const options = {
    op,
    now,
    status: reserveMinutes ? 'reserved' : 'consumed',
    reservedUntil: reserveMinutes ? new Date(now.getTime() + reserveMinutes * 60 * 1000) : null,
  };
  const done = [];
  let main = null;
  try {
    for (const item of subjectsOf(actor)) {
      const result = await quota.grant(item.subject, documentIds, item.limit, options);
      done.push(item.subject);
      if (!main) main = result;
    }
  } catch (error) {
    await Promise.all(done.map((subject) => quota.release(subject, op)));
    if (error instanceof quota.QuotaExceededError) {
      const shared = subjectsOf(actor).find((item) => item.subject === error.subject)?.shared;
      throw quotaExceededError(actor, error.usage, error.requested, { shared });
    }
    throw error;
  }
  return { op, charged: main.charged, alreadyGranted: main.alreadyGranted, subjects: done };
};

const confirmCharge = async (actorOrUser, op) => {
  const actor = await toActor(actorOrUser);
  await Promise.all(subjectsOf(actor).map((item) => quota.confirm(item.subject, op)));
};

const releaseCharge = async (actorOrUser, op, documentIds = null) => {
  const actor = await toActor(actorOrUser);
  await Promise.all(subjectsOf(actor).map((item) => quota.release(item.subject, op, documentIds)));
};

/**
 * Contrôle avant de délivrer un document : compte actif → gratuité → abonnement → quota.
 * L'existence et la visibilité du document sont vérifiées par documentService.assertDocumentAccess.
 * @returns {{ tier: 'free'|'recent', access: object, op: string|null, charged: string[] }}
 */
const authorizeDownload = async (actorOrUser, document, { access = null, now = new Date() } = {}) => {
  if (!document) {
    throw new AppError('Document non trouve', 404);
  }
  const actor = await toActor(actorOrUser);
  const documentAccess = access || await resolveAccessForDocument(document);

  if (documentAccess.tier === 'free' || actor.plan === 'unlimited') {
    return { tier: documentAccess.tier, access: documentAccess, op: null, charged: [] };
  }
  if (requiresSubscription(document) && actor.plan !== 'subscriber') {
    throw subscriptionRequiredError();
  }
  const { op, charged } = await chargeRecent(actor, [document._id], { now });
  return { tier: 'recent', access: documentAccess, op, charged };
};

/** Compatibilité : usage du quota d'un compte (tableau de bord, anciens appels). */
const getDailyUsage = async (userOrId) => {
  const user = userOrId?._id ? userOrId : { _id: userOrId, role: 'user' };
  const status = await getQuotaStatus(user);
  return { ...status, resetsAt: status.nextRenewalAt };
};

const logDownload = async (actorOrUser, document, req) => {
  // Acteur complet, { user, visitorId } (lot préparé), ou compte seul (anciens appels).
  const actor = actorOrUser?.[ACTOR] || (actorOrUser && 'visitorId' in actorOrUser)
    ? actorOrUser
    : { user: actorOrUser || null, visitorId: null };
  if (!actor.user && !actor.visitorId) return;

  try {
    await DownloadLog.create({
      user: actor.user?._id || null,
      visitor: actor.user ? null : actor.visitorId,
      document: document._id,
      day: dayKey(),
      ip: req?.ip,
      userAgent: req?.get?.('user-agent')?.slice(0, 200),
    });
  } catch (error) {
    // La journalisation ne doit jamais bloquer un téléchargement autorisé.
    console.error(`[DOWNLOAD_LOG_ERROR] user=${actor.user?._id || 'visitor'} document=${document._id} ${error.message}`);
  }
};

module.exports = {
  authorizeDownload,
  chargeRecent,
  confirmCharge,
  releaseCharge,
  buildActor,
  buildActorForUser,
  getQuotaStatus,
  logDownload,
  getDailyUsage,
  requiresSubscription,
  subscriptionRequiredError,
  isExempt,
  formatRenewal,
};
