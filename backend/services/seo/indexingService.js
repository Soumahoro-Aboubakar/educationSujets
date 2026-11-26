const crypto = require('crypto');
const SeoPage = require('../../models/SeoPage');
const SeoState = require('../../models/SeoState');
const SeoLog = require('../../models/SeoLog');
const config = require('./config');
const google = require('./googleSearchConsole');
const { toPath, toUrl } = require('./urlPolicy');

/*
 * Service d'indexation : de la modification d'un contenu jusqu'à la notification des moteurs.
 * Voir docs/seo-indexation.md.
 *
 *  recordChange()  ← contrôleurs (via seoNotifier) : un contenu public a peut-être changé
 *  tick()          ← toutes les minutes, sous verrou en base (une seule instance à la fois) :
 *     1. reconstruit le site (hook Cloudflare Pages) une fois les changements regroupés ;
 *     2. lit la version en ligne (seo-build.json + seo-manifest.json, même buildId exigé) et en déduit
 *        les URL ajoutées, modifiées, supprimées (empreinte du contenu) ;
 *     3. envoie la file à IndexNow après contrôle de la mise en ligne réelle ;
 *     4. Google : soumission du sitemap après des ajouts, inspection différée de quelques URL.
 *
 * Rien ne part vers un moteur avant que la page modifiée soit servie en production.
 */

let deps = { fetch: (...args) => fetch(...args), now: () => new Date(), random: Math.random };
const setDeps = (next) => { deps = { ...deps, ...next }; };
const now = () => deps.now();

const INSTANCE = `${process.pid}-${crypto.randomBytes(4).toString('hex')}`;
let passSeq = 0;
const LOCK_MS = 10 * 60 * 1000;
const HEAD_TIMEOUT_MS = 10 * 1000;
const REMOVAL_CHECKS = 40; // 40 HEAD à 4 en parallèle, 10 s max chacun : < 2 min, bien sous le bail
const BATCH_MAX = 10000; // protocole IndexNow : 10 000 URL par requête
const KEY_CHECK_MS = 6 * 3600 * 1000;
const day = (date) => date.toISOString().slice(0, 10);

const log = (entry) => SeoLog.create({ at: now(), ...entry, urls: entry.urls?.slice(0, 50) }).catch(() => {});

const state = async () => {
  await SeoState.updateOne({ _id: 'main' }, { $setOnInsert: { _id: 'main' } }, { upsert: true });
  return SeoState.findById('main').lean();
};

const request = async (url, { timeoutMs, ...options } = {}) => deps.fetch(url, {
  ...options,
  headers: { 'User-Agent': 'fatafalta-indexation/1.0', ...(options.headers || {}) },
  signal: AbortSignal.timeout(timeoutMs || config.requestTimeoutMs()),
});
/** Message d'erreur réseau sans URL (un hook ou une adresse mal formée ne doit jamais être journalisé). */
const networkError = (error) => (error?.name === 'TimeoutError' ? 'délai dépassé' : error?.name === 'TypeError' && /invalid|parse/i.test(String(error.message)) ? 'adresse invalide' : 'service injoignable');

// ── 1. Événements et reconstruction ───────────────────────────────────────────────────────

/**
 * Un contenu public a peut-être changé. Ne fait que deux écritures légères : appelable 1 000 fois
 * de suite (import massif) sans effet sur les temps de réponse ; une seule reconstruction suivra.
 */
const recordChange = async ({ source = 'inconnu', message = null, ids = [] } = {}) => {
  const at = now();
  await SeoState.updateOne({ _id: 'main' }, { $set: { lastEventAt: at }, $setOnInsert: { _id: 'main' } }, { upsert: true });
  await SeoState.updateOne({ _id: 'main', dirtySince: null }, { $set: { dirtySince: at } });
  await log({ type: 'evenement', source: String(source).slice(0, 80), message, count: ids.length || null, urls: ids.map(String) });
};

const rebuildInFlight = (s) => Boolean(s.rebuildRequestedAt)
  && !(s.builtAt && s.builtAt >= s.rebuildRequestedAt)
  && now() - s.rebuildRequestedAt < config.rebuildTimeoutMs();

