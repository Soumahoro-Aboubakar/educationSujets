/**
 * Transition vers le quota gratuit à vie (3 sujets 2010-2020 sans abonnement).
 *
 *   node scripts/migrateFreeQuota.js           → simulation, n'écrit rien
 *   node scripts/migrateFreeQuota.js --apply   → écrit les quotas reconstitués
 *
 * Source : DownloadLog (journal de chaque téléchargement, compte ou visiteur). L'ancien
 * DownloadQuota ne sert à rien ici : ses droits sortaient d'une fenêtre de 24 h et étaient purgés.
 *
 * Règles :
 *  - seuls comptent les documents aujourd'hui éligibles au quota gratuit (année connue 2010-2020) ;
 *  - un même document ne compte qu'une fois (date du premier téléchargement), au plus `limit` ;
 *  - comptes administrateurs ignorés ;
 *  - un compte ayant déjà été abonné : seuls les téléchargements ANTÉRIEURS à sa première
 *    activation comptent (l'historique des périodes d'abonnement n'est pas conservé ; dans le doute,
 *    rien n'est inventé) ;
 *  - un quota gratuit déjà présent (téléchargements faits après la mise en production) est
 *    complété, jamais réduit ; relancer le script ne compte rien deux fois.
 * Les journaux repris sont marqués access 'free_quota' / charged pour l'historique administratif.
 */
const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const DownloadLog = require('../models/DownloadLog');
const DownloadQuota = require('../models/DownloadQuota');
const Document = require('../models/Document');
const User = require('../models/User');
const Subscription = require('../models/Subscription');
const billingConfig = require('../config/billing');
const { resolveAccessForDocuments } = require('../services/access/documentYear');

const id = (value) => String(value?._id || value);

const reconstructFreeQuota = async ({ apply = false, log = console.log } = {}) => {
  const { recentLimits, exemptRoles } = billingConfig.downloads;
  const limit = recentLimits.free;

  // Journaux antérieurs au nouveau suivi, du plus ancien au plus récent.
  const logs = await DownloadLog.find({ access: null }).select('user visitor document createdAt').sort({ createdAt: 1 }).lean();
  const documentIds = [...new Set(logs.map((entry) => id(entry.document)))];
  const documents = await Document.find({ _id: { $in: documentIds } })
    .select('noeudId type documentType sujetParentId correctionFor').lean();
  const access = await resolveAccessForDocuments(documents);

  const userIds = [...new Set(logs.filter((entry) => entry.user).map((entry) => id(entry.user)))];
  const [users, subscriptions] = await Promise.all([
    User.find({ _id: { $in: userIds } }).select('role').lean(),
    Subscription.find({ user: { $in: userIds } }).select('user firstActivatedAt').lean(),
  ]);
  const roleOf = new Map(users.map((user) => [id(user._id), user.role]));
  const activatedAt = new Map(subscriptions.filter((item) => item.firstActivatedAt).map((item) => [id(item.user), new Date(item.firstActivatedAt)]));

  // Par sujet de quota : documents éligibles dans l'ordre du premier téléchargement.
  const plans = new Map();
  let ignoredSubscribed = 0;
  logs.forEach((entry) => {
    const documentAccess = access.get(id(entry.document));
    if (!documentAccess?.freeQuotaEligible) return;
    let subject;
    if (entry.user) {
      const userId = id(entry.user);
      if (!roleOf.has(userId) || exemptRoles.includes(roleOf.get(userId))) return;
      const since = activatedAt.get(userId);
      if (since && new Date(entry.createdAt) >= since) { ignoredSubscribed += 1; return; }
      subject = `free:u:${userId}`;
    } else if (entry.visitor) {
      subject = `free:v:${entry.visitor}`;
    } else return;
    const plan = plans.get(subject) || new Map();
    if (!plan.has(id(entry.document)) && plan.size < limit) {
      plan.set(id(entry.document), { logId: entry._id, grantedAt: entry.createdAt, access: documentAccess });
    }
    plans.set(subject, plan);
  });

  const report = { logs: logs.length, subjects: plans.size, grants: 0, logsMarked: 0, ignoredSubscribed, skippedConflicts: 0, apply };
  for (const [subject, plan] of plans) {
    const existing = await DownloadQuota.findOne({ subject }).lean();
    const have = new Set((existing?.grants || []).map((grant) => id(grant.document)));
    const room = Math.max(0, limit - (existing?.grants || []).filter((grant) => grant.status === 'consumed').length);
    const added = [...plan.entries()].filter(([documentId]) => !have.has(documentId)).slice(0, room);
    if (!added.length) continue;
    report.grants += added.length;
    if (!apply) continue;

    const grants = added.map(([documentId, item]) => ({ document: documentId, grantedAt: item.grantedAt, status: 'consumed', reservedUntil: null, op: 'migration' }));
    const result = existing
      ? await DownloadQuota.updateOne({ _id: existing._id, version: existing.version }, { $push: { grants: { $each: grants } }, $inc: { version: 1 } })
      : await DownloadQuota.updateOne({ subject }, { $setOnInsert: { subject, grants, version: 0, expiresAt: null } }, { upsert: true });
    if (!(result.modifiedCount || result.upsertedCount)) {
      // Téléchargement concurrent pendant la migration : relancer le script reprendra ce sujet.
      report.grants -= added.length;
      report.skippedConflicts += 1;
      continue;
    }
    await Promise.all(added.map(([, item]) => DownloadLog.updateOne(
      { _id: item.logId },
      { $set: { access: 'free_quota', charged: true, year: item.access.year, organisme: item.access.organismeId } }
    )));
    report.logsMarked += added.length;
  }
  log(`[migrateFreeQuota] ${apply ? 'APPLIQUÉ' : 'SIMULATION'} : ${JSON.stringify(report)}`);
  return report;
};

if (require.main === module) {
  dotenv.config({ path: path.join(__dirname, '..', '.env') });
  const connectDB = require('../config/db');
  connectDB()
    .then(() => reconstructFreeQuota({ apply: process.argv.includes('--apply') }))
    .then(() => mongoose.disconnect())
    .catch(async (error) => {
      console.error(error);
      await mongoose.disconnect().catch(() => {});
      process.exit(1);
    });
}

module.exports = { reconstructFreeQuota };
