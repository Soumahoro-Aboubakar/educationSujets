const webpush = require('web-push');
const PushSubscription = require('../models/PushSubscription');
const PrepIdentite = require('../models/PrepIdentite');
const PrepProgression = require('../models/PrepProgression');

/**
 * Notifications web (Web Push, protocole standard : Chrome/Android, Safari iOS 16.4+ en PWA,
 * navigateurs de bureau). Inactif tant que VAPID_PUBLIC_KEY et VAPID_PRIVATE_KEY ne sont pas
 * définies (génération : npx web-push generate-vapid-keys). Aucune donnée personnelle dans le
 * message : un titre, une phrase, une adresse de l'application.
 *
 * Rappel quotidien : à 18 h (heure d'Abidjan = UTC), aux élèves abonnés qui n'ont pas encore
 * étudié aujourd'hui ; un seul par jour et par navigateur, même après un redémarrage.
 */
const enabled = () => Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
let configured = false;
const configure = () => {
  if (configured || !enabled()) return enabled();
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:contact@fatafalta.com', process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
  configured = true;
  return true;
};

const publicKey = () => (enabled() ? process.env.VAPID_PUBLIC_KEY : null);

/** Envoi à un abonnement ; supprime ceux que le service push déclare expirés (404 / 410). */
const send = async (sub, payload) => {
  if (!configure()) return { ok: false, disabled: true };
  try {
    await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, JSON.stringify(payload), { TTL: 6 * 3600, urgency: 'normal' });
    if (sub.echecs) await PushSubscription.updateOne({ _id: sub._id }, { $set: { echecs: 0 } });
    return { ok: true };
  } catch (error) {
    if (error.statusCode === 404 || error.statusCode === 410) {
      await PushSubscription.deleteOne({ _id: sub._id });
      return { ok: false, expired: true };
    }
    await PushSubscription.updateOne({ _id: sub._id }, { $inc: { echecs: 1 } });
    return { ok: false, error: error.statusCode || error.message };
  }
};

const today = () => new Date().toISOString().slice(0, 10);

/** Élèves sans activité aujourd'hui (toutes préparations confondues). */
const inactiveToday = async (userIds) => {
  const debut = new Date(`${today()}T00:00:00.000Z`);
  const identites = await PrepIdentite.find({ user: { $in: userIds }, fusionneeDans: null }).select('_id user').lean();
  const actives = await PrepProgression.find({ identite: { $in: identites.map((i) => i._id) }, derniereActivite: { $gte: debut } }).select('identite').lean();
  const activeIds = new Set(actives.map((p) => String(p.identite)));
  const activeUsers = new Set(identites.filter((i) => activeIds.has(String(i._id))).map((i) => String(i.user)));
  return new Set(userIds.map(String).filter((u) => !activeUsers.has(u)));
};

const sendDailyReminders = async () => {
  if (!configure()) return { sent: 0, disabled: true };
  const jour = today();
  let sent = 0;
  let cursorId = null;
  for (;;) {
    const batch = await PushSubscription.find({ rappels: true, dernierEnvoi: { $ne: jour }, ...(cursorId ? { _id: { $gt: cursorId } } : {}) }).sort({ _id: 1 }).limit(200).lean();
    if (!batch.length) break;
    cursorId = batch[batch.length - 1]._id;
    const inactive = await inactiveToday([...new Set(batch.map((s) => String(s.user)))]);
    for (const sub of batch) {
      if (!inactive.has(String(sub.user))) continue;
      // Marqué avant l'envoi : jamais deux rappels le même jour, même si l'envoi échoue.
      const claimed = await PushSubscription.updateOne({ _id: sub._id, dernierEnvoi: { $ne: jour } }, { $set: { dernierEnvoi: jour } });
      if (!claimed.modifiedCount) continue;
      const r = await send(sub, {
        title: 'Ta séance du jour t’attend',
        body: 'Dix minutes suffisent pour garder ta série. Ton plan est prêt.',
        url: sub.programme ? `/preparation/${sub.programme}` : '/preparation',
        tag: 'rappel-quotidien',
      });
      if (r.ok) sent += 1;
    }
  }
  return { sent };
};

/** Vérification toutes les 10 minutes ; le rappel part dans la fenêtre 18 h – 19 h UTC. */
const startReminderScheduler = () => {
  if (!enabled() || process.env.PUSH_REMINDERS === 'off') return null;
  const tick = () => {
    if (new Date().getUTCHours() !== 18) return;
    sendDailyReminders().then((r) => { if (r.sent) console.log(`[PUSH] ${r.sent} rappel(s) envoyé(s)`); }).catch((e) => console.warn('[PUSH] rappels :', e.message));
  };
  const timer = setInterval(tick, 10 * 60 * 1000);
  timer.unref?.();
  return timer;
};

module.exports = { enabled, publicKey, send, sendDailyReminders, startReminderScheduler };
