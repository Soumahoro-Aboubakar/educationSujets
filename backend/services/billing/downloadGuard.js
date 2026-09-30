const DownloadCounter = require('../../models/DownloadCounter');
const DownloadLog = require('../../models/DownloadLog');
const billingConfig = require('../../config/billing');
const AppError = require('../../utils/errors');
const { isSubscriptionActive } = require('./subscriptionService');
const { dayKey, nextDayStart } = require('./pricing');

const isExempt = (user) => billingConfig.downloads.exemptRoles.includes(user?.role);

const requiresSubscription = (document) =>
  billingConfig.downloads.protection === 'all' || Boolean(document?.isPremmuim);

const getDailyUsage = async (userId, now = new Date()) => {
  const counter = await DownloadCounter.findOne({ user: userId, day: dayKey(now) }).lean();
  return {
    used: counter?.count || 0,
    limit: billingConfig.downloads.dailyLimit,
    resetsAt: nextDayStart(now),
  };
};

/**
 * Réserve une unité du quota du jour. Un document déjà téléchargé aujourd'hui ne recompte pas.
 * Atomique : le filtre `count < limit` + index unique (user, day) empêche tout dépassement,
 * même avec des requêtes parallèles.
 */
const consumeQuota = async (userId, documentId, now = new Date()) => {
  const day = dayKey(now);
  const limit = billingConfig.downloads.dailyLimit;

  if (await DownloadLog.exists({ user: userId, document: documentId, day })) {
    return;
  }

  try {
    await DownloadCounter.findOneAndUpdate(
      { user: userId, day, count: { $lt: limit } },
      { $inc: { count: 1 } },
      { upsert: true }
    );
  } catch (error) {
    if (error.code === 11000) {
      throw new AppError(
        `Vous avez atteint la limite de ${limit} téléchargements pour aujourd’hui. Elle sera réinitialisée à minuit.`,
        429,
        { limit, resetsAt: nextDayStart(now) },
        'DAILY_LIMIT_REACHED'
      );
    }
    throw error;
  }
};

/**
 * Contrôle complet avant de délivrer un lien de téléchargement (dans l'ordre du cahier des charges) :
 * authentification → compte actif → abonnement → quota. L'existence et la visibilité du document
 * sont vérifiées ensuite par documentService.assertDocumentAccess.
 */
const authorizeDownload = async (user, document) => {
  if (!document) {
    throw new AppError('Document non trouve', 404);
  }

  if (!user) {
    throw new AppError('Connectez-vous pour télécharger ce document.', 401, undefined, 'AUTH_REQUIRED');
  }

  if (user.accountStatus && user.accountStatus !== 'ACTIVE') {
    throw new AppError('Ce compte est desactive. Contactez le support.', 403, undefined, 'ACCOUNT_DISABLED');
  }

  if (isExempt(user)) {
    return;
  }

  if (requiresSubscription(document) && !(await isSubscriptionActive(user._id))) {
    throw new AppError('Un abonnement actif est nécessaire pour télécharger ce document.', 403, undefined, 'SUBSCRIPTION_REQUIRED');
  }

  await consumeQuota(user._id, document._id);
};

const logDownload = async (user, document, req) => {
  if (!user) return;

  try {
    await DownloadLog.create({
      user: user._id,
      document: document._id,
      day: dayKey(),
      ip: req?.ip,
      userAgent: req?.get?.('user-agent')?.slice(0, 200),
    });
  } catch (error) {
    // La journalisation ne doit jamais bloquer un téléchargement autorisé.
    console.error(`[DOWNLOAD_LOG_ERROR] user=${user._id} document=${document._id} ${error.message}`);
  }
};

module.exports = {
  authorizeDownload,
  logDownload,
  getDailyUsage,
  requiresSubscription,
  isExempt,
};
