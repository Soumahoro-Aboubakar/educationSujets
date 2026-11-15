const test = require('node:test');
const assert = require('node:assert/strict');
const { verifierVideo, brief, extraireJson } = require('../scripts/video/externe/lib');
const { attacher, documentVideo } = require('../scripts/video/externe/attacher');
const { buildIndex, forSnapshot } = require('../services/prep/videoService');

const ID = 'abcdefghijk';
const page = (player) => `<html><script>var ytInitialPlayerResponse = ${JSON.stringify(player)};var meta = 1;</script></html>`;
const player = (over = {}) => ({
  playabilityStatus: { status: 'OK', playableInEmbed: true, ...over.statut },
  videoDetails: { videoId: ID, title: 'Dériver ln(u) {facile}', lengthSeconds: '227', author: 'Chaîne Maths', channelId: 'UC1', shortDescription: 'Méthode "simple"', isLiveContent: false, ...over.details },
  microformat: { playerMicroformatRenderer: { publishDate: '2020-01-02', ...over.micro } },
  captions: { playerCaptionsTracklistRenderer: { captionTracks: over.pistes || [{ languageCode: 'en', kind: 'asr' }, { languageCode: 'fr', kind: 'asr' }] } },
});
const fakeFetch = ({ oembed = 200, html }) => async (url) => (url.includes('oembed')
  ? { ok: oembed === 200, status: oembed, text: async () => '{}' }
  : { ok: true, status: 200, text: async () => html });

test('extraireJson lit un objet contenant accolades et guillemets échappés', () => {
  assert.equal(extraireJson(page(player()), 'ytInitialPlayerResponse').videoDetails.title, 'Dériver ln(u) {facile}');
});

test('verifierVideo accepte une vidéo courte, intégrable, et préfère la piste française', async () => {
  const v = await verifierVideo(ID, { fetchImpl: fakeFetch({ html: page(player()) }) });
  assert.equal(v.ok, true);
  assert.equal(v.durationSec, 227);
  assert.equal(v.langueAudio, 'fr');
  assert.equal(v.chaine, 'Chaîne Maths');
});

test('verifierVideo refuse : > 10 min, intégration interdite, introuvable, identifiant invalide', async () => {
  const longue = await verifierVideo(ID, { fetchImpl: fakeFetch({ html: page(player({ details: { lengthSeconds: '601' } })) }) });
  assert.equal(longue.ok, false); assert.match(longue.motifs.join(), /trop longue/);
  const interdite = await verifierVideo(ID, { fetchImpl: fakeFetch({ oembed: 401, html: page(player({ statut: { playableInEmbed: false } })) }) });
  assert.equal(interdite.ok, false); assert.match(interdite.motifs.join(), /intégration/);
  const absente = await verifierVideo(ID, { fetchImpl: fakeFetch({ oembed: 404, html: page(player({ statut: { status: 'ERROR' } })) }) });
  assert.equal(absente.ok, false);
  assert.equal((await verifierVideo('trop-court')).ok, false);
});

test('brief résume une leçon sans la modifier', () => {
  const mod = { titre: 'Logarithme', matiere: 'Mathématiques', lecons: [{ code: 'M-L1', titre: 'A', blocs: [] }, { code: 'M-L2', titre: 'B', blocs: [{ type: 'texte', md: '**ln** transforme' }, { type: 'recap', items: ['x'] }] }] };
  const avant = JSON.stringify(mod);
  const b = brief(mod, mod.lecons[1], 1);
  assert.equal(b.position, '2/2'); assert.equal(b.precedente, 'A'); assert.equal(b.explication, 'ln transforme'); assert.deepEqual(b.aRetenir, ['x']);
  assert.equal(JSON.stringify(mod), avant);
});

// Base factice et pack minimal pour attacher().
const snapshot = { generation: 7, programmes: [], modules: { MOD: { code: 'MOD', publie: true, revision: 3, titre: 'Module', matiere: 'Maths', lecons: [{ code: 'MOD-L1', titre: 'L1', blocs: [] }, { code: 'MOD-L2', titre: 'L2', blocs: [] }] } } };
const fakeDb = (initial = []) => {
  const rows = new Map(initial.map((r) => [r.code, r]));
  return { rows, trouver: async (c) => rows.get(c.code) || null, ecrire: async (c, champs) => { rows.set(c.code, { cible: c.type, code: c.code, langue: c.langue, ...champs }); return rows.get(c.code); } };
};
const sel = (code, youtubeId) => ({ code, module: 'MOD', statut: 'validee', youtubeId, titre: 't' });
const ok = (id) => ({ youtubeId: id, ok: true, motifs: [], titre: `Vidéo ${id}`, chaine: 'Chaîne', chaineId: 'UC1', durationSec: 200, langueAudio: 'fr', verifieeLe: '2026-11-15T00:00:00Z', publieeLe: '2020-01-01' });
const verifier = async (ids) => Object.fromEntries(ids.map((id) => [id, ok(id)]));