const maybeRebuild = async (s, { force = false } = {}) => {
  if (!s.dirtySince && !force) return false;
  if (!force && now() - s.dirtySince < config.rebuildDelayMs()) return false;
  if (rebuildInFlight(s)) return false; // les événements arrivés pendant ce build en déclencheront un autre
  const hook = config.deployHook();
  const requestedAt = now();
  if (!hook) {
    // Sans hook : le site se reconstruit au prochain déploiement ; la lecture périodique le captera.
    await SeoState.updateOne({ _id: 'main', lastEventAt: { $lte: requestedAt } }, { $set: { dirtySince: null } });
    return false;
  }
  const today = day(requestedAt);
  const count = s.rebuildDay === today ? s.rebuildsToday : 0;
  if (count >= config.maxRebuildsPerDay() && !force) {
    if (s.lastRebuildError !== 'quota') await log({ type: 'erreur', source: 'reconstruction', message: `Plafond de ${config.maxRebuildsPerDay()} reconstructions par jour atteint : report au lendemain.` });
    await SeoState.updateOne({ _id: 'main' }, { $set: { lastRebuildError: 'quota' } });
    return false;
  }
  let failure = null;
  try {
    const res = await request(hook, { method: 'POST' });
    if (!res.ok) failure = `HTTP ${res.status}`;
  } catch (error) {
    failure = networkError(error); // l'URL du hook est secrète : jamais le message brut
  }
  if (failure) {
    await SeoState.updateOne({ _id: 'main' }, { $set: { lastRebuildError: failure } });
    await log({ type: 'erreur', source: 'reconstruction', message: `Reconstruction impossible : ${failure}`, ok: false });
    return false;
  }
  // dirtySince n'est effacé qu'à la mise en ligne de ce build (checkLiveBuild) : un build échoué chez
  // Cloudflare est redemandé une fois SEO_REBUILD_TIMEOUT_MS écoulé.
  await SeoState.updateOne({ _id: 'main' }, {
    $set: { rebuildRequestedAt: requestedAt, rebuildDay: today, rebuildsToday: count + 1, lastRebuildError: null },
  });
  await log({ type: 'reconstruction', source: force ? 'administration' : 'automatique', message: 'Reconstruction du site demandée.', ok: true });
  return true;
};

// ── 2. Version en ligne et différences ────────────────────────────────────────────────────

const fetchJson = async (path) => {
  // Paramètre unique : contourne tout cache intermédiaire ; Cache-Control demande la revalidation.
  const res = await request(`${config.siteUrl()}${path}?v=${now().getTime()}`, { headers: { 'Cache-Control': 'no-cache' } });
  if (!res.ok) throw new Error(`${path} : HTTP ${res.status}`);
  return res.json();
};

const asDate = (value) => (value ? new Date(value) : null);

/**
 * Compare le manifeste en ligne à la base. Première version (ou algorithme d'empreinte changé) :
 * simple prise de référence, aucune notification.
 */
