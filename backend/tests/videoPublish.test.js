/**
 * Pipeline local de publication vidéo (scripts/video) — avec un faux YouTube et une fausse base :
 * aucune vidéo n'est envoyée, aucune base n'est touchée.
 *   node --test tests/videoPublish.test.js
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { parseArgs } = require('../scripts/video/lib/args');
const { maskMongoUri, assertLocalMachine } = require('../scripts/video/lib/env');
const { resolveCible, metadonnees, marqueur } = require('../scripts/video/lib/cible');
const { parseIsoDuration } = require('../scripts/video/lib/youtube');
const { createEtat } = require('../scripts/video/lib/etat');
const { createLog } = require('../scripts/video/lib/log');
const { publier, masquer, listerEtat } = require('../scripts/video/lib/pipeline');
const { verifierStoryboard } = require('../scripts/video/generation/storyboard');
const { construireBrief } = require('../scripts/video/generation/brief');

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'video-test-'));
const SHA = 'a'.repeat(64);
const fichier = { chemin: '/videos/math-l1.mp4', taille: 20 * 1024 * 1024, sha256: SHA };

const fakeYoutube = (over = {}) => {
  const calls = { ouvrirSession: 0, envoyer: 0, chercher: 0 };
  return {
    calls,
    maChaine: async () => ({ id: 'UCfatafalta', titre: 'Fatafalta', uploads: 'UUfatafalta' }),
    chercherParMarqueur: async () => { calls.chercher += 1; return over.trouve || null; },
    ouvrirSession: async () => { calls.ouvrirSession += 1; return 'https://upload.example/session/1'; },
    positionSession: async () => over.position ?? null,
    envoyer: async () => { calls.envoyer += 1; if (over.envoiEchoue) throw new Error('coupure réseau'); return { id: 'NEWVIDEO123' }; },
    lireVideo: async (id) => ({ id, titre: 'Logarithme', publieLe: '2026-11-07T10:00:00Z', privacyStatus: over.privacy || 'public', uploadStatus: 'processed', embeddable: true, dureeSec: 1095 }),
  };
};

const fakeDb = (initial = null, { ecritureEchoue = false } = {}) => {
  let doc = initial;
  const calls = { ecrire: 0 };
  return {
    calls,
    get doc() { return doc; },
    trouver: async () => doc,
    lister: async () => (doc ? [doc] : []),
    ecrire: async (cible, champs) => {
      calls.ecrire += 1;
      if (ecritureEchoue) throw new Error('connexion à la base perdue');
      doc = { cible: cible.type, code: cible.code, langue: cible.langue, ...champs };
      return doc;
    },
    masquer: async () => { doc = { ...doc, status: 'hidden' }; return doc; },
  };
};

const deps = (over = {}) => ({
  log: createLog({ quiet: true }),
  etat: createEtat(tmp()),
  confirm: async () => true,
  resoudreCible: resolveCible,
  lireFichier: async () => fichier,
  baseAffichee: 'cluster0.example.mongodb.net/fatafalta',
  sleep: async () => {},
  ...over,
});

const OPTS = { type: 'lecon', id: 'MATH-LNEXP-L1', langue: 'fr', fichier: '/videos/math-l1.mp4', attenteMinutes: 1 };

test('options : erreurs explicites, aucune action par défaut', () => {
  assert.throws(() => parseArgs(['--id', 'X']), /--type/);
  assert.throws(() => parseArgs(['--type', 'module']), /--id/);
  assert.throws(() => parseArgs(['--type', 'concours', '--id', 'ENSEA-AS', '--langue', 'en']), /concours/);
  assert.throws(() => parseArgs(['--type', 'lecon', '--id', 'X', '--inconnue']), /option inconnue/);
  assert.throws(() => parseArgs(['--type', 'module', '--id', 'MATH-LNEXP']), /par leçon/);
  const o = parseArgs(['--type', 'lecon', '--id', 'MATH-LNEXP-L1', '--dry-run']);
  assert.equal(o.dryRun, true);
  assert.equal(o.langue, 'fr');
});

test('secrets : URI masquée, jamais d’identifiants affichés ; refus sur le serveur', () => {
  assert.equal(maskMongoUri('mongodb+srv://user:secret@cluster0.ab12.mongodb.net/fatafalta?retryWrites=true'), 'cluster0.ab12.mongodb.net/fatafalta');
  assert.doesNotMatch(maskMongoUri('mongodb://user:secret@h1:27017,h2:27017/db'), /secret/);
  assert.throws(() => assertLocalMachine({ RENDER: 'true' }), /locale/);
  assert.throws(() => assertLocalMachine({ NODE_ENV: 'production' }), /locale/);
  assert.doesNotThrow(() => assertLocalMachine({}));
});

test('cible : leçon, concours et version de langue vérifiés dans le pack', () => {
  const l1 = resolveCible({ type: 'lecon', id: 'MATH-LNEXP-L1' });
  assert.equal(l1.type, 'lecon');
  assert.equal(l1.module.code, 'MATH-LNEXP');
  assert.equal(resolveCible({ type: 'concours', id: 'ENSEA-AS' }).sigle, 'ENSEA');
  assert.equal(resolveCible({ type: 'lecon', id: 'ANG-GRAM-L1', langue: 'en' }).titre, 'Build a sentence: who does what?');
  assert.notEqual(resolveCible({ type: 'lecon', id: 'ANG-GRAM-L1' }).empreinte, resolveCible({ type: 'lecon', id: 'ANG-GRAM-L2' }).empreinte);
  assert.throws(() => resolveCible({ type: 'lecon', id: 'MATH-LNEXP-L1', langue: 'en' }), /version « en » inexistante/);
  assert.throws(() => resolveCible({ type: 'lecon', id: 'MATH-LNEXP' }), /introuvable/);
  assert.throws(() => resolveCible({ type: 'module', id: 'MATH-LNEXP' }), /type de cible inconnu/);
  assert.throws(() => resolveCible({ type: 'concours', id: 'INCONNU' }), /introuvable/);
});

test('métadonnées YouTube : public, intégrable, marqueur d’idempotence, titre ≤ 100', () => {
  const cible = resolveCible({ type: 'lecon', id: 'MATH-LNEXP-L1' });
  const meta = metadonnees(cible, { fichierSha256: SHA });
  assert.ok(meta.snippet.title.includes(cible.titre));
  const fixture = metadonnees({ ...cible, titre: 'Titre stable', module: { ...cible.module, titre: 'Module stable' } }, { fichierSha256: SHA });
  assert.match(fixture.snippet.title, /Titre stable — Module stable/);
  assert.match(meta.snippet.description, /fatafalta:lecon:MATH-LNEXP-L1:fr:/);
  assert.equal(meta.status.privacyStatus, 'public');
  assert.equal(meta.status.embeddable, true);
  assert.ok(meta.snippet.description.includes(marqueur(cible, SHA)));
  assert.ok(meta.snippet.title.length <= 100);
  assert.equal(parseIsoDuration('PT18M15S'), 1095);
  assert.equal(parseIsoDuration('PT1H2M10S'), 3730);
});

test('publication complète : envoi, vérification, confirmation, écriture', async () => {
  const youtube = fakeYoutube();
  const db = fakeDb();
  const r = await publier(OPTS, deps({ youtube, db }));
  assert.equal(r.action, 'creee');
  assert.equal(youtube.calls.envoyer, 1);
  assert.equal(db.doc.youtubeId, 'NEWVIDEO123');
  assert.equal(db.doc.url, 'https://www.youtube.com/watch?v=NEWVIDEO123');
  assert.equal(db.doc.durationSec, 1095);
  assert.equal(db.doc.status, 'published');
  assert.equal(db.doc.source.fichierSha256, SHA);
});

test('--dry-run : rien envoyé, rien écrit', async () => {
  const youtube = fakeYoutube();
  const db = fakeDb();
  const r = await publier({ ...OPTS, dryRun: true }, deps({ youtube, db }));
  assert.equal(r.action, 'dry-run');
  assert.equal(youtube.calls.ouvrirSession + youtube.calls.envoyer, 0);
  assert.equal(db.calls.ecrire, 0);
});

test('reprise : l’écriture en base échoue après l’envoi → la relance ne renvoie PAS la vidéo', async () => {
  const etat = createEtat(tmp());
  const youtube = fakeYoutube();
  await assert.rejects(publier(OPTS, deps({ youtube, etat, db: fakeDb(null, { ecritureEchoue: true }) })), /base perdue/);
  assert.equal(youtube.calls.envoyer, 1);
  const db = fakeDb();
  const r = await publier(OPTS, deps({ youtube, etat, db }));
  assert.equal(r.action, 'creee');
  assert.equal(youtube.calls.envoyer, 1, 'aucun second envoi');
  assert.equal(db.doc.youtubeId, 'NEWVIDEO123');
});

test('reprise sans --fichier : le journal local suffit pour finir l’écriture', async () => {
  const etat = createEtat(tmp());
  const youtube = fakeYoutube();
  await assert.rejects(publier(OPTS, deps({ youtube, etat, db: fakeDb(null, { ecritureEchoue: true }) })));
  const r = await publier({ ...OPTS, fichier: undefined }, deps({ youtube, etat, db: fakeDb() }));
  assert.equal(r.action, 'creee');
  assert.equal(youtube.calls.envoyer, 1);
});

test('journal local perdu : la vidéo est retrouvée par son marqueur sur la chaîne', async () => {
  const youtube = fakeYoutube({ trouve: 'FOUNDVIDEO1' });
  const db = fakeDb();
  const r = await publier(OPTS, deps({ youtube, db }));
  assert.equal(r.youtubeId, 'FOUNDVIDEO1');
  assert.equal(youtube.calls.envoyer, 0);
});

test('envoi interrompu : la session est conservée et l’envoi reprend à la position reçue', async () => {
  const etat = createEtat(tmp());
  await assert.rejects(publier(OPTS, deps({ youtube: fakeYoutube({ envoiEchoue: true }), etat, db: fakeDb() })), /coupure/);
  assert.equal(etat.lire(resolveCible(OPTS)).session, 'https://upload.example/session/1');
  const youtube = fakeYoutube({ position: { termine: false, offset: 8 * 1024 * 1024 } });
  const r = await publier(OPTS, deps({ youtube, etat, db: fakeDb() }));
  assert.equal(r.action, 'creee');
  assert.equal(youtube.calls.ouvrirSession, 0, 'pas de nouvelle session');
});

test('déjà publiée (même fichier) : rien à faire', async () => {
  const db = fakeDb({ youtubeId: 'OLDVIDEO123', status: 'published', source: { fichierSha256: SHA } });
  const youtube = fakeYoutube();
  const r = await publier(OPTS, deps({ youtube, db }));
  assert.equal(r.action, 'rien');
  assert.equal(youtube.calls.envoyer + db.calls.ecrire, 0);
});

test('autre vidéo déjà enregistrée : refus sans --remplacer, remplacement avec', async () => {
  const existante = { youtubeId: 'OLDVIDEO123', status: 'published', source: { fichierSha256: 'b'.repeat(64) } };
  await assert.rejects(publier(OPTS, deps({ youtube: fakeYoutube(), db: fakeDb(existante) })), /--remplacer/);
  const db = fakeDb(existante);
  const r = await publier({ ...OPTS, remplacer: true }, deps({ youtube: fakeYoutube(), db }));
  assert.equal(r.action, 'remplacee');
  assert.equal(db.doc.youtubeId, 'NEWVIDEO123');
});

test('vidéo restée privée (projet non audité) : arrêt AVANT toute écriture en base', async () => {
  const db = fakeDb();
  await assert.rejects(publier(OPTS, deps({ youtube: fakeYoutube({ privacy: 'private' }), db })), /non publique/);
  assert.equal(db.calls.ecrire, 0);
});

test('confirmation refusée : rien n’est écrit', async () => {
  const db = fakeDb();
  const r = await publier(OPTS, deps({ youtube: fakeYoutube(), db, confirm: async () => false }));
  assert.equal(r.action, 'annule');
  assert.equal(db.calls.ecrire, 0);
});

test('mauvaise chaîne YouTube : refus', async () => {
  await assert.rejects(publier(OPTS, deps({ youtube: fakeYoutube(), db: fakeDb(), channelId: 'UCautre' })), /chaîne attendue/);
});

test('sans fichier ni reprise : message « aucun générateur branché »', async () => {
  await assert.rejects(publier({ ...OPTS, fichier: undefined }, deps({ youtube: fakeYoutube(), db: fakeDb() })), /aucun générateur/);
});

test('--masquer et --etat', async () => {
  const db = fakeDb({ cible: 'lecon', code: 'MATH-LNEXP-L1', langue: 'fr', youtubeId: 'OLDVIDEO123', status: 'published', source: { empreinteContenu: 'ancienne' } });
  const lignes = await listerEtat(deps({ db }));
  assert.ok(lignes.some((l) => l.type === 'lecon' && l.code === 'ANG-GRAM-L1' && l.langue === 'en'), 'chaque leçon, dans chaque version');
  const ligne = lignes.find((l) => l.code === 'MATH-LNEXP-L1');
  assert.equal(ligne.video, true);
  assert.match(ligne.statut, /contenu modifié/);
  assert.equal((await masquer({ type: 'lecon', id: 'MATH-LNEXP-L1', langue: 'fr' }, deps({ db }))).action, 'masquee');
  assert.equal(db.doc.status, 'hidden');
});

test('storyboard : un terme utilisé avant d’être défini est refusé', () => {
  const ok = verifierStoryboard({
    scenes: [
      { id: 's1', narration: 'Le participe passé est la forme du verbe après have.', definit: ['participe passé'], visuel: { type: 'tableau', description: 'tableau des participes' } },
      { id: 's2', narration: 'Le present perfect se forme avec have et le participe passé.', definit: ['present perfect'], visuel: { type: 'formule', description: 'have + participe passé' } },
    ],
  }, { glossaire: ['participe passé', 'present perfect'] });
  assert.equal(ok.ok, true, ok.erreurs.join(' ; '));
  const ko = verifierStoryboard({
    scenes: [
      { id: 's1', narration: 'On utilise le present perfect.', visuel: { type: 'texte', description: 'titre' } },
      { id: 's2', narration: 'Le present perfect, c’est have + participe passé.', definit: ['present perfect'], visuel: {} },
    ],
  }, { glossaire: ['present perfect', 'auxiliaire'] });
  assert.equal(ko.ok, false);
  assert.ok(ko.erreurs.some((e) => /utilisé scène s1 avant d’être défini/.test(e)));
  assert.ok(ko.erreurs.some((e) => /auxiliaire.*jamais défini/.test(e)));
  assert.ok(ko.erreurs.some((e) => /visuel manquant/.test(e)));
});

test('dossier de génération : issu de la leçon, glossaire ordonné, consignes qualité', () => {
  const { brief, markdown } = construireBrief({ type: 'lecon', id: 'ANG-GRAM-L1', langue: 'fr' });
  assert.equal(brief.module.code, 'ANG-GRAM');
  const cible = resolveCible({ type: 'lecon', id: 'ANG-GRAM-L1' });
  for (const bloc of cible.contenu.lecon.blocs.filter((b) => b.type === 'titre')) assert.ok(brief.plan.some((p) => p.titre === bloc.texte));
  const { glossaireLecon } = require('../scripts/video/generation/brief');
  const termes = glossaireLecon({ blocs: [{ md: '**auxiliaire**' }, { md: '**present perfect** puis **auxiliaire**' }] }).map((g) => g.terme);
  assert.deepEqual(termes, ['auxiliaire', 'present perfect']);
  assert.ok(termes.indexOf('auxiliaire') < termes.indexOf('present perfect'));
  assert.match(markdown, /Expliquer AVANT d'utiliser/);
  assert.match(markdown, /Aucune durée imposée/);
  const concours = construireBrief({ type: 'concours', id: 'ENSEA-AS' });
  assert.ok(concours.brief.plan.some((p) => p.titre === 'Les épreuves'));
});

test('client YouTube : envoi reprenable par blocs de 8 Mio (308 → 201) et reprise de session', async () => {
  const { createYoutubeClient } = require('../scripts/video/lib/youtube');
  const dir = tmp();
  const file = path.join(dir, 'v.mp4');
  const taille = 9 * 1024 * 1024 + 123;
  fs.writeFileSync(file, Buffer.alloc(taille, 1));
  const puts = [];
  const fetchImpl = async (url, init = {}) => {
    if (url.startsWith('https://oauth2.googleapis.com/token')) return new Response(JSON.stringify({ access_token: 'tok', expires_in: 3600 }), { status: 200 });
    if (init.method === 'POST') return new Response(null, { status: 200, headers: { Location: 'https://upload.example/s/1' } });
    const range = init.headers['Content-Range'];
    puts.push({ range, len: init.body ? init.body.length : 0 });
    if (range === `bytes */${taille}`) return new Response(null, { status: 308, headers: { Range: 'bytes=0-8388607' } });
    const end = Number(range.split('-')[1].split('/')[0]);
    if (end + 1 < taille) return new Response(null, { status: 308, headers: { Range: `bytes=0-${end}` } });
    return new Response(JSON.stringify({ id: 'UPLOADED001' }), { status: 201 });
  };
  const yt = createYoutubeClient({ clientId: 'c', clientSecret: 's', refreshToken: 'r', fetchImpl });
  const session = await yt.ouvrirSession({ snippet: {}, status: {} }, taille);
  assert.equal(session, 'https://upload.example/s/1');
  const video = await yt.envoyer(session, file, taille, 0);
  assert.equal(video.id, 'UPLOADED001');
  assert.deepEqual(puts.map((p) => p.range), [`bytes 0-8388607/${taille}`, `bytes 8388608-${taille - 1}/${taille}`]);
  assert.equal(puts[0].len, 8 * 1024 * 1024);
  const pos = await yt.positionSession(session, taille);
  assert.deepEqual(pos, { termine: false, offset: 8388608 });
});