test('attacher : essai à blanc n’écrit rien, --ecrire écrit, relance = inchangée', async () => {
  const db = fakeDb();
  const selections = { 'MOD-L1': sel('MOD-L1', 'AAAAAAAAAAA'), 'MOD-L2': { code: 'MOD-L2', module: 'MOD', statut: 'a_rechercher' } };
  const blanc = await attacher({ db, snapshot, selections, verifier });
  assert.deepEqual(blanc.map((b) => b.action), ['ajout']); assert.equal(db.rows.size, 0);
  await attacher({ db, snapshot, selections, verifier, ecrire: true });
  const doc = db.rows.get('MOD-L1');
  assert.equal(doc.status, 'published'); assert.equal(doc.source.contentRevision, 3); assert.equal(doc.source.needsReview, false);
  assert.equal(doc.source.generateur, 'youtube-externe'); assert.equal(doc.externe.chaine, 'Chaîne');
  const relance = await attacher({ db, snapshot, selections, verifier, ecrire: true });
  assert.deepEqual(relance.map((b) => b.action), ['inchangee']);
});

test('attacher ne remplace jamais une vidéo Fatafalta, et une autre vidéo externe seulement avec --remplacer', async () => {
  const db = fakeDb([
    { code: 'MOD-L1', youtubeId: 'FATAFALTA01', status: 'published', source: { generateur: 'manuel', contentRevision: 3 } },
    { code: 'MOD-L2', youtubeId: 'EXTERNE0001', status: 'published', source: { generateur: 'youtube-externe', contentRevision: 3 } },
  ]);
  const selections = { 'MOD-L1': sel('MOD-L1', 'AAAAAAAAAAA'), 'MOD-L2': sel('MOD-L2', 'BBBBBBBBBBB') };
  const r1 = await attacher({ db, snapshot, selections, verifier, ecrire: true });
  assert.deepEqual(r1.map((b) => b.action), ['conservee', 'conservee']);
  const r2 = await attacher({ db, snapshot, selections, verifier, ecrire: true, remplacer: true });
  assert.deepEqual(r2.map((b) => b.action), ['conservee', 'mise_a_jour']);
  assert.equal(db.rows.get('MOD-L1').youtubeId, 'FATAFALTA01');
  assert.equal(db.rows.get('MOD-L2').youtubeId, 'BBBBBBBBBBB');
});

test('attacher refuse une vidéo devenue invalide et une leçon inconnue', async () => {
  const db = fakeDb();
  const selections = { 'MOD-L1': sel('MOD-L1', 'AAAAAAAAAAA'), 'X-L9': { ...sel('X-L9', 'CCCCCCCCCCC'), module: 'X' } };
  const r = await attacher({ db, snapshot, selections, verifier: async () => ({ AAAAAAAAAAA: { ok: false, motifs: ['supprimée'] }, CCCCCCCCCCC: ok('CCCCCCCCCCC') }), ecrire: true });
  assert.deepEqual(r.map((b) => b.action), ['refusee', 'erreur']); assert.equal(db.rows.size, 0);
});

test('une vidéo externe écrite est servie par l’API pour la révision courante, avec son auteur', () => {
  const doc = { cible: 'lecon', code: 'MOD-L1', langue: 'fr', ...documentVideo(sel('MOD-L1', 'AAAAAAAAAAA'), { contentRevision: 3, contentGeneration: 7, empreinte: 'e' }, ok('AAAAAAAAAAA')) };
  const contenu = { manifest: { generation: 7 }, pack: { programmes: [], modules: { MOD: { revision: 3, lecons: [{ code: 'MOD-L1' }] } } } };
  const servie = forSnapshot(buildIndex([doc]), contenu).lecons['MOD-L1'].fr;
  assert.equal(servie.youtubeId, 'AAAAAAAAAAA'); assert.equal(servie.auteur, 'Chaîne');
  const revisee = forSnapshot(buildIndex([doc]), { ...contenu, pack: { ...contenu.pack, modules: { MOD: { revision: 4, lecons: [{ code: 'MOD-L1' }] } } } });
  assert.equal(revisee.lecons['MOD-L1'], undefined);
});
