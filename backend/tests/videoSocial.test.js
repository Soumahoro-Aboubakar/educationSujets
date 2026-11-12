const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createStore, loadConfig } = require('../scripts/video/social/storage');
const { extractCode, youtubeTokens, facebookTokens } = require('../scripts/video/social/oauth');
const { youtubeClient } = require('../scripts/video/social/youtube');
const { facebookClient } = require('../scripts/video/social/facebook');
const { parseArgs, prepare, publishSocial } = require('../scripts/video/social/pipeline');
const { documentVideo } = require('../scripts/video/lib/pipeline');
const { createYoutubeClient } = require('../scripts/video/lib/youtube');
const { read, request, json } = require('../scripts/video/social/http');

// Toute requête non injectée est une erreur de test, même si des identifiants existent localement.
globalThis.fetch = async () => { throw new Error('Réseau réel interdit dans les tests sociaux.'); };

const response = (data, status = 200, headers) => new Response(JSON.stringify(data), { status, headers });
function fixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fatafalta-social-'));
  fs.chmodSync(dir, 0o700);
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const store = createStore(dir);
  const file = path.join(dir, 'video.mp4'); fs.writeFileSync(file, '0123456789');
  const opts = parseArgs(['--type', 'lecon', '--id', 'MATH-LNEXP-L1', '--fichier', file, '--publier']);
  const config = { YOUTUBE_CHANNEL_ID: 'UCtest', FACEBOOK_PAGE_ID: '42', FACEBOOK_API_VERSION: 'v25.0' };
  return { dir, store, opts, config, file };
}
function fakeDeps(store, changes = {}) {
  const calls = [];
  let doc;
  let fbPublished = false;
  const yt = { id: 'NEWVIDEO123', titre: 'Un cours', privacyStatus: 'unlisted', uploadStatus: 'processed', embeddable: true, dureeSec: 45 };
  const youtube = {
    maChaine: async () => ({ id: 'UCtest', uploads: 'UUtest' }),
    chercherParMarqueur: async () => null,
    ouvrirSession: async () => { calls.push('yt:start'); return 'https://www.googleapis.com/session'; },
    positionSession: async () => ({ offset: 5 }),
    envoyer: async (...args) => { calls.push(['yt:upload', args[3]]); return { id: yt.id }; },
    lireVideo: async () => yt,
    playlist: async () => { calls.push('playlist'); return 'PLtest'; },
    miniature: async () => { calls.push('yt:thumbnail'); },
  };
  const facebook = {
    page: async () => ({ id: '42' }), find: async () => null,
    start: async () => { calls.push('fb:start'); return { id: '99', sessionId: 's1', start: 0, end: 10 }; },
    video: async () => ({ published: fbPublished, status: { video_status: fbPublished ? 'ready' : 'uploading' } }),
    transfer: async (state, file, save) => { calls.push('fb:upload'); save({ start: file.taille, end: file.taille }); },
    finish: async () => { calls.push('fb:finish'); fbPublished = true; },
    miniature: async () => { calls.push('fb:thumbnail'); },
  };
  const db = {
    trouver: async () => doc,
    ecrire: async (cible, value) => { calls.push('db:write'); doc = value; return value; },
  };
  return { store, calls, youtube, facebook, db, sleep: async () => {}, get doc() { return doc; }, ...changes };
}