const reconcile = async (manifest, s, { force = false } = {}) => {
  const at = now();
  const entries = Object.entries(manifest.pages || {}).filter(([path]) => toPath(toUrl(path)) === path);
  const baseline = s.fingerprintVersion == null || s.fingerprintVersion !== manifest.fp;
  const known = new Map((await SeoPage.find({ live: true }, { path: 1, hash: 1, lastmod: 1, inSitemap: 1 }).lean()).map((page) => [page.path, page]));
  const ops = [];
  const changed = { ajout: [], modification: [], suppression: [] };

  for (const [path, page] of entries) {
    const before = known.get(path);
    known.delete(path);
    const base = { hash: page.h, lastmod: asDate(page.m), inSitemap: page.s !== 0, category: page.c || null, live: true, removedAt: null, buildId: manifest.buildId };
    if (before && before.hash === page.h) {
      if (String(before.lastmod) !== String(base.lastmod) || before.inSitemap !== base.inSitemap) ops.push({ updateOne: { filter: { path }, update: { $set: base } } });
      continue;
    }
    const type = before ? 'modification' : 'ajout';
    const set = { ...base };
    if (!baseline) {
      changed[type].push(path);
      Object.assign(set, { changedAt: at, changeType: type, 'google.dueAt': new Date(at.getTime() + config.inspectionDelayMs()), 'indexNow.state': 'pending', 'indexNow.nextAttemptAt': at, 'indexNow.attempts': 0, 'indexNow.lastError': null, 'indexNow.source': 'version' });
    }
    ops.push({ updateOne: { filter: { path }, update: { $set: set, $setOnInsert: { firstSeenAt: at } }, upsert: true } });
  }

  // Suppressions : jamais sur un manifeste incomplet ; au-delà du garde-fou, confirmation manuelle.
  const removed = [...known.keys()];
  const guard = Math.max(20, Math.ceil((entries.length + removed.length) * config.removalGuardRatio()));
  let suspended = 0;
  if (removed.length && !baseline) {
    if (manifest.complete === false) {
      suspended = removed.length;
      await log({ type: 'erreur', source: 'version', message: `Version incomplète (catalogue ou préparation indisponible au build) : ${removed.length} retrait(s) ignoré(s).` });
    } else if (removed.length > guard && !force) {
      suspended = removed.length;
      await SeoState.updateOne({ _id: 'main' }, { $set: { pendingReview: { buildId: manifest.buildId, removed: removed.length, detectedAt: at } } });
      await log({ type: 'erreur', source: 'version', message: `${removed.length} pages ont disparu d'un coup (seuil ${guard}) : retraits suspendus, à confirmer dans l'administration.` });
    } else {
      for (const path of removed) {
        changed.suppression.push(path);
        ops.push({ updateOne: { filter: { path }, update: { $set: { live: false, removedAt: at, changedAt: at, changeType: 'suppression', buildId: manifest.buildId, 'indexNow.state': 'pending', 'indexNow.nextAttemptAt': at, 'indexNow.attempts': 0, 'indexNow.lastError': null, 'indexNow.source': 'version' } } } });
      }
    }
  } else if (removed.length && baseline && manifest.complete !== false && removed.length <= guard) {
    ops.push({ updateMany: { filter: { path: { $in: removed } }, update: { $set: { live: false, removedAt: at } } } });
  }

  for (let i = 0; i < ops.length; i += 1000) await SeoPage.bulkWrite(ops.slice(i, i + 1000), { ordered: false });

  const update = { buildId: manifest.buildId, builtAt: asDate(manifest.builtAt), commit: manifest.commit || null, fingerprintVersion: manifest.fp, lastBuildError: null };
  if (!suspended || manifest.complete === false) update.pendingReview = { buildId: null, removed: 0, detectedAt: null };
  if (changed.ajout.length) update.sitemapSubmitNeeded = true;
  await SeoState.updateOne({ _id: 'main' }, { $set: update });

  const summary = baseline
    ? `Version de référence ${manifest.buildId} : ${entries.length} URL enregistrées, aucune notification.`
    : `Version ${manifest.buildId} en ligne : ${changed.ajout.length} ajout(s), ${changed.modification.length} modification(s), ${changed.suppression.length} suppression(s)${suspended ? `, ${suspended} retrait(s) suspendu(s)` : ''}.`;
  await log({ type: 'version', source: manifest.commit ? `commit ${manifest.commit}` : 'build', message: summary, ok: true, count: changed.ajout.length + changed.modification.length + changed.suppression.length, urls: [...changed.ajout, ...changed.modification, ...changed.suppression] });
  return { baseline, ...Object.fromEntries(Object.entries(changed).map(([k, v]) => [k, v.length])), suspended };
};

const checkLiveBuild = async (s, { force = false, approvedRemovals = null } = {}) => {
  const due = force || rebuildInFlight(s) || !s.lastBuildCheckAt || now() - s.lastBuildCheckAt >= config.buildPollMs();
  if (!due) return null;
  await SeoState.updateOne({ _id: 'main' }, { $set: { lastBuildCheckAt: now() } });
  try {
    const build = await fetchJson('/seo-build.json');
    if (build?.version !== 1 || !build.buildId) throw new Error('seo-build.json illisible');
    if (build.buildId === s.buildId && !approvedRemovals) return { unchanged: true };
    const manifest = await fetchJson('/seo-manifest.json');
    // Deux requêtes successives peuvent tomber sur deux déploiements : même buildId exigé.
    if (manifest?.buildId !== build.buildId) throw new Error('Déploiement en cours (versions différentes) : nouvel essai à la prochaine vérification');
    // Retraits confirmés par l'administrateur : seulement ceux de la version qu'il a vue.
    if (approvedRemovals && manifest.buildId !== approvedRemovals) {
      const error = new Error('Une nouvelle version est en ligne depuis l’affichage : vérifiez de nouveau avant de confirmer.');
      error.code = 'version_changee';
      throw error;
    }
    const result = await reconcile(manifest, s, { force: Boolean(approvedRemovals) });
    // Événements couverts par cette version : ceux antérieurs à la reconstruction demandée (ou à ce build).
    const covers = new Date(Math.max(s.rebuildRequestedAt ? s.rebuildRequestedAt.getTime() : 0, Date.parse(manifest.builtAt) || 0));
    if (!s.rebuildRequestedAt || Date.parse(manifest.builtAt) >= s.rebuildRequestedAt.getTime()) {
      await SeoState.updateOne({ _id: 'main', lastEventAt: { $lte: covers } }, { $set: { dirtySince: null } });
    }
    return result;
  } catch (error) {
    const message = /^\/seo-|Déploiement|nouvelle version|illisible/.test(error.message) ? error.message : `Version en ligne illisible : ${networkError(error)}`;
    await SeoState.updateOne({ _id: 'main' }, { $set: { lastBuildError: message } });
    if (message !== s.lastBuildError) await log({ type: 'erreur', source: 'version', message: message.slice(0, 300), ok: false });
    if (error.code === 'version_changee') throw error;
    return null;
  }
};

