/**
 * Indexation automatique : événements → reconstruction → version en ligne → IndexNow / Google.
 * Le site, le hook Cloudflare et IndexNow sont simulés (aucun appel réseau) ; l'horloge est pilotée.
 *   TEST_MONGODB_URI=mongodb://127.0.0.1:27017/fatafalta-test node --require ./tests/helpers/testEnvironment.cjs --test tests/seoIndexing.integration.test.js
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const uri = process.env.TEST_MONGODB_URI;
const skip = !uri && 'TEST_MONGODB_URI non defini';

const KEY = '0123456789abcdef0123';
const SITE = 'https://fatafalta.com';
let indexing; let SeoPage; let SeoState; let SeoLog;

// ── Monde simulé ─────────────────────────────────────────────────────────────────────────
let clock = new Date('2026-12-01T08:00:00Z');
const advance = (ms) => { clock = new Date(clock.getTime() + ms); };
const MIN = 60 * 1000;

const world = {
  build: null, manifest: null, key: KEY, statusOverride: new Map(), siteDown: false, mismatch: false,
  hookCalls: 0, hookStatus: 200, indexNowCalls: [], indexNowReplies: [], deployOnHook: null,
};
let buildSeq = 0;
const deploy = (pages, { complete = true, fp = 1 } = {}) => {
  buildSeq += 1;
  const buildId = `b${buildSeq}`;
  const builtAt = clock.toISOString();
  world.manifest = { version: 1, fp, complete, buildId, builtAt, site: SITE, pages };
  world.build = { version: 1, fp, complete, buildId, builtAt, pages: Object.keys(pages).length };
};
const page = (h, extra = {}) => ({ h, m: '2026-11-01T00:00:00.000Z', c: 'sujets', ...extra });

const reply = (status, body = '', headers = {}) => new Response(typeof body === 'string' ? body : JSON.stringify(body), { status, headers });
const fakeFetch = async (input, options = {}) => {
  const url = new URL(input);
  if (url.host === 'hooks.example') {
    world.hookCalls += 1;
    if (world.hookStatus === 200 && world.deployOnHook) { world.deployOnHook(); world.deployOnHook = null; }
    return reply(world.hookStatus);
  }
  if (url.host === 'api.indexnow.org') {
    world.indexNowCalls.push(JSON.parse(options.body));
    const next = world.indexNowReplies.shift() || { status: 200 };
    if (next.throws) throw new Error('timeout');
    return reply(next.status, '', next.headers || {});
  }
  if (world.siteDown) throw new Error('ECONNREFUSED');
  if (url.pathname === '/seo-build.json') return world.build ? reply(200, world.build) : reply(404);
  if (url.pathname === '/seo-manifest.json') {
    if (!world.manifest) return reply(404);
    return reply(200, world.mismatch ? { ...world.manifest, buildId: 'autre' } : world.manifest);
  }
  if (url.pathname === `/${KEY}.txt`) return reply(200, world.key);
  if (world.statusOverride.has(url.pathname)) return reply(world.statusOverride.get(url.pathname));
  return reply(world.manifest?.pages[url.pathname] ? 200 : 404);
};

const lastSubmitted = () => world.indexNowCalls.at(-1)?.urlList.map((u) => u.replace(SITE, '')) || [];
const stateOf = async (path) => (await SeoPage.findOne({ path }).lean())?.indexNow?.state;

test.before(async () => {
  if (skip) return;
  Object.assign(process.env, { INDEXNOW_KEY: KEY, FRONTEND_DEPLOY_HOOK_URL: 'https://hooks.example/deploy', SITE_URL: SITE });
  await mongoose.connect(uri);
  await mongoose.connection.dropDatabase();
  indexing = require('../services/seo/indexingService');
  SeoPage = require('../models/SeoPage');
  SeoState = require('../models/SeoState');
  SeoLog = require('../models/SeoLog');
  await Promise.all([SeoPage.syncIndexes(), SeoLog.syncIndexes()]);
  indexing.setDeps({ fetch: fakeFetch, now: () => new Date(clock), random: () => 0.5 });
});
test.after(async () => {
  if (skip) return;
  for (const name of ['INDEXNOW_KEY', 'FRONTEND_DEPLOY_HOOK_URL', 'SITE_URL']) delete process.env[name];
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

const BASE = {
  '/': page('h-home', { c: 'pages' }),
  '/sujets': page('h-root', { c: 'pages' }),
  '/sujets/ensea': page('h-ensea', { c: 'concours' }),
  '/sujets/ensea/2024': page('h-ensea-2024', { c: 'concours' }),
  '/sujets/document/d1': page('h-d1'),
  '/sujets/document/d2': page('h-d2'),
  '/conditions-utilisation': page('h-cgu', { c: 'pages' }),
};

test('première version : simple référence, aucune notification', { skip }, async () => {
  deploy({ ...BASE });
  await indexing.tick({ forceCheck: true });
  assert.equal(await SeoPage.countDocuments({ live: true }), 7);
  assert.equal(world.indexNowCalls.length, 0);
  assert.equal(await SeoPage.countDocuments({ 'indexNow.state': { $ne: null } }), 0);
});

test('1. ajout d’un sujet : regroupement, reconstruction, notification une fois la page en ligne', { skip }, async () => {
  await indexing.recordChange({ source: 'sujet', ids: ['d3'] });
  await indexing.tick();
  assert.equal(world.hookCalls, 0, 'reconstruction différée (regroupement)');
  advance(10 * MIN);
  // La reconstruction ne sera en ligne qu'après le hook : rien n'est signalé avant.
  world.deployOnHook = () => deploy({ ...BASE, '/sujets/document/d3': page('h-d3'), '/sujets/ensea/2024': page('h-ensea-2024-v2', { c: 'concours' }), '/sujets/ensea': page('h-ensea-v2', { c: 'concours' }) });
  await indexing.tick();
  assert.equal(world.hookCalls, 1);
  assert.deepEqual(lastSubmitted().sort(), ['/sujets/document/d3', '/sujets/ensea', '/sujets/ensea/2024'], 'fiche et pages parentes réellement modifiées, rien d’autre');
  assert.equal(world.indexNowCalls[0].keyLocation, `${SITE}/${KEY}.txt`);
  assert.equal(world.indexNowCalls[0].host, 'fatafalta.com');
  assert.equal(await stateOf('/sujets/document/d3'), 'accepted');
  const d3 = await SeoPage.findOne({ path: '/sujets/document/d3' }).lean();
  assert.ok(d3.google.dueAt > clock, 'inspection Google programmée plus tard');
});

test('2. modification d’un sujet : seule la page dont le contenu change est signalée', { skip }, async () => {
  await indexing.recordChange({ source: 'sujet', ids: ['d1'] });
  advance(10 * MIN);
  world.deployOnHook = () => deploy({ ...world.manifest.pages, '/sujets/document/d1': page('h-d1-v2') });
  const calls = world.indexNowCalls.length;
  await indexing.tick();
  assert.equal(world.indexNowCalls.length, calls + 1);
  assert.deepEqual(lastSubmitted(), ['/sujets/document/d1']);
});

test('2b. changement sans incidence sur le HTML (compteur, donnée privée) : aucune notification', { skip }, async () => {
  await indexing.recordChange({ source: 'sujet', ids: ['d2'] });
  advance(10 * MIN);
  world.deployOnHook = () => deploy({ ...world.manifest.pages });
  const calls = world.indexNowCalls.length;
  await indexing.tick();
  assert.equal(world.indexNowCalls.length, calls, 'empreintes identiques');
});

test('3. suppression d’un sujet : URL retirée, vérifiée en 404, signalée', { skip }, async () => {
  await indexing.recordChange({ source: 'sujet', ids: ['d2'] });
  advance(10 * MIN);
  world.deployOnHook = () => { const pages = { ...world.manifest.pages }; delete pages['/sujets/document/d2']; deploy(pages); };
  await indexing.tick();
  assert.deepEqual(lastSubmitted(), ['/sujets/document/d2']);
  const d2 = await SeoPage.findOne({ path: '/sujets/document/d2' }).lean();
  assert.equal(d2.live, false);
  assert.equal(d2.changeType, 'suppression');
  assert.equal(d2.indexNow.state, 'accepted');
});

test('4. ajout massif de 1 000 sujets : 1 reconstruction, 1 requête IndexNow, coût mesuré', { skip }, async () => {
  const hooks = world.hookCalls;
  const calls = world.indexNowCalls.length;
  const cpu0 = process.cpuUsage();
  const t0 = performance.now();
  for (let i = 0; i < 1000; i += 1) await indexing.recordChange({ source: 'import', ids: [`m${i}`] });
  const recordMs = performance.now() - t0;
  advance(10 * MIN);
  const pages = { ...world.manifest.pages };
  for (let i = 0; i < 1000; i += 1) pages[`/sujets/document/m${i}`] = page(`h-m${i}`);
  world.deployOnHook = () => deploy(pages);
  const heap0 = process.memoryUsage().heapUsed;
  const t1 = performance.now();
  await indexing.tick();
  const tickMs = performance.now() - t1;
  const cpu = process.cpuUsage(cpu0);
  const heapMb = (process.memoryUsage().heapUsed - heap0) / 1048576;
  assert.equal(world.hookCalls, hooks + 1, 'une seule reconstruction');
  assert.equal(world.indexNowCalls.length, calls + 1, 'un seul envoi');
  assert.equal(lastSubmitted().length, 1000);
  assert.equal(await SeoPage.countDocuments({ 'indexNow.state': 'accepted', path: /^\/sujets\/document\/m/ }), 1000);
  console.log(`[mesure] 1 000 événements : ${Math.round(recordMs)} ms (${(recordMs / 1000).toFixed(2)} ms/événement) ; passage complet (diff + envoi de 1 000 URL) : ${Math.round(tickMs)} ms ; CPU total ${Math.round((cpu.user + cpu.system) / 1000)} ms ; tas +${heapMb.toFixed(1)} Mo`);
  assert.ok(recordMs / 1000 < 20, 'consignation d’un événement < 20 ms');
});

test('5-6. déploiement du site sans événement (git push, page légale modifiée) : capté par la lecture périodique', { skip }, async () => {
  deploy({ ...world.manifest.pages, '/conditions-utilisation': page('h-cgu-v2', { c: 'pages' }) });
  const calls = world.indexNowCalls.length;
  advance(5 * MIN);
  await indexing.tick();
  assert.equal(world.indexNowCalls.length, calls, 'pas encore relu (toutes les 15 min)');
  advance(15 * MIN);
  await indexing.tick();
  assert.deepEqual(lastSubmitted(), ['/conditions-utilisation']);
});

test('7. IndexNow indisponible (503, délai, 429 + Retry-After) : réessais espacés puis succès', { skip }, async () => {
  deploy({ ...world.manifest.pages, '/sujets/document/d1': page('h-d1-v3') });
  world.indexNowReplies.push({ status: 503 }, { throws: true }, { status: 429, headers: { 'Retry-After': '600' } }, { status: 200 });
  const start = world.indexNowCalls.length;
  advance(16 * MIN);
  await indexing.tick();
  let d1 = await SeoPage.findOne({ path: '/sujets/document/d1' }).lean();
  assert.equal(d1.indexNow.state, 'pending');
  assert.match(d1.indexNow.lastError, /503/);
  const firstRetry = d1.indexNow.nextAttemptAt - clock;
  assert.ok(firstRetry >= 90 * 1000 && firstRetry <= 150 * 1000, `premier réessai ~2 min (${firstRetry} ms)`);
  await indexing.tick();
  assert.equal(world.indexNowCalls.length - start, 1, 'pas de réessai avant l’échéance');
  advance(3 * MIN);
  await indexing.tick(); // délai dépassé (timeout)
  d1 = await SeoPage.findOne({ path: '/sujets/document/d1' }).lean();
  assert.match(d1.indexNow.lastError, /injoignable/);
  advance(10 * MIN);
  await indexing.tick(); // 429
  d1 = await SeoPage.findOne({ path: '/sujets/document/d1' }).lean();
  assert.equal(d1.indexNow.lastStatus, 429);
  assert.equal(d1.indexNow.nextAttemptAt - clock, 600 * 1000, 'Retry-After respecté');
  advance(11 * MIN);
  await indexing.tick();
  assert.equal(await stateOf('/sujets/document/d1'), 'accepted');
});

test('7b. refus définitif (403 clé) : échec visible, relançable depuis l’administration', { skip }, async () => {
  deploy({ ...world.manifest.pages, '/sujets/document/d1': page('h-d1-v4') });
  world.indexNowReplies.push({ status: 403 });
  advance(16 * MIN);
  await indexing.tick();
  assert.equal(await stateOf('/sujets/document/d1'), 'failed');
  assert.equal((await SeoState.findById('main').lean()).keyValid, false);
  assert.equal(await indexing.retryFailed(), 1);
  await indexing.tick();
  assert.equal(await stateOf('/sujets/document/d1'), 'accepted');
});

test('8. redémarrage pendant l’envoi : un envoi resté « sent » est rejoué', { skip }, async () => {
  await SeoPage.updateOne({ path: '/sujets/document/d1' }, { $set: { 'indexNow.state': 'sent', 'indexNow.lastAttemptAt': clock } });
  // Verrou laissé par l'instance arrêtée : expire au bout de 5 min.
  await SeoState.updateOne({ _id: 'main' }, { $set: { lockOwner: 'ancienne-instance', lockUntil: new Date(clock.getTime() + 5 * MIN) } });
  assert.equal(await indexing.tick(), false, 'verrou d’une autre instance respecté');
  advance(11 * MIN);
  const calls = world.indexNowCalls.length;
  assert.equal(await indexing.tick(), true);
  assert.equal(world.indexNowCalls.length, calls + 1);
  assert.equal(await stateOf('/sujets/document/d1'), 'accepted');
});

test('9. soumissions répétées : une seule URL par lot, refus d’un renvoi immédiat', { skip }, async () => {
  for (let i = 0; i < 3; i += 1) await indexing.recordChange({ source: 'sujet', ids: ['d1'] });
  advance(10 * MIN);
  world.deployOnHook = () => deploy({ ...world.manifest.pages, '/sujets/document/d1': page('h-d1-v5') });
  await indexing.tick();
  assert.deepEqual(lastSubmitted(), ['/sujets/document/d1'], 'dédoublonnée');
  const again = await indexing.queueManual(`${SITE}/sujets/document/d1`);
  assert.equal(again.ok, false);
  assert.equal(again.code, 'deja_envoyee');
  advance(61 * MIN);
  assert.equal((await indexing.queueManual(`${SITE}/sujets/document/d1`)).ok, true);
  assert.equal((await indexing.queueManual(`${SITE}/sujets/document/d1`)).message, 'Déjà dans la file d’envoi.');
});

test('10. URL privée, étrangère ou inconnue : jamais soumise', { skip }, async () => {
  for (const url of [`${SITE}/compte`, `${SITE}/dashboard`, `${SITE}/api/documents/x/download`, 'https://example.com/x', `${SITE}/sujets/document/d1?token=1`, 'http://fatafalta.com/sujets']) {
    const result = await indexing.queueManual(url);
    assert.equal(result.ok, false, url);
    assert.equal(result.code, 'url_refusee', url);
  }
  assert.equal((await indexing.queueManual(`${SITE}/sujets/nexiste-pas`)).code, 'url_inconnue');
  // Une URL privée glissée dans un manifeste n'est jamais enregistrée.
  deploy({ ...world.manifest.pages, '/compte/profil': page('h-x', { c: 'pages' }) });
  advance(16 * MIN);
  await indexing.tick();
  assert.equal(await SeoPage.countDocuments({ path: '/compte/profil' }), 0);
});

test('11. cohérence en ligne : page annoncée mais non servie → envoi reporté ; versions mélangées → ignorées', { skip }, async () => {
  deploy({ ...world.manifest.pages, '/sujets/document/z1': page('h-z1') });
  world.statusOverride.set('/sujets/document/z1', 404);
  const calls = world.indexNowCalls.length;
  advance(16 * MIN);
  await indexing.tick();
  assert.equal(world.indexNowCalls.length, calls, 'rien envoyé');
  assert.match((await SeoPage.findOne({ path: '/sujets/document/z1' }).lean()).indexNow.lastError, /incohérente/);
  world.statusOverride.delete('/sujets/document/z1');
  advance(5 * MIN);
  await indexing.tick();
  assert.deepEqual(lastSubmitted(), ['/sujets/document/z1']);

  // seo-build.json et seo-manifest.json de deux déploiements différents : aucune conclusion.
  world.mismatch = true;
  deploy({ ...world.manifest.pages, '/sujets/document/z2': page('h-z2') });
  advance(16 * MIN);
  await indexing.tick();
  assert.equal(await SeoPage.countDocuments({ path: '/sujets/document/z2' }), 0);
  world.mismatch = false;
  advance(16 * MIN);
  await indexing.tick();
  assert.equal(await stateOf('/sujets/document/z2'), 'accepted');
});

test('garde-fous : build incomplet et disparition massive ne retirent rien sans confirmation', { skip }, async () => {
  const keep = Object.fromEntries(Object.entries(world.manifest.pages).filter(([p]) => !p.startsWith('/sujets/document/m')));
  deploy(keep, { complete: false });
  advance(16 * MIN);
  await indexing.tick();
  assert.equal(await SeoPage.countDocuments({ live: true, path: /^\/sujets\/document\/m/ }), 1000, 'version incomplète : aucun retrait');

  deploy(keep);
  advance(16 * MIN);
  await indexing.tick();
  assert.equal(await SeoPage.countDocuments({ live: true, path: /^\/sujets\/document\/m/ }), 1000, 'retrait massif suspendu');
  assert.equal((await SeoState.findById('main').lean()).pendingReview.removed, 1000);
  const pending = (await SeoState.findById('main').lean()).pendingReview.buildId;
  await assert.rejects(indexing.tick({ forceCheck: true, approvedRemovals: 'une-autre-version' }), /nouvelle version/);
  assert.equal(await SeoPage.countDocuments({ live: true, path: /^\/sujets\/document\/m/ }), 1000, 'version différente de celle affichée : rien');
  await indexing.tick({ forceCheck: true, approvedRemovals: pending });
  assert.equal(await SeoPage.countDocuments({ live: true, path: /^\/sujets\/document\/m/ }), 0, 'confirmé par l’administrateur');
  assert.equal(lastSubmitted().length, 40, 'suppressions vérifiées par lots de 40 (passage court, sous le bail du verrou)');
  for (let i = 0; i < 30 && await SeoPage.countDocuments({ 'indexNow.state': 'pending' }); i += 1) { advance(MIN); await indexing.tick(); }
  assert.equal(await SeoPage.countDocuments({ path: /^\/sujets\/document\/m/, 'indexNow.state': 'accepted', live: false }), 1000, 'toutes signalées en 25 passages');
});

test('reconstruction : hook en échec journalisé sans fuite, plafond quotidien respecté', { skip }, async () => {
  world.hookStatus = 500;
  await indexing.recordChange({ source: 'sujet' });
  advance(11 * MIN);
  await indexing.tick();
  const error = await SeoLog.findOne({ type: 'erreur', source: 'reconstruction' }).sort({ at: -1 }).lean();
  assert.match(error.message, /HTTP 500/);
  assert.ok(!error.message.includes('hooks.example'), 'URL secrète jamais journalisée');
  world.hookStatus = 200;
  await SeoState.updateOne({ _id: 'main' }, { $set: { rebuildDay: clock.toISOString().slice(0, 10), rebuildsToday: 10, rebuildRequestedAt: null } });
  const before = world.hookCalls;
  advance(1 * MIN);
  await indexing.tick();
  assert.equal(world.hookCalls, before, 'plafond atteint');
  await indexing.tick({ forceRebuild: true });
  assert.equal(world.hookCalls, before + 1, 'l’administrateur peut forcer');
});

test('audit : deux passages simultanés du même serveur ne tiennent jamais le verrou ensemble', { skip }, async () => {
  const results = await Promise.all([indexing.tick(), indexing.tick(), indexing.tick()]);
  assert.equal(results.filter(Boolean).length, 1);
});

test('audit : hook accepté mais build échoué chez Cloudflare → redemandé après le délai', { skip }, async () => {
  await SeoState.updateOne({ _id: 'main' }, { $set: { rebuildsToday: 0, rebuildRequestedAt: null, dirtySince: null } });
  await indexing.recordChange({ source: 'sujet' });
  advance(11 * MIN);
  const before = world.hookCalls;
  await indexing.tick(); // hook accepté, aucun déploiement ne suit
  assert.equal(world.hookCalls, before + 1);
  assert.ok((await SeoState.findById('main').lean()).dirtySince, 'changements toujours en attente');
  advance(20 * MIN);
  await indexing.tick();
  assert.equal(world.hookCalls, before + 1, 'build encore attendu');
  advance(30 * MIN);
  world.deployOnHook = () => deploy({ ...world.manifest.pages });
  await indexing.tick();
  assert.equal(world.hookCalls, before + 2, 'redemandé après SEO_REBUILD_TIMEOUT_MS');
  assert.equal((await SeoState.findById('main').lean()).dirtySince, null, 'effacé une fois la version en ligne');
});

test('audit : tentatives comptées par URL (une URL neuve n’hérite pas de l’épuisement d’une autre)', { skip }, async () => {
  await SeoPage.updateOne({ path: '/sujets/document/d1' }, { $set: { 'indexNow.state': 'pending', 'indexNow.nextAttemptAt': clock, 'indexNow.attempts': 7 } });
  await SeoPage.updateOne({ path: '/sujets/document/d3' }, { $set: { 'indexNow.state': 'pending', 'indexNow.nextAttemptAt': clock, 'indexNow.attempts': 0 } });
  world.indexNowReplies.push({ status: 503 });
  advance(1 * MIN);
  await indexing.tick();
  assert.equal(await stateOf('/sujets/document/d1'), 'failed', '8e essai : abandon');
  assert.equal(await stateOf('/sujets/document/d3'), 'pending', '1er essai : réessai');
  await SeoPage.updateOne({ path: '/sujets/document/d3' }, { $set: { 'indexNow.nextAttemptAt': clock } });
  await indexing.tick();
  assert.equal(await stateOf('/sujets/document/d3'), 'accepted');
});

test('audit : une URL de hook invalide n’apparaît jamais dans le journal', { skip }, async () => {
  const secret = 'https://hooks.example/deploy/SECRET-TOKEN-123';
  const original = process.env.FRONTEND_DEPLOY_HOOK_URL;
  process.env.FRONTEND_DEPLOY_HOOK_URL = secret;
  indexing.setDeps({ fetch: async (input, options) => {
    if (String(input).includes('SECRET')) throw new TypeError(`Failed to parse URL from ${input}`);
    return fakeFetch(input, options);
  } });
  try {
    await SeoState.updateOne({ _id: 'main' }, { $set: { rebuildRequestedAt: null } });
    await indexing.recordChange({ source: 'sujet' });
    advance(11 * MIN);
    await indexing.tick();
    const logs = JSON.stringify(await SeoLog.find({}).lean()) + JSON.stringify(await indexing.overview());
    assert.ok(!logs.includes('SECRET-TOKEN'), 'secret absent');
    assert.match(JSON.stringify(await SeoLog.findOne({ source: 'reconstruction', ok: false }).sort({ at: -1 }).lean()), /adresse invalide/);
  } finally {
    process.env.FRONTEND_DEPLOY_HOOK_URL = original;
    indexing.setDeps({ fetch: fakeFetch });
  }
});

test('administration : routes réservées, tableau de bord et rapport', { skip }, async () => {
  const server = require('../server').listen(0);
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    for (const [method, path] of [['GET', '/api/admin/seo'], ['POST', '/api/admin/seo/indexnow'], ['GET', '/api/admin/seo/rapport.csv'], ['POST', '/api/admin/seo/reconstruction']]) {
      const res = await fetch(`${base}${path}`, { method });
      assert.equal(res.status, 401, `${method} ${path}`);
    }
  } finally {
    server.close();
  }
  const overview = await indexing.overview();
  assert.ok(overview.totals.indexable > 0);
  assert.equal(typeof overview.configuration.deployHook, 'boolean');
  assert.ok(!JSON.stringify(overview).includes('hooks.example') && !JSON.stringify(overview).includes(KEY), 'aucun secret exposé');
  const csv = await indexing.report();
  assert.match(csv.split('\n')[0], /^url,categorie,en_ligne/);
  assert.ok(csv.includes(`${SITE}/sujets/document/d1,`));
});
