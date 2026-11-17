#!/usr/bin/env node
/**
 * Écrit en base (collection prepvideos, mécanisme existant) les vidéos externes « validee » de
 * selections.json. LOCAL UNIQUEMENT. Essai à blanc par défaut ; --ecrire pour écrire.
 *
 *   node scripts/video/externe/attacher.js [--module MATH-LNEXP] [--ecrire] [--remplacer]
 *
 * Base : MONGODB_URI (variable d'environnement) ou ~/.config/fatafalta/config.json (même
 * configuration hors dépôt que le flux de publication des vidéos).
 *
 * Garanties : relançable sans doublon (clé unique { cible, code, langue }) ; une vidéo Fatafalta
 * (non externe) n'est jamais remplacée ; une autre vidéo externe déjà publiée ne l'est qu'avec
 * --remplacer ; chaque vidéo est revérifiée sur YouTube juste avant l'écriture ; le contenu des
 * leçons n'est jamais lu en écriture ni modifié.
 */
const { lireSelections } = require('./lib');
const { verifierListe } = require('./verifier');
const { resolveCible } = require('../lib/cible');

const GENERATEUR = 'youtube-externe';

/** Document PrepVideo d'une sélection validée, rattaché à la révision publiée du module. */
const documentVideo = (sel, cible, v) => ({
  youtubeId: v.youtubeId,
  url: `https://www.youtube.com/watch?v=${v.youtubeId}`,
  // Les emojis des titres YouTube (💪, ✅…) s'affichent en carrés dans la police de l'app : on les retire.
  title: String(v.titre || sel.titre || '').replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}\u{20E3}]/gu, '')
    .replace(/\s+([|,.:!?])/g, ' $1').replace(/\s{2,}/g, ' ').trim().slice(0, 200),
  durationSec: v.durationSec,
  publishedAt: v.publieeLe ? new Date(v.publieeLe) : null,
  status: 'published',
  source: {
    contentRevision: cible.contentRevision || null,
    contentGeneration: cible.contentGeneration || null,
    // Sélection relue par un humain/Claude pour CETTE révision du module : visible tout de suite.
    // Si la leçon est modifiée (nouvelle révision), la vidéo disparaît jusqu'à nouvelle validation.
    needsReview: !cible.contentRevision,
    empreinteContenu: cible.empreinte,
    fichierSha256: null,
    generateur: GENERATEUR,
  },
  externe: { chaine: v.chaine || null, chaineId: v.chaineId || null, langueAudio: v.langueAudio || null, verifieLe: new Date(v.verifieeLe) },
});

/** Calcule et (si ecrire) applique les écritures. Renvoie le bilan par leçon. */
const attacher = async ({ db, snapshot, selections, verifier, ecrire = false, remplacer = false, module = null }) => {
  const bilan = [];
  const retenues = Object.values(selections).filter((s) => s.statut === 'validee' && (!module || s.module === module));
  const verif = await verifier(retenues.map((s) => s.youtubeId));
  for (const sel of retenues) {
    const ligne = { code: sel.code, youtubeId: sel.youtubeId };
    try {
      const cible = resolveCible({ type: 'lecon', id: sel.code, langue: 'fr' }, snapshot);
      const v = verif[sel.youtubeId];
      if (!v?.ok) { bilan.push({ ...ligne, action: 'refusee', motif: v ? v.motifs.join(' ; ') : 'non vérifiée' }); continue; }
      const existant = await db.trouver(cible);
      const externe = existant?.source?.generateur === GENERATEUR;
      if (existant && !externe && existant.status !== 'hidden') { bilan.push({ ...ligne, action: 'conservee', motif: `vidéo Fatafalta ${existant.youtubeId} déjà rattachée` }); continue; }
      if (existant && externe && existant.youtubeId !== sel.youtubeId && existant.status === 'published' && !remplacer) {
        bilan.push({ ...ligne, action: 'conservee', motif: `autre vidéo externe ${existant.youtubeId} publiée (--remplacer pour changer)` }); continue;
      }
      const doc = documentVideo(sel, cible, v);
      const identique = existant && existant.youtubeId === doc.youtubeId && existant.status === 'published'
        && existant.source?.contentRevision === doc.source.contentRevision && !existant.source?.needsReview;
      if (identique) { bilan.push({ ...ligne, action: 'inchangee' }); continue; }
      if (ecrire) await db.ecrire(cible, doc);
      bilan.push({ ...ligne, action: existant ? 'mise_a_jour' : 'ajout', revision: doc.source.contentRevision, ecrit: ecrire });
    } catch (error) {
      bilan.push({ ...ligne, action: 'erreur', motif: error.message });
    }
  }
  return bilan;
};

const main = async () => {
  const args = process.argv.slice(2);
  const opts = { ecrire: args.includes('--ecrire'), remplacer: args.includes('--remplacer'), module: args.includes('--module') ? args[args.indexOf('--module') + 1] : null };
  require('../lib/env').assertLocalMachine(); // eslint-disable-line global-require
  let uri = process.env.MONGODB_URI;
  if (!uri) {
    const { createStore, loadConfig } = require('../social/storage'); // eslint-disable-line global-require
    uri = loadConfig(createStore()).MONGODB_URI;
  }
  if (!uri) throw new Error('MONGODB_URI absent (variable d’environnement ou ~/.config/fatafalta/config.json).');
  console.log(`Base : ${require('../lib/env').maskMongoUri(uri)} · ${opts.ecrire ? 'ÉCRITURE' : 'essai à blanc (--ecrire pour écrire)'}`); // eslint-disable-line global-require
  const db = await require('../lib/db').createDb(uri); // eslint-disable-line global-require
  try {
    const snapshot = await db.snapshot();
    const bilan = await attacher({ db, snapshot, selections: lireSelections(), verifier: (ids) => verifierListe(ids, { log: () => {} }), ...opts });
    for (const b of bilan) console.log(`${b.action.padEnd(11)} ${b.code.padEnd(22)} ${b.youtubeId}${b.motif ? ` — ${b.motif}` : ''}`);
    const n = (a) => bilan.filter((b) => b.action === a).length;
    console.log(`\n${bilan.length} sélection(s) · ajout ${n('ajout')} · mise à jour ${n('mise_a_jour')} · inchangée ${n('inchangee')} · conservée ${n('conservee')} · refusée ${n('refusee')} · erreur ${n('erreur')}`);
    if (n('erreur') || n('refusee')) process.exitCode = 1;
  } finally {
    await db.fermer().catch(() => {});
  }
};

if (require.main === module) main().catch((e) => { console.error(`✗ ${e.message}`); process.exitCode = 1; });

module.exports = { attacher, documentVideo, GENERATEUR };