// ── 3. IndexNow ───────────────────────────────────────────────────────────────────────────

const checkKeyFile = async (s, key) => {
  if (s.keyValid && s.keyCheckedAt && now() - s.keyCheckedAt < KEY_CHECK_MS) return true;
  let valid = false;
  try {
    const res = await request(`${config.siteUrl()}/${key}.txt?v=${now().getTime()}`);
    valid = res.ok && (await res.text()).trim() === key;
  } catch { valid = false; }
  await SeoState.updateOne({ _id: 'main' }, { $set: { keyValid: valid, keyCheckedAt: now() } });
  if (!valid) await log({ type: 'erreur', source: 'indexnow', message: `Fichier de clé ${config.siteUrl()}/<clé>.txt absent ou différent : envoi suspendu.`, ok: false });
  return valid;
};

const statusOf = async (url) => {
  try {
    const res = await request(url, { method: 'HEAD', redirect: 'manual', timeoutMs: HEAD_TIMEOUT_MS });
    return res.status;
  } catch {
    return null;
  }
};

const pool = async (items, size, fn) => {
  const results = [];
  for (let i = 0; i < items.length; i += size) results.push(...await Promise.all(items.slice(i, i + size).map(fn)));
  return results;
};

const backoffMs = (attempts, retryAfterMs) => {
  if (retryAfterMs) return retryAfterMs;
  const base = Math.min(2 * 60 * 1000 * 2 ** Math.max(0, attempts - 1), 6 * 3600 * 1000);
  return Math.round(base * (0.8 + deps.random() * 0.4)); // délai aléatoire : pas de rafales synchronisées
};

const retryAfter = (res) => {
  const value = res.headers?.get?.('retry-after');
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.min(seconds * 1000, 24 * 3600 * 1000);
  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.max(0, date - now().getTime()) : null;
};

/** Report de chaque URL selon SES tentatives (une URL neuve n'hérite pas de l'épuisement d'une autre). */
const postpone = (pages, error, status = null, retryAfterMs = null) => SeoPage.bulkWrite(pages.map((page) => {
  const attempts = (page.indexNow?.attempts || 0) + 1;
  const exhausted = attempts >= config.maxAttempts();
  return { updateOne: { filter: { _id: page._id }, update: { $set: {
    'indexNow.attempts': attempts,
    'indexNow.state': exhausted ? 'failed' : 'pending',
    'indexNow.nextAttemptAt': exhausted ? null : new Date(now().getTime() + backoffMs(attempts, retryAfterMs)),
    'indexNow.lastError': error,
    'indexNow.lastStatus': status,
  } } } };
}), { ordered: false });

/**
 * Envoie les URL en attente (au plus 10 000 par requête, une requête par passage).
 * Contrôles préalables : clé publiée en ligne, suppressions réellement non servies (404/410/3xx),
 * échantillon des pages ajoutées ou modifiées réellement servies (200).
 */