test('CLI : essai à blanc obligatoire par défaut et option explicite pour publier', () => {
  const argv = ['--type', 'lecon', '--id', 'L1', '--fichier', 'f.mp4'];
  assert.equal(parseArgs(argv).dryRun, true);
  assert.equal(parseArgs([...argv, '--publier']).dryRun, false);
  assert.throws(() => parseArgs([...argv, '--publier', '--dry-run']), /incompatibles/);
  assert.throws(() => parseArgs([...argv, '--inconnue']), /inconnue/);
  assert.throws(() => parseArgs([...argv, '--attente-minutes', 'NaN']), /attente-minutes/);
});
test('stockage : 600, hors dépôt, état corrompu refusé, verrou exclusif', (t) => {
  const { store, dir } = fixture(t);
  assert.throws(() => createStore(path.resolve(__dirname, '../social-private')), /hors dépôt/);
  store.write('youtube.json', { refresh_token: 'fake-token' });
  assert.equal(fs.statSync(path.join(dir, 'youtube.json')).mode & 0o777, 0o600);
  const release = store.lock(); assert.throws(() => store.lock(), /déjà active/); release();
  fs.chmodSync(path.join(dir, 'youtube.json'), 0o644);
  assert.throws(() => store.read('youtube.json'), /chmod/);
  fs.chmodSync(path.join(dir, 'youtube.json'), 0o600);
  fs.writeFileSync(path.join(dir, 'youtube.json'), '{invalid');
  assert.throws(() => store.read('youtube.json'), /JSON social invalide/);
  assert.throws(() => store.read('../secret.json'), /invalide/);
  fs.symlinkSync(path.join(dir, 'video.mp4'), path.join(dir, 'facebook.json'));
  assert.throws(() => store.read('facebook.json'), /symbolique/);
});
test('configuration : JSON externe et variables du processus, sans dotenv', (t) => {
  const { store } = fixture(t);
  store.write('config.json', { YOUTUBE_CLIENT_ID: 'external', YOUTUBE_PRIVACY: 'public' });
  const config = loadConfig(store, { YOUTUBE_CLIENT_ID: 'process', YOUTUBE_PLAYLISTS: '{"ENSEA-AS/Mathématiques":"PL1"}' });
  assert.equal(config.YOUTUBE_CLIENT_ID, 'process');
  assert.equal(config.YOUTUBE_PRIVACY, 'public');
  assert.equal(config.YOUTUBE_PLAYLISTS['ENSEA-AS/Mathématiques'], 'PL1');
});
test('dry-run : zéro appel aux clients, à la base ou au journal', async (t) => {
  const { opts, config, dir } = fixture(t);
  const before = fs.readdirSync(dir);
  const deps = new Proxy({}, { get() { throw new Error('Effet de bord interdit'); } });
  const result = await publishSocial({ ...opts, publier: false, dryRun: true }, config, deps);
  assert.equal(result.action, 'dry-run'); assert.equal(result.visibiliteYouTube, 'unlisted');
  assert.match(result.description, /fatafalta:lecon:MATH-LNEXP-L1:fr:/);
  assert.ok(result.playlists.some((v) => v.key.startsWith('ENSEA-AS/')));
  assert.deepEqual(fs.readdirSync(dir), before);
});
test('métadonnées, miniature, langue et concours validés avant publication', async (t) => {
  const { opts, config, dir } = fixture(t);
  const image = path.join(dir, 'mini.png'); fs.writeFileSync(image, Buffer.from([137, 80, 78, 71]));
  const plan = await prepare({ ...opts, titre: 'Cours', description: 'Description', tags: 'cours,maths', miniature: image, concours: 'ENSEA-AS' }, config);
  assert.deepEqual(plan.meta.snippet.tags, ['cours', 'maths']); assert.equal(plan.playlists.length, 1);
  assert.equal(plan.miniature.taille, 4);
  await assert.rejects(prepare({ ...opts, titre: 'x'.repeat(101) }, config), /titre/);
  await assert.rejects(prepare({ ...opts, description: 'é'.repeat(3000) }, config), /5000/);
  await assert.rejects(prepare({ ...opts, concours: 'INCONNU' }, config), /concours/);
  await assert.rejects(prepare({ ...opts, metadonnees: '/missing/.env' }, config), /interdite/);
  await assert.rejects(publishSocial({ ...opts, visibilite: 'private' }, config, {}), /private incompatible/);
});
test('OAuth : validation du state et de l’origine du retour, refus utilisateur', () => {
  const redirect = 'http://127.0.0.1:1234/callback';
  assert.equal(extractCode(`${redirect}?state=ok&code=code`, redirect, 'ok'), 'code');
  assert.throws(() => extractCode(`${redirect}?state=bad&code=code`, redirect, 'ok'), /invalide/);
  assert.throws(() => extractCode('http://evil.invalid/callback?state=ok&code=x', redirect, 'ok'), /invalide/);
  assert.throws(() => extractCode(`${redirect}?state=ok&error=access_denied`, redirect, 'ok'), /refusée/);
});
test('YouTube login : PKCE, scope playlists, loopback et refresh token protégé', async (t) => {
  const { store } = fixture(t); let body;
  const tokens = youtubeTokens({ YOUTUBE_CLIENT_ID: 'client', YOUTUBE_CLIENT_SECRET: 'secret' }, store, async (url, init) => {
    body = init.body; return response({ access_token: 'fake-access', refresh_token: 'fake-refresh', expires_in: 3600 });
  });
  await tokens.login(async (grant) => {
    assert.equal(grant.loopback, true); assert.equal(grant.params.code_challenge_method, 'S256');
    assert.equal(grant.params.access_type, 'offline'); assert.match(grant.params.scope, /auth\/youtube$/);
    return { code: 'fake-code', redirect: 'http://127.0.0.1:1234/callback' };
  });
  assert.equal(body.get('grant_type'), 'authorization_code'); assert.ok(body.get('code_verifier'));
  assert.equal(store.read('youtube.json').refresh_token, 'fake-refresh');
});
test('YouTube refresh : rotation persistée, cache puis rafraîchissement sur demande', async (t) => {
  const { store } = fixture(t); let count = 0;
  store.write('youtube.json', { clientId: 'client', access_token: 'expired', refresh_token: 'fake-refresh', expiresAt: 0 });
  const tokens = youtubeTokens({ YOUTUBE_CLIENT_ID: 'client', YOUTUBE_CLIENT_SECRET: 'secret' }, store, async (url, init) => {
    assert.equal(init.body.get('refresh_token'), count ? 'rotated' : 'fake-refresh'); count += 1;
    return response({ access_token: `access-${count}`, refresh_token: 'rotated', expires_in: 3600 });
  });
  assert.equal(await tokens.access(), 'access-1'); assert.equal(await tokens.access(), 'access-1');
  assert.equal(await tokens.access(true), 'access-2'); assert.equal(count, 2);
});
test('Facebook OAuth : échange longue durée, pagination des Pages, régénération du jeton de Page', async (t) => {
  const { store, config } = fixture(t); const calls = [];
  const full = { ...config, FACEBOOK_APP_ID: 'app', FACEBOOK_APP_SECRET: 'secret', FACEBOOK_REDIRECT_URI: 'https://example.test/callback', FACEBOOK_SCOPES: 'pages_show_list,pages_manage_posts' };
  const tokens = facebookTokens(full, store, async (url, init) => {
    const u = new URL(url); calls.push(u);
    if (u.pathname.endsWith('/oauth/access_token')) return response({ access_token: u.searchParams.has('fb_exchange_token') ? 'long-user' : 'short-user', expires_in: 5184000 });
    assert.equal(init.headers.Authorization, 'Bearer long-user');
    return u.searchParams.has('after') ? response({ data: [{ id: '42', access_token: 'page-token' }] })
      : response({ data: [{ id: '1' }], paging: { next: 'unused', cursors: { after: 'cursor' } } });
  });
  await tokens.login(async (grant) => {
    assert.equal(grant.loopback, false); return { code: 'code', redirect: full.FACEBOOK_REDIRECT_URI };
  });
  assert.equal(await tokens.access(), 'page-token');
  assert.equal(await tokens.access(true), 'page-token');
  assert.equal(store.read('facebook.json').userToken, 'long-user');
  assert.equal(calls.filter((u) => u.pathname.endsWith('/oauth/access_token')).length, 2);
});
test('publication : YouTube puis Facebook puis contrat publish.js, relance sans doublon', async (t) => {
  const { store, opts, config } = fixture(t); const deps = fakeDeps(store);
  const result = await publishSocial(opts, config, deps);
  assert.equal(result.url, 'https://www.youtube.com/watch?v=NEWVIDEO123'); assert.equal(result.facebookId, '99');
  assert.ok(deps.calls.indexOf('yt:start') < deps.calls.indexOf('fb:start'));
  assert.ok(deps.calls.indexOf('fb:finish') < deps.calls.indexOf('db:write'));
  assert.equal(deps.doc.status, 'published'); assert.equal(deps.doc.youtubeId, 'NEWVIDEO123');
  const before = [...deps.calls]; await publishSocial(opts, config, deps);
  assert.deepEqual(deps.calls, before);
});
test('échec MongoDB : relance sans nouvel upload ni nouvel ajout en playlist', async (t) => {
  const { store, opts, config } = fixture(t); const deps = fakeDeps(store); const write = deps.db.ecrire;
  deps.db.ecrire = async () => { throw new Error('db hors ligne'); };
  await assert.rejects(publishSocial(opts, config, deps), /db hors ligne/);
  const playlistsBeforeRetry = deps.calls.filter((c) => c === 'playlist').length;
  deps.db.ecrire = write; await publishSocial(opts, config, deps);
  assert.equal(deps.calls.filter((c) => c === 'yt:start').length, 1);
  assert.equal(deps.calls.filter((c) => c === 'fb:start').length, 1);
  assert.equal(deps.calls.filter((c) => c === 'playlist').length, playlistsBeforeRetry);
});
test('Facebook interrompu : conserver YouTube et la même session Facebook', async (t) => {
  const { store, opts, config } = fixture(t); const deps = fakeDeps(store); const transfer = deps.facebook.transfer;
  deps.facebook.transfer = async () => { throw new Error('coupure Facebook'); };
  await assert.rejects(publishSocial(opts, config, deps), /coupure Facebook/);
  deps.facebook.transfer = transfer; await publishSocial(opts, config, deps);
  assert.equal(deps.calls.filter((c) => c === 'yt:start').length, 1);
  assert.equal(deps.calls.filter((c) => c === 'fb:start').length, 1);
});
test('reprise YouTube : interroger la session puis reprendre à l’offset serveur', async (t) => {
  const { store, opts, config } = fixture(t); const deps = fakeDeps(store); const send = deps.youtube.envoyer;
  deps.youtube.envoyer = async () => { throw new Error('coupure YouTube'); };
  await assert.rejects(publishSocial(opts, config, deps), /coupure YouTube/);
  deps.youtube.envoyer = send; await publishSocial(opts, config, deps);
  assert.ok(deps.calls.some((c) => Array.isArray(c) && c[1] === 5));
  assert.equal(deps.calls.filter((c) => c === 'yt:start').length, 1);
});
test('session YouTube complète : récupérer la réponse finale sans envoyer de bloc', async (t) => {
  const { store, opts, config } = fixture(t); const deps = fakeDeps(store);
  deps.youtube.envoyer = async () => { throw new Error('réponse finale perdue'); };
  await assert.rejects(publishSocial(opts, config, deps));
  deps.youtube.positionSession = async () => ({ termine: true, video: { id: 'NEWVIDEO123' } });
  await publishSocial(opts, config, deps);
  assert.equal(deps.doc.youtubeId, 'NEWVIDEO123');
});
test('session YouTube expirée : conserver le journal et refuser un second upload', async (t) => {
  const { store, opts, config } = fixture(t); const deps = fakeDeps(store);
  deps.youtube.envoyer = async () => { throw new Error('coupure'); };
  await assert.rejects(publishSocial(opts, config, deps));
  deps.youtube.positionSession = async () => null;
  await assert.rejects(publishSocial(opts, config, deps), /expirée/);
  assert.equal(deps.calls.filter((v) => v === 'yt:start').length, 1);
});
test('finalisation Facebook : réponse perdue puis traitement, sans nouvel envoi ni second finish', async (t) => {
  const { store, opts, config } = fixture(t); const deps = fakeDeps(store);
  let finishes = 0;
  deps.facebook.finish = async () => { finishes += 1; throw new Error('réponse perdue'); };
  await assert.rejects(publishSocial(opts, config, deps));
  let reads = 0;
  deps.facebook.video = async () => ++reads === 1
    ? { published: false, status: { video_status: 'processing', publishing_phase: { status: 'in_progress' } } }
    : { published: true, status: { video_status: 'ready' } };
  await publishSocial(opts, config, deps);
  assert.equal(finishes, 1); assert.equal(deps.calls.filter((v) => v === 'fb:upload').length, 1);
});
test('Facebook refusé après finish : ne jamais enregistrer le lien en base', async (t) => {
  const { store, opts, config } = fixture(t); const deps = fakeDeps(store);
  deps.facebook.video = async () => ({ published: false, status: { video_status: 'error' } });
  await assert.rejects(publishSocial(opts, config, deps), /Facebook non terminé/);
  assert.ok(!deps.calls.includes('db:write'));
});
test('création YouTube incertaine : refuser une seconde création, puis réconcilier le marqueur', async (t) => {
  const { store, opts, config } = fixture(t); const deps = fakeDeps(store); let starts = 0;
  deps.youtube.ouvrirSession = async () => { starts += 1; throw new Error('réponse perdue'); };
  await assert.rejects(publishSocial(opts, config, deps), /perdue/);
  await assert.rejects(publishSocial(opts, config, deps), /incertaine/); assert.equal(starts, 1);
  deps.youtube.chercherParMarqueur = async () => 'NEWVIDEO123';
  await publishSocial(opts, config, deps); assert.equal(starts, 1);
});
test('création Facebook incertaine : ne pas recommencer start', async (t) => {
  const { store, opts, config } = fixture(t); const deps = fakeDeps(store); let starts = 0;
  deps.facebook.start = async () => { starts += 1; throw new Error('réponse perdue'); };
  await assert.rejects(publishSocial(opts, config, deps));
  await assert.rejects(publishSocial(opts, config, deps), /incertaine/); assert.equal(starts, 1);
});
test('journal perdu : retrouver les deux marqueurs sans nouvel upload', async (t) => {
  const { store, opts, config } = fixture(t); const deps = fakeDeps(store);
  deps.youtube.chercherParMarqueur = async () => 'NEWVIDEO123'; deps.facebook.find = async () => '99';
  deps.facebook.video = async () => ({ published: true, status: { video_status: 'ready' } });
  await publishSocial(opts, config, deps);
  assert.ok(!deps.calls.includes('yt:start')); assert.ok(!deps.calls.includes('fb:start'));
});
test('contrôles : autre vidéo en base, chaîne et Page incorrectes, vidéo privée ou refusée', async (t) => {
  const { store, opts, config } = fixture(t); const deps = fakeDeps(store);
  deps.db.trouver = async () => ({ source: { fichierSha256: 'other' } });
  await assert.rejects(publishSocial(opts, config, deps), /remplacer/); assert.deepEqual(deps.calls, []);
  deps.db.trouver = async () => null;
  await assert.rejects(publishSocial(opts, { ...config, YOUTUBE_CHANNEL_ID: 'other' }, deps), /chaîne/);
  await assert.rejects(publishSocial(opts, { ...config, FACEBOOK_PAGE_ID: 'other' }, deps), /Page/);
  deps.youtube.lireVideo = async () => ({ privacyStatus: 'private', uploadStatus: 'processed', embeddable: true });
  await assert.rejects(publishSocial(opts, config, deps), /visibilité/);
  assert.ok(!deps.calls.includes('fb:start')); assert.ok(!deps.calls.includes('db:write'));
});
test('miniatures envoyées aux deux plateformes une seule fois', async (t) => {
  const { store, opts, config, dir } = fixture(t); const deps = fakeDeps(store);
  const image = path.join(dir, 'image.jpg'); fs.writeFileSync(image, 'fake-image');
  await publishSocial({ ...opts, miniature: image }, config, deps);
  await publishSocial({ ...opts, miniature: image }, config, deps);
  assert.equal(deps.calls.filter((c) => c === 'yt:thumbnail').length, 1);
  assert.equal(deps.calls.filter((c) => c === 'fb:thumbnail').length, 1);
  await assert.rejects(publishSocial({ ...opts, titre: 'Autre titre' }, config, deps), /métadonnées diffèrent/);
});
test('contrat base : public existant et unlisted social, toujours refus des vidéos privées', () => {
  const input = { cible: { empreinte: 'content' }, video: { privacyStatus: 'unlisted', embeddable: true, uploadStatus: 'processed' }, youtubeId: 'NEWVIDEO123', fichierSha256: 'a' };
  assert.throws(() => documentVideo(input), /visibilité/);
  assert.equal(documentVideo({ ...input, visibilites: ['public', 'unlisted'] }).url, 'https://www.youtube.com/watch?v=NEWVIDEO123');
});
test('YouTube : session 503 ne devient jamais une session expirée', async () => {
  const client = createYoutubeClient({ tokenProvider: async () => 'fake', fetchImpl: async () => response({}, 503) });
  await assert.rejects(client.positionSession('https://www.googleapis.com/session', 10), /503/);
});
test('YouTube : refresh sur 401 et pagination des marqueurs', async () => {
  const refreshes = []; let calls = 0;
  const tokens = { access: async (force) => { refreshes.push(Boolean(force)); return force ? 'new' : 'cached'; } };
  const client = youtubeClient(tokens, async (url) => {
    calls += 1;
    if (calls === 1) return response({}, 401);
    return new URL(url).searchParams.has('pageToken')
      ? response({ items: [{ snippet: { description: 'marker', resourceId: { videoId: 'NEWVIDEO123' } } }] })
      : response({ items: [], nextPageToken: 'next' });
  });
  assert.equal(await client.chercherParMarqueur('UUtest', 'marker'), 'NEWVIDEO123');
  assert.ok(refreshes.includes(true));
});
test('YouTube playlists : retrouver la playlist et son membre existants sans création', async () => {
  const calls = [];
  const client = youtubeClient({ access: async () => 'fake' }, async (url, init = {}) => {
    calls.push(init.method || 'GET');
    if (url.includes('/playlists?')) return response({ items: [{ id: 'PL1', snippet: { title: 'Fatafalta | ENSEA-AS | Maths' } }] });
    assert.equal(new URL(url).searchParams.get('videoId'), 'NEWVIDEO123');
    return response({ items: [{ id: 'membership' }] });
  });
  assert.equal(await client.playlist('NEWVIDEO123', 'Fatafalta | ENSEA-AS | Maths'), 'PL1');
  assert.deepEqual(calls, ['GET', 'GET']);
});
test('YouTube miniature : upload média binaire avec jeton en en-tête', async (t) => {
  const { file } = fixture(t);
  const client = youtubeClient({ access: async () => 'fake-access' }, async (url, init) => {
    assert.equal(new URL(url).searchParams.get('uploadType'), 'media');
    assert.equal(new URL(url).searchParams.get('videoId'), 'NEWVIDEO123');
    assert.equal(init.method, 'POST'); assert.ok(Buffer.isBuffer(init.body));
    assert.equal(init.headers.Authorization, 'Bearer fake-access');
    return response({ items: [] });
  });
  await client.miniature('NEWVIDEO123', file);
});
test('Facebook : jeton expiré code 190, renouvellement puis même requête autorisée', async (t) => {
  const { config } = fixture(t); let count = 0; let forceRefresh = false;
  const client = facebookClient(config, { access: async (force) => { forceRefresh ||= force; return 'fake'; } }, async () => {
    count += 1; return count === 1 ? response({ error: { code: 190 } }, 400) : response({ id: '42' });
  });
  assert.equal((await client.page()).id, '42'); assert.equal(forceRefresh, true); assert.equal(count, 2);
});
test('Facebook REST : start, transfert multipart, offset repris puis finish sur la même session', async (t) => {
  const { config, file } = fixture(t); const calls = [];
  const client = facebookClient(config, { access: async () => 'fake-page' }, async (url, init) => {
    assert.equal(init.headers.Authorization, 'Bearer fake-page'); assert.ok(!url.includes('fake-page'));
    calls.push(init.body);
    switch (init.body.get('upload_phase')) {
      case 'start': assert.equal(init.body.get('file_size'), '10'); return response({ video_id: '99', upload_session_id: 's1', start_offset: '0', end_offset: '5' });
      case 'transfer': {
        const start = Number(init.body.get('start_offset')); assert.equal(init.body.get('upload_session_id'), 's1');
        assert.equal(await init.body.get('video_file_chunk').text(), start === 0 ? '01234' : '56789');
        return response({ start_offset: String(start + 5), end_offset: '10' });
      }
      case 'finish': assert.equal(init.body.get('published'), 'true'); return response({ success: true });
      default: throw new Error('Phase inattendue');
    }
  });
  const state = await client.start(10); const offsets = [];
  await client.transfer(state, { chemin: file, taille: 10 }, (p) => offsets.push(p.start));
  await client.finish(state, { snippet: { title: 'Cours', description: 'Description' } });
  assert.deepEqual(offsets, [5, 10]); assert.equal(calls.length, 4);
});
test('Facebook REST : offset serveur après une réponse perdue, sans nouvelle session', async (t) => {
  const { config, file } = fixture(t); let count = 0; const offsets = [];
  const client = facebookClient(config, { access: async () => 'fake' }, async () => {
    count += 1;
    return count === 1 ? response({ error: { code: 100, error_data: { start_offset: '5', end_offset: '10' } } }, 400)
      : response({ start_offset: '10', end_offset: '10' });
  });
  await client.transfer({ sessionId: 's1', start: 0, end: 5 }, { chemin: file, taille: 10 }, (p) => offsets.push(p.start));
  assert.deepEqual(offsets, [5, 10]);
});
test('HTTP : erreurs filtrées, retries de lecture avec backoff, pas de répétition aveugle des créations', async () => {
  const pauses = []; let count = 0;
  const result = await read(async () => response({}, ++count < 3 ? 503 : 200), 'https://example.test', {}, async (ms) => pauses.push(ms));
  assert.equal(result.status, 200); assert.deepEqual(pauses, [1000, 2000]);
  await assert.rejects(json(response({ error: { message: 'SECRET', code: 190 } }, 400), 'Facebook'), (e) => !e.message.includes('SECRET'));
  await assert.rejects(request(async () => { throw new Error('SECRET'); }, 'https://example.test'), (e) => !e.message.includes('SECRET'));
});

