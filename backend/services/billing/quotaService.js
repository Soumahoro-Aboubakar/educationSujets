const DownloadQuota = require('../../models/DownloadQuota');
const billingConfig = require('../../config/billing');

/*
 * Quota glissant (voir models/DownloadQuota.js). Fonctions sans connaissance des plans :
 * l'appelant fournit le sujet (« u:… », « v:… », « ip:… ») et la limite applicable.
 */

const HOUR_MS = 60 * 60 * 1000;
const MAX_ATTEMPTS = 8;

const windowMs = () => billingConfig.downloads.windowHours * HOUR_MS;
const idOf = (value) => String(value?._id || value);

/** Droits encore comptés à `now` : accordés dans la fenêtre, et confirmés ou réservés non expirés. */
const activeGrants = (grants = [], now = new Date()) => {
  const since = now.getTime() - windowMs();
  return grants.filter((grant) => new Date(grant.grantedAt).getTime() > since
    && (grant.status === 'consumed' || (grant.reservedUntil && new Date(grant.reservedUntil) > now)));
};

/** Date à laquelle `count` droits seront sortis de la fenêtre (le plus ancien d'abord). */
const renewalAfter = (grants, count = 1) => {
  const sorted = grants.map((grant) => new Date(grant.grantedAt).getTime()).sort((a, b) => a - b);
  const index = Math.min(Math.max(count, 1), sorted.length) - 1;
  return sorted.length ? new Date(sorted[index] + windowMs()) : null;
};

const summarize = (grants, limit) => {
  const used = grants.length;
  return {
    used,
    limit,
    remaining: Math.max(0, limit - used),
    windowHours: billingConfig.downloads.windowHours,
    // Prochain droit libéré : uniquement utile quand tout est consommé.
    nextRenewalAt: used >= limit ? renewalAfter(grants, used - limit + 1) : renewalAfter(grants, 1),
    documentIds: grants.map((grant) => idOf(grant.document)),
  };
};

const getUsage = async (subject, limit, now = new Date()) => {
  const quota = await DownloadQuota.findOne({ subject }).lean();
  return summarize(activeGrants(quota?.grants, now), limit);
};

class QuotaExceededError extends Error {
  constructor(subject, usage, requested) {
    super('QUOTA_EXCEEDED');
    this.subject = subject;
    this.usage = usage;
    this.requested = requested;
  }
}

/**
 * Accorde des droits pour `documentIds` (dédoublonnés). Un document déjà accordé dans la
 * fenêtre ne recompte pas. Tout ou rien : si les nouveaux droits dépassent la limite, rien
 * n'est écrit et QuotaExceededError est levée.
 * @returns {{ charged: string[], alreadyGranted: string[], usage: object }}
 */
const grant = async (subject, documentIds, limit, { op, status = 'consumed', reservedUntil = null, now = new Date() } = {}) => {
  const wanted = [...new Set(documentIds.map(idOf))];

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const quota = await DownloadQuota.findOneAndUpdate(
      { subject },
      { $setOnInsert: { subject, grants: [], version: 0 } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean().catch((error) => {
      if (error.code === 11000) return null; // création concurrente : on relit au tour suivant
      throw error;
    });
    if (!quota) continue;

    const active = activeGrants(quota.grants, now);
    const granted = new Set(active.map((item) => idOf(item.document)));
    const charged = wanted.filter((documentId) => !granted.has(documentId));
    const alreadyGranted = wanted.filter((documentId) => granted.has(documentId));

    if (active.length + charged.length > limit) {
      throw new QuotaExceededError(subject, summarize(active, limit), charged.length);
    }

    const nextGrants = [
      ...active,
      ...charged.map((documentId) => ({ document: documentId, grantedAt: now, status, reservedUntil, op })),
    ];
    const updated = await DownloadQuota.updateOne(
      { _id: quota._id, version: quota.version },
      {
        $set: { grants: nextGrants, expiresAt: new Date(now.getTime() + 2 * windowMs()) },
        $inc: { version: 1 },
      }
    );
    if (updated.modifiedCount === 1) {
      return { charged, alreadyGranted, usage: summarize(nextGrants, limit) };
    }
    // Conflit : une autre requête a modifié ce quota entre-temps ; on recommence avec l'état à jour.
  }
  throw new Error(`Conflit persistant sur le quota ${subject}`);
};

/** Confirme les droits réservés par une opération (archive effectivement servie). */
const confirm = (subject, op) => DownloadQuota.updateOne(
  { subject },
  { $set: { 'grants.$[grant].status': 'consumed', 'grants.$[grant].reservedUntil': null }, $inc: { version: 1 } },
  { arrayFilters: [{ 'grant.op': op }] }
);

/** Annule les droits d'une opération (échec, interruption), éventuellement limités à certains documents. */
const release = (subject, op, documentIds = null) => DownloadQuota.updateOne(
  { subject },
  {
    $pull: { grants: documentIds ? { op, document: { $in: documentIds.map(idOf) } } : { op } },
    $inc: { version: 1 },
  }
);

module.exports = {
  activeGrants,
  getUsage,
  grant,
  confirm,
  release,
  QuotaExceededError,
  windowMs,
};