const processQueue = async (s) => {
  const key = config.indexNowKey();
  if (!key) return null;
  if (s.indexNowPausedUntil && s.indexNowPausedUntil > now()) return null;
  // Reprise après redémarrage : un envoi resté « sent » plus de 10 min est rejoué.
  await SeoPage.updateMany({ 'indexNow.state': 'sent', 'indexNow.lastAttemptAt': { $lt: new Date(now().getTime() - 10 * 60 * 1000) } }, { $set: { 'indexNow.state': 'pending', 'indexNow.nextAttemptAt': now() } });
  const batch = await SeoPage.find({ 'indexNow.state': 'pending', 'indexNow.nextAttemptAt': { $lte: now() } }, { path: 1, live: 1, hash: 1, 'indexNow.attempts': 1 })
    .sort({ 'indexNow.nextAttemptAt': 1 }).limit(BATCH_MAX).lean();
  if (!batch.length) return null;
  if (!await checkKeyFile(s, key)) {
    await SeoPage.updateMany({ _id: { $in: batch.map((p) => p._id) } }, { $set: { 'indexNow.nextAttemptAt': new Date(now().getTime() + 3600 * 1000), 'indexNow.lastError': 'Fichier de clé IndexNow introuvable en ligne' } });
    return null;
  }

  // Contrôle de la mise en ligne réelle.
  const removals = batch.filter((page) => !page.live).slice(0, REMOVAL_CHECKS);
  const updates = batch.filter((page) => page.live);
  const sample = [...updates].sort(() => deps.random() - 0.5).slice(0, 5);
  const checks = await pool([...removals, ...sample], 4, async (page) => ({ page, status: await statusOf(toUrl(page.path)) }));
  const unreachable = checks.filter(({ status }) => status === null || status >= 500);
  const wrongUpdate = checks.filter(({ page, status }) => page.live && status !== null && status !== 200);
  if (unreachable.length || wrongUpdate.length) {
    const reason = unreachable.length ? 'Site injoignable pendant la vérification' : `Version en ligne incohérente (${wrongUpdate[0].page.path} : HTTP ${wrongUpdate[0].status})`;
    await postpone(batch, reason);
    await log({ type: 'erreur', source: 'indexnow', message: `${reason} : envoi reporté.`, ok: false, count: batch.length });
    return null;
  }
  // Une « suppression » encore servie en 200 (page devenue noindex, par exemple) reste signalée : le
  // robot la relira et constatera le changement. Seules les erreurs réseau bloquent l'envoi.
  const toSend = [...updates, ...removals];
  const paths = toSend.map((page) => page.path);
  const sentAt = now();
  await SeoPage.updateMany({ _id: { $in: toSend.map((p) => p._id) } }, { $set: { 'indexNow.state': 'sent', 'indexNow.lastAttemptAt': sentAt } });

  const site = new URL(config.siteUrl());
  const started = Date.now();
  let res;
  try {
    res = await request(config.indexNowEndpoint(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ host: site.host, key, keyLocation: `${site.origin}/${key}.txt`, urlList: paths.map(toUrl) }),
    });
  } catch (error) {
    const reason = networkError(error);
    await postpone(toSend, `IndexNow injoignable (${reason})`);
    await log({ type: 'indexnow', message: `IndexNow injoignable (${reason}) : nouvel essai programmé.`, ok: false, count: paths.length, urls: paths, durationMs: Date.now() - started });
    return { status: null, count: paths.length };
  }
  const { status } = res;
  const durationMs = Date.now() - started;
  if (status === 200 || status === 202) {
    await Promise.all(toSend.map((page) => SeoPage.updateOne({ _id: page._id, 'indexNow.state': 'sent' }, { $inc: { 'indexNow.attempts': 1 }, $set: {
      'indexNow.state': 'accepted', 'indexNow.acceptedAt': now(), 'indexNow.acceptedHash': page.hash, 'indexNow.lastStatus': status, 'indexNow.lastError': null, 'indexNow.nextAttemptAt': null,
    } })));
    await log({ type: 'indexnow', message: status === 200 ? 'Notification reçue par IndexNow (200).' : 'Notification reçue par IndexNow, clé en cours de vérification (202).', status, ok: true, count: paths.length, urls: paths, durationMs });
    if (status === 200) await SeoState.updateOne({ _id: 'main' }, { $set: { keyValid: true } });
  } else if (status === 429 || status >= 500) {
    const wait = retryAfter(res);
    await postpone(toSend, status === 429 ? 'Trop de requêtes (429)' : `Erreur du service (HTTP ${status})`, status, wait);
    if (status === 429) await SeoState.updateOne({ _id: 'main' }, { $set: { indexNowPausedUntil: new Date(now().getTime() + (wait || backoffMs(1))) } });
    await log({ type: 'indexnow', message: `IndexNow indisponible (HTTP ${status}) : nouvel essai programmé.`, status, ok: false, count: paths.length, urls: paths, durationMs });
  } else {
    // 400 format, 403 clé, 422 URL hors domaine ou liste invalide : à corriger, puis relancer.
    const reasons = { 400: 'Requête invalide (400)', 403: 'Clé IndexNow refusée (403)', 422: 'URL refusées (422)' };
    await SeoPage.updateMany({ path: { $in: paths } }, { $inc: { 'indexNow.attempts': 1 }, $set: { 'indexNow.state': 'failed', 'indexNow.lastStatus': status, 'indexNow.lastError': reasons[status] || `HTTP ${status}`, 'indexNow.nextAttemptAt': null } });
    if (status === 403) await SeoState.updateOne({ _id: 'main' }, { $set: { keyValid: false } });
    await log({ type: 'indexnow', message: `IndexNow a refusé l'envoi : ${reasons[status] || `HTTP ${status}`}.`, status, ok: false, count: paths.length, urls: paths, durationMs });
  }
  return { status, count: paths.length };
};

// ── 4. Google Search Console ──────────────────────────────────────────────────────────────