const crypto = require('node:crypto');
const { tiktokTokens } = require('../scripts/video/social/tiktok-oauth');
const { tiktokClient, tiktokJson, chunkPlan } = require('../scripts/video/social/tiktok');
const { probeMp4, validateMedia } = require('../scripts/video/social/tiktok-media');
const { platforms } = require('../scripts/video/social/pipeline');
const okTiktok = (data) => response({ data, error: { code: 'ok', message: '' } });
const creatorTiktok = { creator_nickname: 'Fatafalta test', max_video_post_duration_sec: 180,
  privacy_level_options: ['SELF_ONLY'], comment_disabled: true, duet_disabled: true, stitch_disabled: true };

// Un véritable conteneur ISO-BMFF minimal, sans dépendance ni binaire multimédia.
function mp4Fixture(file, { width = 1080, height = 1920, seconds = 45, fps = 30, codec = 'avc1', rotated = false, version = 0 } = {}) {
  const box = (type, ...parts) => { const b = Buffer.concat(parts); const h = Buffer.alloc(8); h.writeUInt32BE(b.length + 8); h.write(type, 4); return Buffer.concat([h, b]); };
  const time = Buffer.alloc(version ? 36 : 24); time[0] = version;
  time.writeUInt32BE(30000, version ? 20 : 12);
  if (version) time.writeBigUInt64BE(BigInt(seconds * 30000), 24); else time.writeUInt32BE(seconds * 30000, 16);
  const tkhd = Buffer.alloc(version ? 96 : 84); tkhd[0] = version;
  const m = version ? 52 : 40; const dim = version ? 88 : 76;
  if (rotated) { tkhd.writeInt32BE(65536, m + 4); tkhd.writeInt32BE(-65536, m + 12); }
  else { tkhd.writeInt32BE(65536, m); tkhd.writeInt32BE(65536, m + 16); }
  tkhd.writeUInt32BE(width * 65536, dim); tkhd.writeUInt32BE(height * 65536, dim + 4);
  const hdlr = Buffer.alloc(12); hdlr.write('vide', 8);
  const sample = Buffer.alloc(78); sample.writeUInt16BE(width, 24); sample.writeUInt16BE(height, 26);
  const stsdHeader = Buffer.alloc(8); stsdHeader.writeUInt32BE(1, 4);
  const stts = Buffer.alloc(16); stts.writeUInt32BE(1, 4); stts.writeUInt32BE(seconds * fps, 8); stts.writeUInt32BE(30000 / fps, 12);
  fs.writeFileSync(file, Buffer.concat([
    box('ftyp', Buffer.from('isom\0\0\0\0mp42')), box('mdat', Buffer.alloc(8)),
    box('moov', box('mvhd', time), box('trak', box('tkhd', tkhd), box('mdia', box('mdhd', time), box('hdlr', hdlr),
      box('minf', box('stbl', box('stsd', stsdHeader, box(codec, sample)), box('stts', stts))))))]));
}
function tiktokFixture(t, extra = {}) {
  const f = fixture(t); const clip = path.join(f.dir, 'extrait.mp4'); mp4Fixture(clip, extra);
  f.opts = { ...f.opts, tiktok: true, 'tiktok-fichier': clip, 'tiktok-visibilite': 'SELF_ONLY' };
  f.config = { ...f.config, TIKTOK_CLIENT_KEY: 'fake-key', TIKTOK_OPEN_ID: 'fake-user' };
  const deps = fakeDeps(f.store); let complete = false;
  deps.output = () => {};
  deps.tiktok = {
    identity: async () => 'fake-user', creator: async () => creatorTiktok,
    start: async () => { deps.calls.push('tt:start'); return { publishId: 'pub1' }; },
    status: async () => complete ? { status: 'PUBLISH_COMPLETE' } : { status: 'PROCESSING_UPLOAD', uploaded_bytes: 0 },
    transfer: async () => { deps.calls.push('tt:upload'); complete = true; },
  };
  return { ...f, clip, deps };
}
test('plateformes : activation indépendante, valeurs strictes et conflits', () => {
  assert.deepEqual(platforms({}, {}), { youtube: true, facebook: true, tiktok: false });
  assert.deepEqual(platforms({ 'sans-youtube': true, tiktok: true }, { FACEBOOK_ENABLED: 'false' }), { youtube: false, facebook: false, tiktok: true });
  assert.throws(() => platforms({ youtube: true, 'sans-youtube': true }, {}), /incompatibles/);
  assert.throws(() => platforms({}, { TIKTOK_ENABLED: 'yes' }), /true ou false/);
  assert.throws(() => platforms({ 'sans-youtube': true, 'sans-facebook': true }, {}), /au moins/);
});
test('TikTok OAuth : loopback, PKCE hex Desktop, portées, jetons 600 et rotation', async (t) => {
  const { store, dir } = fixture(t); let grant; let refreshed = false;
  const config = { TIKTOK_CLIENT_KEY: 'fake-key', TIKTOK_CLIENT_SECRET: 'fake-secret' };
  const tokens = tiktokTokens(config, store, async (url, init) => {
    assert.equal(url, 'https://open.tiktokapis.com/v2/oauth/token/');
    assert.equal(init.redirect, 'error'); assert.equal(init.body.get('client_secret'), 'fake-secret');
    if (init.body.get('grant_type') === 'authorization_code') {
      assert.equal(crypto.createHash('sha256').update(init.body.get('code_verifier')).digest('hex'), grant.params.code_challenge);
      assert.equal(init.body.get('redirect_uri'), grant.redirect);
    } else { assert.equal(init.body.get('refresh_token'), 'refresh1'); refreshed = true; }
    return response({ access_token: refreshed ? 'access2' : 'access1', refresh_token: refreshed ? 'refresh2' : 'refresh1',
      open_id: 'user1', scope: 'video.publish,video.upload', expires_in: 7200, refresh_expires_in: 86400 });
  });
  await tokens.login(async (input) => { grant = input; return { code: 'code1', redirect: input.redirect }; });
  assert.equal(grant.loopback, true); assert.equal(grant.redirect, 'http://127.0.0.1:53684/callback/');
  assert.equal(grant.params.scope, 'video.publish,video.upload'); assert.equal(grant.params.code_challenge_method, 'S256');
  assert.equal(fs.statSync(path.join(dir, 'tiktok.json')).mode & 0o777, 0o600);
  assert.equal(await tokens.access(), 'access1'); assert.equal(refreshed, false);
  assert.equal(await tokens.access(true), 'access2'); assert.equal(store.read('tiktok.json').refresh_token, 'refresh2');
  assert.equal(await tokens.identity(), 'user1');
  const bad = tiktokTokens({ ...config, TIKTOK_OPEN_ID: 'other' }, store);
  await assert.rejects(bad.access(), /Compte TikTok différent/);
  store.write('tiktok.json', { ...store.read('tiktok.json'), expiresAt: 0, refreshExpiresAt: 0 });
  await assert.rejects(tokens.access(), /expiré/);
});
test('TikTok OAuth : redirection distante et permissions manquantes refusées, erreurs filtrées', async (t) => {
  const { store } = fixture(t); const config = { TIKTOK_CLIENT_KEY: 'key', TIKTOK_CLIENT_SECRET: 'secret' };
  await assert.rejects(tiktokTokens({ ...config, TIKTOK_REDIRECT_URI: 'https://example.test/callback' }, store).login(), /loopback/);
  const tokens = tiktokTokens(config, store, async () => response({ access_token: 'a', refresh_token: 'r', open_id: 'u',
    scope: 'video.upload', expires_in: 7200, refresh_expires_in: 86400 }));
  await assert.rejects(tokens.login(async () => ({ code: 'c', redirect: 'http://127.0.0.1:53684/callback/' })), /portées/);
  assert.equal(store.read('tiktok.json'), null);
  await assert.rejects(tiktokJson(response({ error: 'invalid_grant', error_description: 'SECRET' }, 400)), (e) => /invalid_grant/.test(e.message) && !e.message.includes('SECRET'));
  assert.deepEqual(await tiktokJson(okTiktok({ status: 'ok' })), { data: { status: 'ok' }, error: { code: 'ok', message: '' } });
});
test('TikTok MP4 : lecture native, rotation et durées 64 bits ; format, dimensions, FPS et durée refusés', (t) => {
  const { file } = fixture(t); mp4Fixture(file);
  const media = probeMp4(file); assert.equal(media.width, 1080); assert.equal(media.height, 1920); assert.equal(media.durationSec, 45);
  assert.equal(validateMedia(media).codec, 'avc1');
  mp4Fixture(file, { width: 1920, height: 1080, rotated: true, version: 1 });
  assert.equal(validateMedia(probeMp4(file)).width, 1080);
  for (const changes of [{ width: 1920, height: 1080 }, { seconds: 181 }, { fps: 15 }, { fps: 120 }, { codec: 'mp4v' }, { width: 320 }, { height: 4200 }]) {
    mp4Fixture(file, changes); assert.throws(() => validateMedia(probeMp4(file)), /extrait vertical|extrait|tiktok-fichier/);
  }
  assert.throws(() => validateMedia(media, 30), /durée ≤30/);
  assert.throws(() => validateMedia(media, NaN), /TIKTOK_MAX/);
  fs.writeFileSync(file, 'not a video'); assert.throws(() => probeMp4(file), /MP4 standard/);
});
test('TikTok dry-run : sonde locale, options explicites et aucune lecture du journal ni réseau', async (t) => {
  const { opts, config, dir } = tiktokFixture(t); const before = fs.readdirSync(dir);
  const result = await publishSocial({ ...opts, dryRun: true, publier: false }, config, new Proxy({}, { get() { throw new Error('Effet de bord'); } }));
  assert.equal(result.tiktok.media.height, 1920); assert.equal(result.tiktok.postInfo.privacy_level, 'SELF_ONLY');
  assert.equal(result.tiktok.postInfo.disable_comment, true); assert.deepEqual(fs.readdirSync(dir), before);
  await assert.rejects(prepare({ ...opts, 'tiktok-visibilite': undefined }, config), /visibilite requis/);
  await assert.rejects(prepare({ ...opts, 'tiktok-legende': 'a'.repeat(2201) }, config), /2200/);
});
test('TikTok FILE_UPLOAD : floor, dernier morceau fusionné, PUT séquentiels, reprise serveur et sans Bearer', async (t) => {
  const { file } = fixture(t); fs.truncateSync(file, 20_000_123);
  assert.deepEqual(chunkPlan(4_000_000), { chunkSize: 4_000_000, chunkCount: 1 });
  assert.deepEqual(chunkPlan(50_000_123), { chunkSize: 10_000_000, chunkCount: 5 });
  assert.deepEqual(chunkPlan(64_000_001), { chunkSize: 10_000_000, chunkCount: 6 });
  assert.throws(() => chunkPlan(0), /Taille/);
  const ranges = []; let initCount = 0; const checkpoints = [];
  const client = tiktokClient({ access: async () => 'fake-access' }, async (url, init) => {
    if (init.method === 'POST') {
      initCount += 1; const body = JSON.parse(init.body);
      assert.equal(body.source_info.total_chunk_count, 2); assert.equal(body.source_info.source, 'FILE_UPLOAD');
      assert.equal(init.headers.Authorization, 'Bearer fake-access');
      return okTiktok({ publish_id: 'p1', upload_url: 'https://open-upload.tiktokapis.com/video/?upload_token=SECRET' });
    }
    assert.ok(!init.headers.Authorization); assert.ok(url.endsWith('upload_token=SECRET'));
    ranges.push(init.headers['Content-Range']); assert.equal(init.body.length, Number(init.headers['Content-Length']));
    return new Response(null, { status: ranges.length === 1 ? 206 : 201 });
  });
  const f = { chemin: file, taille: 20_000_123 }; const state = await client.start(f, { privacy_level: 'SELF_ONLY' });
  await client.transfer(state, f, 0, (patch) => checkpoints.push(patch.offset));
  assert.deepEqual(ranges, ['bytes 0-9999999/20000123', 'bytes 10000000-20000122/20000123']);
  assert.deepEqual(checkpoints, [10_000_000, 20_000_123]);
  await client.transfer(state, f, 10_000_000, () => {}); assert.equal(ranges.length, 3); assert.equal(initCount, 1);
  await assert.rejects(client.transfer(state, f, 5, () => {}), /Offset/);
  await assert.rejects(client.transfer({ ...state, uploadUrl: 'https://evil.test/?SECRET' }, f, 0, () => {}), (e) => /non autorisée/.test(e.message) && !e.message.includes('SECRET'));
});
test('TikTok client : statut POST en lecture, renouvellement 401 et erreurs HTTP 200 gérées', async () => {
  let force = false; let calls = 0;
  const client = tiktokClient({ access: async (refresh) => { force ||= refresh; return 'fake'; } }, async (url, init) => {
    calls += 1; assert.ok(url.endsWith('status/fetch/')); assert.equal(JSON.parse(init.body).publish_id, 'p1');
    return calls === 1 ? response({}, 401) : okTiktok({ status: 'PUBLISH_COMPLETE' });
  });
  assert.equal((await client.status('p1')).status, 'PUBLISH_COMPLETE'); assert.equal(force, true);
  await assert.rejects(tiktokJson(response({ error: { code: 'spam_risk_too_many_posts', message: 'SECRET' } })), /spam_risk_too_many_posts/);
});
test('pipeline : YouTube → Facebook → TikTok → base, relance sans doublon', async (t) => {
  const { opts, config, deps } = tiktokFixture(t);
  const result = await publishSocial(opts, config, deps); assert.equal(result.tiktokPublishId, 'pub1');
  assert.ok(deps.calls.indexOf('fb:finish') < deps.calls.indexOf('tt:start'));
  assert.ok(deps.calls.indexOf('tt:upload') < deps.calls.indexOf('db:write'));
  const before = [...deps.calls]; await publishSocial(opts, config, deps); assert.deepEqual(deps.calls, before);
});
test('TikTok seul : aucune configuration, connexion, lecture ou écriture YouTube/Facebook/MongoDB', async (t) => {
  const { opts, config, deps } = tiktokFixture(t);
  delete config.YOUTUBE_CHANNEL_ID; delete config.FACEBOOK_PAGE_ID; delete config.FACEBOOK_API_VERSION;
  deps.youtube = deps.facebook = deps.db = new Proxy({}, { get() { throw new Error('Plateforme désactivée'); } });
  const result = await publishSocial({ ...opts, 'sans-youtube': true, 'sans-facebook': true }, config, deps);
  assert.equal(result.action, 'publiee'); assert.deepEqual(deps.calls, ['tt:start', 'tt:upload']);
});
test('YouTube seul et Facebook seul : plateformes inactives jamais appelées', async (t) => {
  for (const active of ['youtube', 'facebook']) {
    const { opts, config, store } = fixture(t); const deps = fakeDeps(store);
    const inactive = active === 'youtube' ? 'facebook' : 'youtube';
    deps[inactive] = new Proxy({}, { get() { throw new Error('Plateforme inactive'); } });
    if (inactive === 'youtube') deps.db = deps[inactive];
    await publishSocial({ ...opts, [`sans-${inactive}`]: true }, config, deps);
    assert.ok(deps.calls.includes(active === 'youtube' ? 'yt:start' : 'fb:start'));
    assert.equal(deps.calls.includes('db:write'), active === 'youtube');
  }
});
test('TikTok : restrictions du compte et fichier invalide bloquent avant tout envoi', async (t) => {
  const { opts, config, deps, clip } = tiktokFixture(t);
  deps.tiktok.creator = async () => ({ ...creatorTiktok, max_video_post_duration_sec: 30 });
  await assert.rejects(publishSocial(opts, config, deps), /durée ≤30/); assert.deepEqual(deps.calls, []);
  deps.tiktok.creator = async () => ({ ...creatorTiktok, privacy_level_options: ['PUBLIC_TO_EVERYONE'] });
  await assert.rejects(publishSocial(opts, config, deps), /Visibilité TikTok/); assert.deepEqual(deps.calls, []);
  deps.tiktok.creator = async () => creatorTiktok;
  await assert.rejects(publishSocial({ ...opts, 'tiktok-commentaires': true }, config, deps), /Interaction TikTok/);
  deps.tiktok.identity = async () => 'other';
  await assert.rejects(publishSocial(opts, config, deps), /Compte TikTok différent/); assert.deepEqual(deps.calls, []);
  mp4Fixture(clip, { width: 1920, height: 1080 });
  await assert.rejects(publishSocial(opts, config, deps), /format vertical/); assert.deepEqual(deps.calls, []);
});
test('TikTok : création incertaine jamais répétée, journal conservé', async (t) => {
  const { opts, config, deps } = tiktokFixture(t); let starts = 0;
  deps.tiktok.start = async () => { starts += 1; throw new Error('réponse perdue'); };
  await assert.rejects(publishSocial(opts, config, deps), /perdue/);
  await assert.rejects(publishSocial(opts, config, deps), /Création TikTok incertaine/);
  assert.equal(starts, 1); assert.ok(!deps.calls.includes('db:write'));
});
test('TikTok : réponse PUT perdue, reprise uploaded_bytes sur le même publish_id et pas de doublon', async (t) => {
  const { opts, config, deps } = tiktokFixture(t); let uploaded = false; const offsets = [];
  deps.tiktok.transfer = async () => { uploaded = true; throw new Error('PUT perdu'); };
  await assert.rejects(publishSocial(opts, config, deps), /PUT perdu/);
  deps.tiktok.status = async (id) => { assert.equal(id, 'pub1'); return { status: 'PROCESSING_UPLOAD', uploaded_bytes: uploaded ? 123 : 0 }; };
  deps.tiktok.transfer = async (state, file, offset) => { offsets.push(offset); deps.tiktok.status = async () => ({ status: 'PUBLISH_COMPLETE' }); };
  await publishSocial(opts, config, deps); assert.deepEqual(offsets, [123]);
  assert.equal(deps.calls.filter((v) => v === 'tt:start').length, 1);
  assert.equal(deps.calls.filter((v) => v === 'yt:start').length, 1);
});
test('TikTok : FAILED, timeout et métadonnées changées empêchent une recréation et la base', async (t) => {
  const { opts, config, deps } = tiktokFixture(t);
  deps.tiktok.status = async () => ({ status: 'FAILED', fail_reason: 'SECRET' });
  await assert.rejects(publishSocial(opts, config, deps), (e) => /FAILED/.test(e.message) && !e.message.includes('SECRET'));
  deps.tiktok.status = async () => ({ status: 'PROCESSING_DOWNLOAD' });
  await assert.rejects(publishSocial({ ...opts, attenteMinutes: 1e-12 }, config, deps), /Traitement TikTok en cours/);
  await assert.rejects(publishSocial({ ...opts, 'tiktok-legende': 'Autre' }, config, deps), /différents du journal/);
  assert.equal(deps.calls.filter((v) => v === 'tt:start').length, 1); assert.ok(!deps.calls.includes('db:write'));
});
test('TikTok : échec MongoDB et activation différée conservent le post TikTok', async (t) => {
  const { opts, config, deps } = tiktokFixture(t); const write = deps.db.ecrire;
  await publishSocial({ ...opts, tiktok: false, 'sans-tiktok': true }, config, deps);
  deps.db.ecrire = write; // L'activation TikTok conserve les journaux YouTube/Facebook existants.
  await publishSocial(opts, config, deps);
  const ytStarts = deps.calls.filter((v) => v === 'yt:start').length;
  deps.db.trouver = async () => null;
  deps.db.ecrire = async () => { throw new Error('DB indisponible'); };
  await assert.rejects(publishSocial(opts, config, deps), /DB indisponible/);
  deps.db.ecrire = write; await publishSocial(opts, config, deps);
  assert.equal(deps.calls.filter((v) => v === 'tt:start').length, 1);
  assert.equal(deps.calls.filter((v) => v === 'yt:start').length, ytStarts);
});

