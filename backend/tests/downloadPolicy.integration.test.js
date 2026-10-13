/**
 * Politique de téléchargement : gratuité <= 2010, abonnement, quotas glissants, téléchargement
 * groupé (ZIP et liens mobiles), un seul cycle par opération, logos, recherche « corrigé ».
 *   TEST_MONGODB_URI=mongodb://127.0.0.1:27017/fatafalta-downloads-test node --test tests/downloadPolicy.integration.test.js
 * Ignoré sans TEST_MONGODB_URI (ne touche jamais la base de dev/prod). Stockage simulé localement.
 */
Object.assign(process.env, {
  NODE_ENV: 'test',
  PAYMENT_MODE: 'mock',
  JWT_SECRET: 'downloads-test-access-secret',
  JWT_REFRESH_SECRET: 'downloads-test-refresh-secret',
  TRUST_PROXY: '1',
  TRUST_CF_CONNECTING_IP: 'false',
  CORS_ORIGINS: '',
  PAYMENT_RECONCILE_INTERVAL_SECONDS: '0',
  // Les limiteurs génériques (débit par minute) ne sont pas l'objet de ces tests.
  SEC_DISABLED: 'true',
});

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const mongoose = require('mongoose');

const uri = process.env.TEST_MONGODB_URI;
const skip = !uri && 'TEST_MONGODB_URI non defini';

// ── Stockage simulé : un petit serveur HTTP sert les « fichiers » par clé ─────────────────────
const pdf = (key) => Buffer.from(`%PDF-1.4\n% fichier de test ${key}\n%%EOF\n`);
let storageServer;
let storageBase;
const deleted = [];
const uploaded = new Map();
const fakeStorage = {
  async generateSignedUrl(key) {
    if (key.includes('broken')) throw new Error('stockage indisponible');
    return `${storageBase}/f/${encodeURIComponent(key)}`;
  },
  async upload(key, buffer) { uploaded.set(key, buffer); },
  async delete(key) { deleted.push(key); },
};
const storagePath = require.resolve('../storage');
require.cache[storagePath] = { id: storagePath, filename: storagePath, loaded: true, exports: () => fakeStorage };

const app = require('../server');
const User = require('../models/User');
const Subscription = require('../models/Subscription');
const Organisme = require('../models/Organisme');
const Structure = require('../models/Structure');
const ParcoursType = require('../models/ParcoursType');
const Noeud = require('../models/Noeud');
const Matiere = require('../models/Matiere');
const Document = require('../models/Document');
const DownloadQuota = require('../models/DownloadQuota');
const DownloadBundle = require('../models/DownloadBundle');
const { verifyVisitorToken } = require('../services/access/visitorIdentity');

let httpServer;
let base;
let ipCounter = 10;
const freshIp = () => `10.0.${Math.floor(ipCounter / 250)}.${(ipCounter++ % 250) + 1}`;

const users = {};
const tokens = {};
const docs = {};
const ids = {};