// Chaque tâche Google est indépendante : l'échec de l'une (sitemap inconnu…) n'empêche pas les autres.
const googleTask = async (s, name, fn) => {
  try {
    await fn();
    return true;
  } catch (error) {
    const message = `${name} : ${error.message}`.slice(0, 300);
    await SeoState.updateOne({ _id: 'main' }, { $set: { googleError: message } });
    if (message !== s.googleError) await log({ type: 'erreur', source: 'google', message, ok: false });
    return false;
  }
};

const googleTasks = async (s) => {
  if (!google.configured()) return;
  if (s.sitemapSubmitNeeded && (!s.sitemapSubmittedAt || now() - s.sitemapSubmittedAt > 24 * 3600 * 1000)) {
    await googleTask(s, 'Soumission du sitemap', async () => {
      await google.submitSitemap();
      await SeoState.updateOne({ _id: 'main' }, { $set: { sitemapSubmittedAt: now(), sitemapSubmitNeeded: false } });
      await log({ type: 'google', message: 'Index de sitemaps soumis à Search Console (nouvelles URL).', ok: true });
    });
  }
  if (!s.googleCheckedAt || now() - s.googleCheckedAt > 6 * 3600 * 1000) {
    await googleTask(s, 'État du sitemap', async () => {
      await SeoState.updateOne({ _id: 'main' }, { $set: { googleCheckedAt: now() } });
      const status = await google.getSitemap();
      await SeoState.updateOne({ _id: 'main' }, { $set: { googleSitemapStatus: status, googleError: null } });
    });
  }
  const due = await SeoPage.find({ live: true, 'google.dueAt': { $lte: now() } }, { path: 1 }).sort({ 'google.dueAt': 1 }).limit(5).lean();
  for (const page of due) {
    if (!await googleTask(s, 'Inspection', () => inspectPath(page.path))) break;
  }
};

/** Réserve atomiquement une inspection dans le quota du jour (sûr entre passages et instances). */
const reserveInspection = async () => {
  const today = day(now());
  await SeoState.updateOne({ _id: 'main', inspectionDay: { $ne: today } }, { $set: { inspectionDay: today, inspectionsToday: 0 } });
  const res = await SeoState.updateOne({ _id: 'main', inspectionDay: today, inspectionsToday: { $lt: config.inspectionsPerDay() } }, { $inc: { inspectionsToday: 1 } });
  return res.modifiedCount === 1;
};

const inspectPath = async (path) => {
  if (!await reserveInspection()) throw new Error('Quota quotidien d’inspections atteint');
  try {
    const result = await google.inspectUrl(toUrl(path));
    await SeoPage.updateOne({ path }, { $set: { google: { ...result, checkedAt: now(), dueAt: null, error: null } } });
    return result;
  } catch (error) {
    await SeoPage.updateOne({ path }, { $set: { 'google.error': error.message, 'google.checkedAt': now(), 'google.dueAt': new Date(now().getTime() + 86400000) } });
    throw error;
  }
};

// ── Worker ────────────────────────────────────────────────────────────────────────────────

// Un propriétaire par passage (pas par processus) : le worker et une action d'administration du même
// serveur ne peuvent pas tenir le verrou en même temps.
const acquireLock = async (owner) => {
  await state();
  const at = now();
  const res = await SeoState.updateOne(
    { _id: 'main', $or: [{ lockUntil: null }, { lockUntil: { $lt: at } }] },
    { $set: { lockOwner: owner, lockUntil: new Date(at.getTime() + LOCK_MS) } },
  );
  return res.modifiedCount === 1;
};
/** Prolonge le bail entre deux étapes ; s'il a été perdu, le passage s'arrête sans rien écrire de plus. */
const renewLock = async (owner) => {
  const res = await SeoState.updateOne({ _id: 'main', lockOwner: owner, lockUntil: { $gt: now() } }, { $set: { lockUntil: new Date(now().getTime() + LOCK_MS) } });
  if (res.matchedCount !== 1) throw new Error('Verrou du service d’indexation perdu : passage interrompu');
};
const releaseLock = (owner) => SeoState.updateOne({ _id: 'main', lockOwner: owner }, { $set: { lockUntil: null, lockOwner: null } });

/** Un passage complet. Renvoie false si une autre instance détient le verrou. */
const tick = async (options = {}) => {
  passSeq += 1;
  const owner = `${INSTANCE}-${passSeq}`;
  if (!await acquireLock(owner)) return false;
  try {
    let s = await state();
    await maybeRebuild(s, { force: options.forceRebuild });
    await renewLock(owner);
    s = await state();
    await checkLiveBuild(s, { force: options.forceCheck, approvedRemovals: options.approvedRemovals });
    await renewLock(owner);
    s = await state();
    await processQueue(s);
    await renewLock(owner);
    s = await state();
    await googleTasks(s);
    return true;
  } finally {
    await releaseLock(owner);
  }
};