test('TikTok client et pipeline : réponse PUT perdue après réception complète, statut réconcilié sans renvoi', async (t) => {
  const { opts, config, deps, clip } = tiktokFixture(t); let uploaded = false; let starts = 0; let puts = 0; let statuses = 0;
  deps.tiktok = tiktokClient({ identity: async () => 'fake-user', access: async () => 'fake-token' }, async (url, init) => {
    if (url.endsWith('creator_info/query/')) return okTiktok(creatorTiktok);
    if (url.endsWith('video/init/')) {
      starts += 1; return okTiktok({ publish_id: 'real-client-pub', upload_url: 'https://open-upload.tiktokapis.com/video/?token=fake' });
    }
    if (url.endsWith('status/fetch/')) {
      statuses += 1; assert.equal(JSON.parse(init.body).publish_id, 'real-client-pub');
      return okTiktok(uploaded ? { status: 'PUBLISH_COMPLETE' } : { status: 'PROCESSING_UPLOAD', uploaded_bytes: 0 });
    }
    assert.equal(init.method, 'PUT'); assert.equal(init.body.length, fs.statSync(clip).size);
    puts += 1; uploaded = true; throw new Error('Réponse perdue avec secret simulé');
  });
  await assert.rejects(publishSocial(opts, config, deps), (e) => /interrompue/.test(e.message) && !e.message.includes('secret simulé'));
  await publishSocial(opts, config, deps);
  assert.equal(starts, 1); assert.equal(puts, 1); assert.equal(statuses, 2); assert.equal(deps.doc.status, 'published');
});
test('TikTok client : création refusée jamais réessayée, même sur 401/503', async () => {
  for (const status of [401, 503]) {
    let calls = 0;
    const client = tiktokClient({ access: async () => 'fake' }, async () => { calls += 1; return response({}, status); });
    await assert.rejects(client.start({ taille: 100 }, { privacy_level: 'SELF_ONLY' }), /HTTP/);
    assert.equal(calls, 1);
  }
});
test('TikTok : traitement interrogé jusqu’à PUBLISH_COMPLETE et progression incohérente bloquée', async (t) => {
  const { opts, config, deps } = tiktokFixture(t); let reads = 0; let sleeps = 0;
  deps.tiktok.status = async () => ({ status: ++reads < 3 ? 'PROCESSING_DOWNLOAD' : 'PUBLISH_COMPLETE' });
  deps.sleep = async () => { sleeps += 1; };
  await publishSocial(opts, config, deps); assert.equal(reads, 3); assert.ok(sleeps >= 2);
  const f = tiktokFixture(t);
  f.deps.tiktok.status = async () => ({ status: 'PROCESSING_UPLOAD' });
  await assert.rejects(publishSocial(f.opts, f.config, f.deps), /pas encore réconciliée/);
  assert.ok(!f.deps.calls.includes('tt:upload')); assert.ok(!f.deps.calls.includes('db:write'));
});
test('TikTok MP4 : conteneur fragmenté et tailles de boîtes invalides refusés', (t) => {
  const { file } = fixture(t); mp4Fixture(file);
  fs.appendFileSync(file, Buffer.from([0, 0, 0, 8, 109, 111, 111, 102])); // moof
  assert.throws(() => probeMp4(file), /MP4 standard/);
  fs.writeFileSync(file, Buffer.from([255, 255, 255, 255, 109, 111, 111, 118]));
  assert.throws(() => probeMp4(file), /MP4 standard/);
});