const call = async (path, { method = 'GET', token, visitor, ip = '10.9.9.9', body, raw = false, signal } = {}) => {
  const headers = { 'X-Forwarded-For': ip, Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (visitor) headers['X-Visitor-Token'] = visitor;
  if (body) headers['Content-Type'] = 'application/json';
  const response = await fetch(`${base}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined, signal });
  if (raw) return response;
  const json = await response.json().catch(() => null);
  return { status: response.status, json, headers: response.headers };
};

/** Nouveau visiteur : son jeton est obtenu à la première requête (sans jeton). */
const newVisitor = async (ip = freshIp()) => {
  const { json, headers } = await call('/api/downloads/quota', { ip });
  const visitor = headers.get('x-visitor-token') || json.data.visitorToken;
  assert.ok(verifyVisitorToken(visitor), 'jeton visiteur signé');
  return { visitor, ip };
};

const download = (documentId, who = {}) => call(`/api/documents/${documentId}/download`, who);

const zipEntryNames = (buffer) => {
  const names = [];
  for (let offset = buffer.indexOf('PK\x01\x02'); offset !== -1; offset = buffer.indexOf('PK\x01\x02', offset + 4)) {
    const nameLength = buffer.readUInt16LE(offset + 28);
    names.push(buffer.slice(offset + 46, offset + 46 + nameLength).toString('utf8'));
  }
  return names;
};

const seedSubject = async ({ key, organisme, node, matiere, parcoursType = null, title, extra = {} }) => {
  const document = await Document.create({
    type: 'sujet',
    documentType: 'sujet',
    title,
    titre: title,
    noeudId: node._id,
    matiereId: matiere._id,
    parcoursTypeId: parcoursType?._id || null,
    uploadedBy: users.admin._id,
    file: `${key}.pdf`,
    originalFileName: `${title}.pdf`,
    fileType: 'PDF',
    extension: '.pdf',
    mimeType: 'application/pdf',
    fileSize: 1200,
    storageKey: `documents/test/${key}.pdf`,
    storageProvider: 'r2',
    status: 'approved',
    ...extra,
  });
  docs[key] = document;
  return document;
};

test.before(async () => {
  if (skip) return;
  storageServer = http.createServer((req, res) => {
    const key = decodeURIComponent(req.url.replace(/^\/f\//, ''));
    if (key.includes('missing')) { res.writeHead(404); res.end(); return; }
    const send = () => { res.writeHead(200, { 'Content-Type': 'application/pdf' }); res.end(pdf(key)); };
    if (key.includes('slow')) setTimeout(send, 1500); else send();
  });
  await new Promise((resolve) => { storageServer.listen(0, '127.0.0.1', resolve); });
  storageBase = `http://127.0.0.1:${storageServer.address().port}`;

  await mongoose.connect(uri);
  await mongoose.connection.dropDatabase();
  await Promise.all([User, Organisme, Structure, ParcoursType, Noeud, Matiere, Document, DownloadQuota, DownloadBundle].map((Model) => Model.syncIndexes()));

  users.admin = await User.create({ name: 'Admin', email: 'admin@test.ci', password: 'secret123', role: 'admin' });
  users.free = await User.create({ name: 'Libre', email: 'libre@test.ci', password: 'secret123' });
  users.subscriber = await User.create({ name: 'Abonne', email: 'abonne@test.ci', password: 'secret123' });
  users.expired = await User.create({ name: 'Expire', email: 'expire@test.ci', password: 'secret123' });
  await Subscription.create({ user: users.subscriber._id, currentPeriodEnd: new Date(Date.now() + 30 * 86400000), cycleStart: new Date() });
  await Subscription.create({ user: users.expired._id, currentPeriodEnd: new Date(Date.now() - 86400000), cycleStart: new Date(Date.now() - 200 * 86400000) });
  Object.entries(users).forEach(([name, user]) => { tokens[name] = user.getSignedJwtToken(); });

  // ENA : deux cycles, structure « Année ».
  const ena = await Organisme.create({ nom: 'ENA', slug: 'ena' });
  await Structure.create({ organismeId: ena._id, niveaux: [{ ordre: 1, type: 'annee', libelleSingulier: 'Année', libellePluriel: 'Années' }] });
  const moyen = await ParcoursType.create({ organismeId: ena._id, nom: 'Cycle moyen' });
  const superieur = await ParcoursType.create({ organismeId: ena._id, nom: 'Cycle supérieur' });
  const node = {};
  for (const name of ['2009', '2010', '2011', '2014-2015', '2021', '2022', 'Session spéciale']) {
    node[name] = await Noeud.create({ organismeId: ena._id, parentId: null, ordreNiveau: 1, nom: name });
  }
  const maths = await Matiere.create({ organismeId: ena._id, nom: 'Mathématiques' });
  const info = await Matiere.create({ organismeId: ena._id, nom: 'Informatique' });
  Object.assign(ids, { ena, moyen, superieur, maths, info, node });

  const subject = (key, year, matiere, title, parcoursType = moyen, extra) => seedSubject({ key, organisme: ena, node: node[year], matiere, parcoursType, title, extra });
  await subject('m2009', '2009', maths, 'ENA Maths 2009');
  await subject('i2009', '2009', info, 'ENA Info 2009');
  await subject('m2010', '2010', maths, 'ENA Maths 2010');
  await subject('m2011', '2011', maths, 'ENA Maths 2011');
  await subject('i2011', '2011', info, 'ENA Info 2011');
  await subject('m2015', '2014-2015', maths, 'ENA Maths 2014-2015');
  await subject('m2021', '2021', maths, 'ENA Maths 2021', moyen, { correctionIncludedInPdf: false });
  await subject('i2021', '2021', info, 'ENA Info 2021');
  await subject('m2022', '2022', maths, 'ENA Maths 2022');
  await subject('i2022', '2022', info, 'ENA Info 2022');
  await subject('unknown', 'Session spéciale', maths, 'ENA Maths session spéciale');
  await subject('broken2021', '2021', info, 'ENA Info 2021 bis (stockage en panne)');
  await subject('missing2022', '2022', info, 'ENA Info 2022 bis (fichier perdu)');
  await subject('slow2022', '2022', maths, 'ENA Maths 2022 bis (lent)');
  await subject('sup2021', '2021', maths, 'ENA Maths 2021 cycle supérieur', superieur);
  // Corrigé séparé du sujet de maths 2021.
  docs.c2021 = await Document.create({
    type: 'correction', documentType: 'corrige', sujetParentId: docs.m2021._id, correctionFor: docs.m2021._id,
    noeudId: node['2021']._id, matiereId: maths._id, parcoursTypeId: moyen._id,
    uploadedBy: users.admin._id, file: 'c2021.pdf', originalFileName: 'corrige-maths-2021.pdf', fileType: 'PDF', extension: '.pdf',
    mimeType: 'application/pdf', fileSize: 900, storageKey: 'documents/test/c2021.pdf', storageProvider: 'r2', status: 'approved',
  });

  // Concours Police : pas de cycle, nom composé.
  const police = await Organisme.create({ nom: 'Concours Police', slug: 'concours-police' });
  await Structure.create({ organismeId: police._id, niveaux: [{ ordre: 1, type: 'annee', libelleSingulier: 'Année', libellePluriel: 'Années' }] });
  const p2008 = await Noeud.create({ organismeId: police._id, parentId: null, ordreNiveau: 1, nom: '2008' });
  const culture = await Matiere.create({ organismeId: police._id, nom: 'Culture générale' });
  await seedSubject({ key: 'police2008', organisme: police, node: p2008, matiere: culture, title: 'Police culture générale 2008' });
  Object.assign(ids, { police });

  httpServer = app.listen(0);
  base = `http://127.0.0.1:${httpServer.address().port}`;
});

test.after(async () => {
  if (skip) return;
  await new Promise((resolve) => { httpServer.close(resolve); });
  await new Promise((resolve) => { storageServer.close(resolve); });
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

// ── Accès ─────────────────────────────────────────────────────────────────────────────────────

test('1-2. un visiteur télécharge sans compte les sujets de 2009 et 2010, sans quota', { skip }, async () => {
  const visitor = await newVisitor();
  for (const key of ['m2009', 'i2009', 'm2010', 'm2009']) {
    const { status, json } = await download(docs[key]._id, visitor);
    assert.equal(status, 200, key);
    assert.equal(json.data.access.tier, 'free');
    assert.ok(json.data.url.startsWith(storageBase));
  }
  const { json } = await call('/api/downloads/quota', visitor);
  assert.equal(json.data.used, 0);
  assert.equal(json.data.limit, 3);
});

test('3. un visiteur télécharge un sujet de 2011 sur son quota gratuit ; la fiche annonce « récent »', { skip }, async () => {
  const visitor = await newVisitor();
  const fiche = await call(`/api/documents/${docs.m2011._id}`, visitor);
  assert.equal(fiche.json.data.access.tier, 'recent');
  assert.equal(fiche.json.data.access.year, 2011);
  const { status, json } = await download(docs.m2011._id, visitor);
  assert.equal(status, 200);
  assert.equal(json.data.quota.used, 1);
  assert.equal(json.data.quota.remaining, 2);
});

test('4-6. compte sans abonnement et abonnement expiré : quota gratuit (3) ; abonné actif : 20', { skip }, async () => {
  for (const name of ['free', 'expired']) {
    const { json } = await call('/api/downloads/quota', { token: tokens[name], ip: freshIp() });
    assert.equal(json.data.plan, 'free', name);
    assert.equal(json.data.limit, 3, name);
  }
  const { json } = await call('/api/downloads/quota', { token: tokens.subscriber, ip: freshIp() });
  assert.equal(json.data.plan, 'subscriber');
  assert.equal(json.data.limit, 20);
  const done = await download(docs.i2021._id, { token: tokens.subscriber, ip: freshIp() });
  assert.equal(done.status, 200);
});

test('6b. abonnement expiré : au-delà du quota gratuit, refus avec proposition d’abonnement', { skip }, async () => {
  const who = { token: tokens.expired, ip: freshIp() };
  for (const key of ['m2011', 'i2011', 'm2021']) assert.equal((await download(docs[key]._id, who)).status, 200, key);
  const refused = await download(docs.m2022._id, who);
  assert.equal(refused.status, 429);
  assert.equal(refused.json.code, 'DAILY_LIMIT_REACHED');
  assert.equal(refused.json.details.canSubscribe, true);
  assert.ok(refused.json.details.nextRenewalAt);
  assert.match(refused.json.error, /2010 et avant restent gratuits/);
  // Les anciens sujets restent téléchargeables.
  assert.equal((await download(docs.m2009._id, who)).status, 200);
});

test('7. un document d’année indéterminable n’est jamais gratuit ; une plage vaut sa dernière année', { skip }, async () => {
  const visitor = await newVisitor();
  const unknown = await call(`/api/documents/${docs.unknown._id}`, visitor);
  assert.equal(unknown.json.data.access.yearKnown, false);
  assert.equal(unknown.json.data.access.tier, 'recent');
  const range = await call(`/api/documents/${docs.m2015._id}`, visitor);
  assert.equal(range.json.data.access.year, 2015);
  const { json } = await download(docs.unknown._id, visitor);
  assert.equal(json.data.quota.used, 1);
  const issues = await call('/api/downloads/admin/year-issues', { token: tokens.admin });
  assert.ok(issues.json.data.data.some((item) => item._id === String(docs.unknown._id)));
});

// ── Quotas ────────────────────────────────────────────────────────────────────────────────────

test('8-9. trois sujets récents pour un visiteur, le quatrième est refusé ; re-télécharger ne recompte pas', { skip }, async () => {
  const visitor = await newVisitor();
  for (const key of ['m2011', 'i2011', 'm2021']) assert.equal((await download(docs[key]._id, visitor)).status, 200);
  assert.equal((await download(docs.m2011._id, visitor)).status, 200, 'même document dans la fenêtre : pas de nouveau décompte');
  const refused = await download(docs.i2021._id, visitor);
  assert.equal(refused.status, 429);
  assert.equal(refused.json.details.remaining, 0);
});

test('10. un abonné télécharge jusqu’à 20 sujets récents', { skip }, async () => {
  const subscriber = await User.create({ name: 'Abonne 2', email: 'abonne2@test.ci', password: 'secret123' });
  await Subscription.create({ user: subscriber._id, currentPeriodEnd: new Date(Date.now() + 86400000) });
  const extra = [];
  for (let index = 0; index < 21; index += 1) {
    extra.push(await seedSubject({ key: `bulk${index}`, organisme: ids.ena, node: ids.node['2022'], matiere: ids.maths, parcoursType: ids.moyen, title: `Série ${index} 2022` }));
  }
  const who = { token: subscriber.getSignedJwtToken(), ip: freshIp() };
  for (let index = 0; index < 20; index += 1) assert.equal((await download(extra[index]._id, who)).status, 200, `n°${index + 1}`);
  assert.equal((await download(extra[20]._id, who)).status, 429);
  await Document.deleteMany({ _id: { $in: extra.map((item) => item._id) } });
});

test('14. le quota se renouvelle après 24 heures glissantes (et pas avant)', { skip }, async () => {
  const visitor = await newVisitor();
  for (const key of ['m2011', 'i2011', 'm2021']) await download(docs[key]._id, visitor);
  const subject = `v:${verifyVisitorToken(visitor.visitor)}`;
  const quota = await DownloadQuota.findOne({ subject });
  // Le premier droit a 23 h 59 : toujours compté.
  quota.grants[0].grantedAt = new Date(Date.now() - (24 * 3600000 - 60000));
  await DownloadQuota.updateOne({ _id: quota._id }, { $set: { grants: quota.grants } });
  assert.equal((await download(docs.i2021._id, visitor)).status, 429);
  // 24 h et 1 min : il sort de la fenêtre, un téléchargement redevient possible.
  quota.grants[0].grantedAt = new Date(Date.now() - (24 * 3600000 + 60000));
  await DownloadQuota.updateOne({ _id: quota._id }, { $set: { grants: quota.grants } });
  assert.equal((await download(docs.i2021._id, visitor)).status, 200);
});

test('15. des requêtes simultanées ne dépassent jamais le quota', { skip }, async () => {
  const visitor = await newVisitor();
  const keys = ['m2011', 'i2011', 'm2021', 'i2021', 'm2022', 'i2022', 'm2015'];
  const results = await Promise.all(keys.map((key) => download(docs[key]._id, visitor)));
  assert.equal(results.filter((result) => result.status === 200).length, 3);
  assert.equal(results.filter((result) => result.status === 429).length, 4);
});

test('16. un lien impossible à produire ne consomme pas le quota', { skip }, async () => {
  const visitor = await newVisitor();
  const failed = await download(docs.broken2021._id, visitor);
  assert.notEqual(failed.status, 200);
  const { json } = await call('/api/downloads/quota', visitor);
  assert.equal(json.data.used, 0);
});

test('visiteurs : effacer son jeton ne contourne pas le plafond de la connexion', { skip }, async () => {
  const ip = freshIp();
  let accepted = 0;
  for (let round = 0; round < 6; round += 1) {
    const visitor = await newVisitor(ip);
    for (const key of ['m2011', 'i2011', 'm2021']) {
      if ((await download(docs[key]._id, visitor)).status === 200) accepted += 1;
    }
  }
  // Mêmes 3 documents : dédoublonnés pour la connexion, jamais plus que le plafond IP.
  const otherKeys = ['i2021', 'm2022', 'i2022', 'm2015', 'unknown'];
  for (const key of otherKeys) {
    const visitor = await newVisitor(ip);
    if ((await download(docs[key]._id, visitor)).status === 200) accepted += 1;
  }
  assert.ok(accepted <= 18 + otherKeys.length);
  const ipQuota = await DownloadQuota.findOne({ subject: new RegExp(`^ip:${ip.replace(/\./g, '\\.')}`) }).lean();
  assert.ok(ipQuota.grants.length <= 12);
});

// ── Téléchargement groupé ─────────────────────────────────────────────────────────────────────

test('17-19. périmètres : organisme (cycle obligatoire), cycle, année, matières ; corrigés inclus', { skip }, async () => {
  const organismeOnly = await call('/api/downloads/scope?organisme=ena');
  assert.equal(organismeOnly.json.data.requiresCycle, true);
  assert.deepEqual(organismeOnly.json.data.cycles.map((cycle) => cycle.nom).sort(), ['Cycle moyen', 'Cycle supérieur']);

  const cycle = await call(`/api/downloads/scope?organisme=ena&parcoursTypeId=${ids.moyen._id}`);
  const all = cycle.json.data.documents;
  assert.ok(all.every((item) => item.parcoursType._id === String(ids.moyen._id)));
  assert.ok(all.some((item) => item.kind === 'corrige' && item.subjectId === String(docs.m2021._id)), 'corrigé listé');
  assert.ok(!all.some((item) => 'leafId' in item || 'nodes' in item || 'storageKey' in item), 'aucun champ interne');
  assert.ok(cycle.json.data.facets.years.includes(2009));

  const year = await call(`/api/downloads/scope?organisme=ena&parcoursTypeId=${ids.moyen._id}&annee=2021`);
  assert.ok(year.json.data.documents.length >= 3);
  assert.ok(year.json.data.documents.every((item) => item.year === 2021));

  const subjects = await call(`/api/downloads/scope?organisme=ena&parcoursTypeId=${ids.moyen._id}&matiereIds=${ids.info._id}`);
  assert.ok(subjects.json.data.documents.every((item) => item.matiere._id === String(ids.info._id)));

  // 30. Nom composé et alias tolérant (« Concours-Police », « concourspolice ») ; organisme sans cycle.
  for (const alias of ['concours-police', 'Concours-Police', 'concourspolice', String(ids.police._id)]) {
    const police = await call(`/api/downloads/scope?organisme=${encodeURIComponent(alias)}`);
    assert.equal(police.status, 200, alias);
    assert.equal(police.json.data.requiresCycle, false);
    assert.equal(police.json.data.documents.length, 1);
  }
  assert.equal((await call('/api/downloads/scope?organisme=inexistant')).status, 404);
});

test('21-22. doublons ignorés ; plusieurs cycles ou organismes refusés', { skip }, async () => {
  const visitor = await newVisitor();
  const preview = await call('/api/downloads/preview', { ...visitor, method: 'POST', body: { documentIds: [docs.m2009._id, docs.m2009._id, docs.i2009._id] } });
  assert.equal(preview.json.data.counts.total, 2);

  const mixed = await call('/api/downloads/bundles', { ...visitor, method: 'POST', body: { documentIds: [docs.m2009._id, docs.sup2021._id] } });
  assert.equal(mixed.status, 400);
  assert.equal(mixed.json.code, 'MIXED_CYCLES');

  const mixedOrganismes = await call('/api/downloads/preview', { ...visitor, method: 'POST', body: { documentIds: [docs.m2009._id, docs.police2008._id] } });
  assert.equal(mixedOrganismes.json.code, 'MIXED_ORGANISMES');

  const forged = await call('/api/downloads/preview', { ...visitor, method: 'POST', body: { documentIds: ['000000000000000000000000', 'abc'] } });
  assert.equal(forged.status, 404);
});

test('12-13, 23. sélection mixte : les gratuits ne comptent pas ; dépassement expliqué puis réduit', { skip }, async () => {
  const visitor = await newVisitor();
  const recent = ['m2011', 'i2011', 'm2021', 'i2021', 'm2022'].map((key) => docs[key]._id);
  const free = ['m2009', 'i2009', 'm2010'].map((key) => docs[key]._id);

  const preview = await call('/api/downloads/preview', { ...visitor, method: 'POST', body: { documentIds: [...recent, ...free] } });
  assert.equal(preview.json.data.counts.free, 3);
  assert.equal(preview.json.data.counts.recentToCharge, 5);
  assert.equal(preview.json.data.overflow, 2);
  assert.equal(preview.json.data.canProceed, false);

  const refused = await call('/api/downloads/bundles', { ...visitor, method: 'POST', body: { documentIds: [...recent, ...free] } });
  assert.equal(refused.status, 429);
  assert.equal(refused.json.code, 'SELECTION_EXCEEDS_QUOTA');
  assert.match(refused.json.error, /5 sujets récents/);
  const quotaAfterRefusal = await call('/api/downloads/quota', visitor);
  assert.equal(quotaAfterRefusal.json.data.used, 0, 'un refus ne consomme rien');

  // L'utilisateur garde 3 récents + tous les gratuits.
  const ok = await call('/api/downloads/bundles', { ...visitor, method: 'POST', body: { documentIds: [...recent.slice(0, 3), ...free] } });
  assert.equal(ok.status, 201);
  assert.equal(ok.json.data.count, 6);
  const quota = await call('/api/downloads/quota', visitor);
  assert.equal(quota.json.data.used, 3, 'réservé en attendant la livraison');

  // 24 (serveur). Archive ZIP : 6 PDF, noms propres et uniques, lien à usage unique.
  const response = await call(ok.json.data.archiveUrl, { raw: true, ip: visitor.ip });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'application/zip');
  const buffer = Buffer.from(await response.arrayBuffer());
  const names = zipEntryNames(buffer);
  assert.equal(names.length, 6);
  assert.equal(new Set(names).size, 6);
  assert.ok(names.every((name) => /^[\x20-\x7E]+\.pdf$/.test(name) && !name.includes('/')));
  assert.ok(names.some((name) => name.startsWith('2009 - Mathematiques - ')));
  await new Promise((resolve) => { setTimeout(resolve, 150); });
  const reused = await call(ok.json.data.archiveUrl, { ip: visitor.ip });
  assert.equal(reused.status, 410);
  const bundle = await DownloadBundle.findOne({ status: 'done' }).sort('-createdAt').lean();
  assert.equal(bundle.delivered, 6);
  assert.equal((await call('/api/downloads/quota', visitor)).json.data.used, 3);
});

test('Cas C. quota épuisé : seuls les gratuits passent', { skip }, async () => {
  const visitor = await newVisitor();
  for (const key of ['m2011', 'i2011', 'm2021']) await download(docs[key]._id, visitor);
  const preview = await call('/api/downloads/preview', { ...visitor, method: 'POST', body: { documentIds: [docs.i2021._id, docs.m2009._id] } });
  assert.equal(preview.json.data.quota.remaining, 0);
  assert.ok(preview.json.data.quota.nextRenewalAt);
  const freeOnly = await call('/api/downloads/bundles', { ...visitor, method: 'POST', body: { documentIds: [docs.m2009._id] } });
  assert.equal(freeOnly.status, 201);
});

test('16b. fichier manquant dans une archive : ignoré, signalé, non décompté', { skip }, async () => {
  const who = { token: tokens.free, ip: freshIp() };
  await DownloadQuota.deleteMany({ subject: `u:${users.free._id}` });
  const created = await call('/api/downloads/bundles', { ...who, method: 'POST', body: { documentIds: [docs.missing2022._id, docs.m2022._id] } });
  assert.equal(created.status, 201);
  const response = await call(created.json.data.archiveUrl, { raw: true, ip: who.ip });
  const names = zipEntryNames(Buffer.from(await response.arrayBuffer()));
  assert.ok(names.includes('LISEZ-MOI.txt'));
  assert.equal(names.filter((name) => name.endsWith('.pdf')).length, 1);
  await new Promise((resolve) => { setTimeout(resolve, 150); });
  const quota = await call('/api/downloads/quota', who);
  assert.equal(quota.json.data.used, 1, 'seul le fichier livré est décompté');
});

test('16c. archive interrompue par le client : quota rendu', { skip }, async () => {
  const who = { token: tokens.subscriber, ip: freshIp() };
  await DownloadQuota.deleteMany({ subject: `u:${users.subscriber._id}` });
  const created = await call('/api/downloads/bundles', { ...who, method: 'POST', body: { documentIds: [docs.slow2022._id, docs.i2022._id] } });
  assert.equal(created.status, 201);
  assert.equal((await call('/api/downloads/quota', who)).json.data.used, 2);
  const controller = new AbortController();
  const response = await call(created.json.data.archiveUrl, { raw: true, ip: who.ip, signal: controller.signal });
  assert.equal(response.status, 200);
  controller.abort();
  await new Promise((resolve) => { setTimeout(resolve, 2500); });
  assert.equal((await call('/api/downloads/quota', who)).json.data.used, 0);
});

test('24 (mobile). livraison en liens individuels, confirmée à la remise', { skip }, async () => {
  const visitor = await newVisitor();
  const created = await call('/api/downloads/bundles', { ...visitor, method: 'POST', body: { documentIds: [docs.m2009._id, docs.m2021._id, docs.c2021._id], delivery: 'files' } });
  assert.equal(created.status, 201);
  const files = await call(created.json.data.filesUrl, { ip: visitor.ip });
  assert.equal(files.status, 200);
  assert.equal(files.json.data.files.length, 3);
  assert.ok(files.json.data.files.every((file) => file.url && file.fileName.endsWith('.pdf')));
  assert.equal((await call('/api/downloads/quota', visitor)).json.data.used, 2, 'sujet 2021 + son corrigé');
  assert.equal((await call(created.json.data.filesUrl, { ip: visitor.ip })).status, 410);
});

// ── Recherche, navigation, logos ──────────────────────────────────────────────────────────────

test('« corrigé » dans la recherche et filtre Corrigés : sujets disposant d’un corrigé', { skip }, async () => {
  await Document.updateOne({ _id: docs.m2022._id }, { $set: { correctionIncludedInPdf: true } });
  const byFilter = await call('/api/documents?hasCorrection=true&limit=50');
  const filterIds = byFilter.json.data.map((item) => item._id);
  assert.ok(filterIds.includes(String(docs.m2021._id)), 'corrigé séparé');
  assert.ok(filterIds.includes(String(docs.m2022._id)), 'corrigé inclus');
  assert.ok(!filterIds.includes(String(docs.m2009._id)));
  const byWord = await call(`/api/search?search=${encodeURIComponent('corrigé ENA')}&limit=50`);
  assert.deepEqual(byWord.json.data.map((item) => item._id).sort(), filterIds.sort());
  assert.ok(byFilter.json.data.every((item) => item.access && item.access.tier));
});

test('25-26. fiche par lien direct, identifiant invalide ou inconnu', { skip }, async () => {
  assert.equal((await call(`/api/documents/${docs.m2021._id}`)).status, 200);
  assert.equal((await call('/api/documents/000000000000000000000000')).status, 404);
  assert.equal((await call('/api/documents/pas-un-identifiant')).status, 400);
});

test('27-29. logo : ajout par adresse ou image, remplacement, suppression ; admin seulement', { skip }, async () => {
  const path = `/api/organismes/${ids.ena._id}/logo`;
  const denied = await call(path, { method: 'PUT', token: tokens.free, body: { url: 'https://exemple.ci/logo.png' } });
  assert.equal(denied.status, 403);
  for (const url of ['http://exemple.ci/logo.png', 'https://127.0.0.1/logo.png', 'https://localhost/x.png', 'javascript:alert(1)']) {
    const refused = await call(path, { method: 'PUT', token: tokens.admin, body: { url } });
    assert.equal(refused.status, 400, url);
  }
  const added = await call(path, { method: 'PUT', token: tokens.admin, body: { url: 'https://exemple.ci/logo-ena.png' } });
  assert.equal(added.status, 200);
  assert.equal(added.json.data.logo, 'https://exemple.ci/logo-ena.png');
  const listed = await call('/api/catalog/organismes');
  assert.equal(listed.json.data.find((item) => item.slug === 'ena').logo, 'https://exemple.ci/logo-ena.png');

  // Image envoyée : normalisée en PNG, servie via l'API.
  const Jimp = require('jimp');
  const png = await new Jimp(64, 64, 0x0d1b32ff).getBufferAsync(Jimp.MIME_PNG);
  const form = new FormData();
  form.append('file', new Blob([png], { type: 'image/png' }), 'logo.png');
  const uploadResponse = await fetch(`${base}${path}`, { method: 'PUT', headers: { Authorization: `Bearer ${tokens.admin}`, 'X-Forwarded-For': freshIp() }, body: form });
  const uploadJson = await uploadResponse.json();
  assert.equal(uploadResponse.status, 200, JSON.stringify(uploadJson));
  assert.match(uploadJson.data.logo, new RegExp(`^/api/organismes/${ids.ena._id}/logo\\?v=\\d+$`));
  const redirect = await fetch(`${base}${path}`, { redirect: 'manual' });
  assert.equal(redirect.status, 302);

  const removed = await call(path, { method: 'DELETE', token: tokens.admin });
  assert.equal(removed.status, 200);
  assert.equal(removed.json.data.logo, null);
  assert.ok(deleted.some((key) => key.includes(`organismes/${ids.ena._id}/logo-`)), 'ancien fichier supprimé du stockage');
  const police = (await call('/api/catalog/organismes')).json.data.find((item) => item.slug === 'concours-police');
  assert.equal(police.logo, null, 'organisme sans logo : le client affiche le monogramme');
});