let timer = null;
let running = false;
const start = () => {
  if (timer || !config.enabled()) return;
  const run = async () => {
    if (running) return;
    running = true;
    try { await tick(); } catch (error) { console.error(`[SEO] ${error.message}`); } finally { running = false; }
  };
  timer = setInterval(run, config.tickMs());
  timer.unref?.();
  setTimeout(run, 15000).unref?.();
  console.log('[SEO] Service d’indexation démarré.');
};
const stop = () => { if (timer) clearInterval(timer); timer = null; };

// ── Administration ────────────────────────────────────────────────────────────────────────

/**
 * Soumission manuelle : uniquement une URL connue du manifeste en ligne (ou retirée), jamais une URL
 * arbitraire. Refusée si la même version de la page a déjà été acceptée dans l'heure.
 */
const queueManual = async (input) => {
  const path = toPath(input);
  if (!path) return { ok: false, code: 'url_refusee', message: 'Adresse refusée : seules les pages publiques de Fatafalta sont acceptées.' };
  const page = await SeoPage.findOne({ path }).lean();
  if (!page) return { ok: false, code: 'url_inconnue', message: 'Cette page ne figure pas dans la version en ligne du site.' };
  const recent = page.indexNow?.state === 'accepted' && page.indexNow.acceptedHash === page.hash && now() - page.indexNow.acceptedAt < 3600 * 1000;
  if (recent) return { ok: false, code: 'deja_envoyee', message: 'Cette version de la page a déjà été signalée il y a moins d’une heure.' };
  if (page.indexNow?.state === 'pending' || page.indexNow?.state === 'sent') return { ok: true, message: 'Déjà dans la file d’envoi.', path };
  await SeoPage.updateOne({ path }, { $set: { 'indexNow.state': 'pending', 'indexNow.nextAttemptAt': now(), 'indexNow.attempts': 0, 'indexNow.lastError': null, 'indexNow.source': 'manuel' } });
  await log({ type: 'action', source: 'administration', message: `Soumission manuelle de ${path}.`, urls: [path] });
  return { ok: true, message: 'Ajoutée à la file : envoi à la prochaine minute.', path };
};

const retryFailed = async () => {
  const res = await SeoPage.updateMany({ 'indexNow.state': 'failed' }, { $set: { 'indexNow.state': 'pending', 'indexNow.nextAttemptAt': now(), 'indexNow.attempts': 0, 'indexNow.lastError': null } });
  await SeoState.updateOne({ _id: 'main' }, { $set: { indexNowPausedUntil: null, keyCheckedAt: null } });
  await log({ type: 'action', source: 'administration', message: `${res.modifiedCount} envoi(s) en échec relancé(s).`, count: res.modifiedCount });
  return res.modifiedCount;
};

const requestRebuild = async () => {
  await recordChange({ source: 'administration', message: 'Régénération des sitemaps demandée.' });
  await SeoState.updateOne({ _id: 'main' }, { $set: { dirtySince: new Date(0) } });
};

const counts = async () => {
  const [byState, indexable, live, removed, googleIndexed, googleCrawled] = await Promise.all([
    SeoPage.aggregate([{ $group: { _id: '$indexNow.state', n: { $sum: 1 } } }]),
    SeoPage.countDocuments({ live: true, inSitemap: true }),
    SeoPage.countDocuments({ live: true }),
    SeoPage.countDocuments({ live: false }),
    SeoPage.countDocuments({ live: true, 'google.verdict': 'PASS' }),
    SeoPage.countDocuments({ live: true, 'google.lastCrawlTime': { $ne: null } }),
  ]);
  const states = Object.fromEntries(byState.map(({ _id, n }) => [_id || 'aucun', n]));
  return { indexable, live, removed, pending: states.pending || 0, sent: states.sent || 0, accepted: states.accepted || 0, failed: states.failed || 0, googleIndexed, googleCrawled };
};

const overview = async () => {
  const s = await state();
  const [totals, logs, lastSuccess, lastFailure] = await Promise.all([
    counts(),
    SeoLog.find({}, { urls: 0, expiresAt: 0 }).sort({ at: -1 }).limit(60).lean(),
    SeoLog.findOne({ type: 'indexnow', ok: true }).sort({ at: -1 }).lean(),
    SeoLog.findOne({ type: 'indexnow', ok: false }).sort({ at: -1 }).lean(),
  ]);
  const okCount = await SeoLog.countDocuments({ type: 'indexnow', ok: true, at: { $gte: new Date(now().getTime() - 30 * 86400000) } });
  const koCount = await SeoLog.countDocuments({ type: 'indexnow', ok: false, at: { $gte: new Date(now().getTime() - 30 * 86400000) } });
  return {
    totals,
    submissions30d: { ok: okCount, failed: koCount, lastSuccessAt: lastSuccess?.at || null, lastFailureAt: lastFailure?.at || null },
    configuration: { site: config.siteUrl(), deployHook: Boolean(config.deployHook()), indexNowKey: Boolean(config.indexNowKey()), google: google.configured() },
    build: { buildId: s.buildId, builtAt: s.builtAt, commit: s.commit, lastCheckAt: s.lastBuildCheckAt, error: s.lastBuildError },
    rebuild: { pendingSince: s.dirtySince, requestedAt: s.rebuildRequestedAt, inFlight: rebuildInFlight(s), today: s.rebuildDay === day(now()) ? s.rebuildsToday : 0, maxPerDay: config.maxRebuildsPerDay(), error: s.lastRebuildError },
    indexNow: { keyValid: s.keyValid, keyCheckedAt: s.keyCheckedAt, pausedUntil: s.indexNowPausedUntil },
    google: { sitemap: s.googleSitemapStatus, submittedAt: s.sitemapSubmittedAt, checkedAt: s.googleCheckedAt, error: s.googleError, inspectionsToday: s.inspectionDay === day(now()) ? s.inspectionsToday : 0, inspectionsPerDay: config.inspectionsPerDay() },
    pendingReview: s.pendingReview?.buildId ? s.pendingReview : null,
    logs,
  };
};

const PAGE_FILTERS = {
  pending: { 'indexNow.state': { $in: ['pending', 'sent'] } },
  accepted: { 'indexNow.state': 'accepted' },
  failed: { 'indexNow.state': 'failed' },
  removed: { live: false },
  changed: { changedAt: { $ne: null } },
  indexed: { 'google.verdict': 'PASS' },
};

const listPages = async ({ filter, q, page = 1 } = {}) => {
  const query = { ...(PAGE_FILTERS[filter] || {}) };
  if (typeof q === 'string' && q.trim()) query.path = { $regex: q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&').slice(0, 100), $options: 'i' };
  const limit = 50;
  const skip = (Math.max(1, Number(page) || 1) - 1) * limit;
  const [items, total] = await Promise.all([
    SeoPage.find(query).sort({ changedAt: -1, path: 1 }).skip(skip).limit(limit).lean(),
    SeoPage.countDocuments(query),
  ]);
  return { items: items.map((item) => ({ ...item, url: toUrl(item.path) })), total, page: Math.max(1, Number(page) || 1), pages: Math.ceil(total / limit) };
};

const csv = (value) => {
  const text = value == null ? '' : value instanceof Date ? value.toISOString() : String(value);
  return /[",\n;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const report = async () => {
  const header = ['url', 'categorie', 'en_ligne', 'dans_sitemap', 'lastmod', 'changement', 'date_changement', 'indexnow_etat', 'indexnow_http', 'indexnow_acceptee_le', 'indexnow_erreur', 'google_verdict', 'google_couverture', 'google_derniere_exploration', 'google_inspectee_le'];
  const rows = [header.join(',')];
  const cursor = SeoPage.find({}).sort({ path: 1 }).lean().cursor();
  for await (const p of cursor) {
    rows.push([toUrl(p.path), p.category, p.live, p.inSitemap, p.lastmod, p.changeType, p.changedAt, p.indexNow?.state, p.indexNow?.lastStatus, p.indexNow?.acceptedAt, p.indexNow?.lastError, p.google?.verdict, p.google?.coverageState, p.google?.lastCrawlTime, p.google?.checkedAt].map(csv).join(','));
  }
  return `${rows.join('\n')}\n`;
};

module.exports = {
  recordChange, tick, start, stop, setDeps, overview, listPages, report, queueManual, retryFailed,
  requestRebuild, inspectPath, reconcile, processQueue, checkLiveBuild, maybeRebuild,
  submitSitemapNow: async () => {
    await google.submitSitemap();
    await SeoState.updateOne({ _id: 'main' }, { $set: { sitemapSubmittedAt: now(), sitemapSubmitNeeded: false } });
    await log({ type: 'google', source: 'administration', message: 'Index de sitemaps soumis à Search Console.', ok: true });
  },
};
