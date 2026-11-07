const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { metadonnees, marqueur, toutesLesCibles } = require('./cible');
const { watchUrl } = require('./youtube');

/**
 * Chaîne de publication d'une vidéo (étapes a → d du cahier des charges vidéo), idempotente :
 *   1. cible       leçon / concours / version, vérifiés dans le pack
 *   2. fichier     vidéo à envoyer (a. génération : aucun générateur branché pour l'instant)
 *   3. production  lecture de la vidéo déjà enregistrée pour cette cible
 *   4. YouTube     b. envoi public reprenable — jamais deux fois la même vidéo
 *   5. YouTube     c. identifiant, traitement terminé, visibilité publique, intégrable, durée
 *   6. confirmation explicite avant d'écrire en production
 *   7. production  d. écriture idempotente rattachée à la leçon / au concours
 *
 * Toutes les dépendances (YouTube, base, journal, confirmation) sont injectées : les tests les
 * remplacent par des faux, aucune vidéo n'est envoyée.
 */

const expandHome = (p) => (p && p.startsWith('~') ? path.join(os.homedir(), p.slice(1)) : p);
const mio = (n) => `${(n / 1048576).toFixed(1)} Mio`;
const duree = (s) => (s == null ? 'durée inconnue' : `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, '0')} s`);

const hashFile = (file) => new Promise((resolve, reject) => {
  const hash = crypto.createHash('sha256');
  fs.createReadStream(file).on('data', (d) => hash.update(d)).on('end', () => resolve(hash.digest('hex'))).on('error', reject);
});

const lireFichier = async (chemin) => {
  const abs = path.resolve(expandHome(chemin));
  if (!fs.existsSync(abs)) throw new Error(`Fichier introuvable : ${abs}`);
  const stat = fs.statSync(abs);
  if (!stat.isFile() || stat.size === 0) throw new Error(`Fichier vide ou invalide : ${abs}`);
  return { chemin: abs, taille: stat.size, sha256: await hashFile(abs) };
};

const SANS_GENERATEUR = 'Étape « génération » : aucun générateur de vidéo n’est branché pour l’instant. '
  + 'Fournis la vidéo avec --fichier <mp4> (dossier de génération : npm run video:brief -- --type … --id …).';

const publier = async (opts, deps) => {
  const { log, etat, confirm, db, youtube } = deps;
  const sleep = deps.sleep || ((ms) => new Promise((r) => setTimeout(r, ms)));
  const now = deps.now || (() => Date.now());

  // 1. Cible ────────────────────────────────────────────────────────────
  const cible = deps.resoudreCible(opts);
  log.etape(1, 'Cible', `${cible.type} ${cible.code} (${cible.langue}) — « ${cible.titre} » · contenu ${cible.empreinte}`);
  let local = etat.lire(cible);

  // 2. Fichier ──────────────────────────────────────────────────────────
  let fichier = null;
  if (opts.fichier) {
    fichier = await (deps.lireFichier || lireFichier)(opts.fichier);
    log.etape(2, 'Fichier', `${fichier.chemin} (${mio(fichier.taille)}, sha256 ${fichier.sha256.slice(0, 12)}…)`);
    if (local.fichierSha256 && local.fichierSha256 !== fichier.sha256 && !local.termine) {
      log.avert(`le journal local concernait une autre vidéo (${local.youtubeId || 'envoi inachevé'}) : il est ignoré`);
      local = {};
    }
  } else if (local.youtubeId && local.fichierSha256) {
    log.etape(2, 'Fichier', `aucun : reprise de l’envoi ${local.youtubeId} (journal local)`);
  } else {
    throw new Error(SANS_GENERATEUR);
  }
  const fichierSha256 = fichier ? fichier.sha256 : local.fichierSha256;

  // 3. Production (lecture) ─────────────────────────────────────────────
  const existante = await db.trouver(cible);
  log.etape(3, 'Production', existante ? `vidéo enregistrée : ${existante.youtubeId} (${existante.status})` : 'aucune vidéo enregistrée pour cette cible');
  const memeVideo = existante && existante.source?.fichierSha256 === fichierSha256;
  if (memeVideo && existante.status === 'published') {
    log.ok('Cette vidéo est déjà publiée et enregistrée : rien à faire.');
    return { action: 'rien', youtubeId: existante.youtubeId };
  }
  if (existante && !memeVideo && !opts.remplacer) {
    throw new Error(`Cette cible a déjà une vidéo (${existante.youtubeId}, ${existante.status}). `
      + 'Relance avec --remplacer pour la remplacer (l’ancienne vidéo reste sur YouTube).');
  }

  // 4. YouTube : envoi ou reprise ───────────────────────────────────────
  const chaine = await youtube.maChaine();
  if (deps.channelId && chaine.id !== deps.channelId) {
    throw new Error(`Le compte connecté publie sur « ${chaine.titre} » (${chaine.id}) et non sur la chaîne attendue ${deps.channelId}.`);
  }
  let youtubeId = null;
  let origine = null;
  if (local.youtubeId && local.fichierSha256 === fichierSha256) { youtubeId = local.youtubeId; origine = 'journal local'; } else if (memeVideo) { youtubeId = existante.youtubeId; origine = 'base de production'; } else {
    const trouve = await youtube.chercherParMarqueur(chaine.uploads, marqueur(cible, fichierSha256));
    if (trouve) { youtubeId = trouve; origine = 'marqueur retrouvé sur la chaîne'; }
  }

  const meta = metadonnees(cible, { titre: opts.titre, fichierSha256 });
  if (youtubeId) {
    log.etape(4, 'YouTube', `déjà envoyée (${origine}) → ${youtubeId} : aucun nouvel envoi`);
    if (!opts.dryRun) etat.ecrire(cible, { fichierSha256, youtubeId, session: null });
  } else if (opts.dryRun) {
    log.etape(4, 'YouTube', `[dry-run] envoi prévu sur « ${chaine.titre} » : « ${meta.snippet.title} » (public, intégrable)`);
  } else {
    let session = local.session && local.fichierSha256 === fichierSha256 ? local.session : null;
    let offset = 0;
    let video = null;
    if (session) {
      const pos = await youtube.positionSession(session, fichier.taille);
      if (!pos) session = null;
      else if (pos.termine) video = pos.video;
      else offset = pos.offset;
    }
    if (!video) {
      if (!session) {
        session = await youtube.ouvrirSession(meta, fichier.taille);
        etat.ecrire(cible, { fichier: fichier.chemin, fichierSha256, session, youtubeId: null, termine: false });
      }
      log.etape(4, 'YouTube', offset ? `reprise de l’envoi à ${Math.floor((offset / fichier.taille) * 100)} % sur « ${chaine.titre} »` : `envoi reprenable sur « ${chaine.titre} » : « ${meta.snippet.title} »`);
      video = await youtube.envoyer(session, fichier.chemin, fichier.taille, offset, log.progression);
    }
    youtubeId = video.id;
    etat.ecrire(cible, { fichierSha256, youtubeId, session: null, envoyeLe: new Date(now()).toISOString() });
    log.ok(`envoyée → ${youtubeId}`);
  }

  // 5. YouTube : identifiant, traitement, visibilité ────────────────────
  if (!youtubeId) {
    log.etape(5, 'YouTube', '[dry-run] après l’envoi : attente du traitement, contrôle « public » et « intégrable », durée');
    log.etape(6, 'Confirmation', '[dry-run] aucune confirmation demandée');
    log.etape(7, 'Production', `[dry-run] écriture prévue dans ${deps.baseAffichee} (${existante ? `remplacement de ${existante.youtubeId}` : 'création'})`);
    return { action: 'dry-run', youtubeId: null };
  }
  let v = await youtube.lireVideo(youtubeId);
  if (!v) throw new Error(`Vidéo ${youtubeId} introuvable sur YouTube (supprimée ?). Supprime le journal .video-state de cette cible pour la renvoyer.`);
  const limite = now() + (opts.attenteMinutes || 20) * 60000;
  while (v.uploadStatus === 'uploaded' && !opts.dryRun) {
    if (now() > limite) throw new Error('Traitement YouTube encore en cours : relance plus tard, le script reprendra ici sans renvoyer la vidéo.');
    log.info(`traitement YouTube en cours (${v.traitement || 'en attente'})…`);
    await sleep(15000); // eslint-disable-line no-await-in-loop
    v = await youtube.lireVideo(youtubeId); // eslint-disable-line no-await-in-loop
    if (!v) throw new Error(`Vidéo ${youtubeId} disparue pendant le traitement`);
  }
  if (['failed', 'rejected', 'deleted'].includes(v.uploadStatus)) throw new Error(`YouTube a refusé la vidéo ${youtubeId} (${v.uploadStatus}${v.rejet ? ` : ${v.rejet}` : ''}).`);
  if (v.privacyStatus !== 'public') {
    throw new Error(`La vidéo ${youtubeId} est « ${v.privacyStatus} » et non publique : l’application ne pourrait pas la lire, rien n’est écrit en base. `
      + 'Cause probable : projet Google Cloud non audité (les envois par API y restent privés). Demande l’audit de l’API YouTube, ou passe la vidéo en public dans YouTube Studio, puis relance.');
  }
  if (!v.embeddable) throw new Error(`La vidéo ${youtubeId} n’autorise pas l’intégration : active-la dans YouTube Studio puis relance.`);
  log.etape(5, 'YouTube', `${v.uploadStatus === 'processed' ? 'traitement terminé' : `statut ${v.uploadStatus}`} · ${duree(v.dureeSec)} · public · intégrable`);

  // 6. Confirmation ─────────────────────────────────────────────────────
  const doc = {
    youtubeId,
    url: watchUrl(youtubeId),
    title: v.titre || meta.snippet.title,
    durationSec: v.dureeSec,
    publishedAt: v.publieLe ? new Date(v.publieLe) : new Date(now()),
    status: 'published',
    source: { empreinteContenu: cible.empreinte, fichierSha256, generateur: opts.generateur || 'fichier' },
  };
  const operation = existante ? `remplacement de ${existante.youtubeId}` : 'création';
  if (opts.dryRun) {
    log.etape(6, 'Confirmation', '[dry-run] aucune confirmation demandée');
    log.etape(7, 'Production', `[dry-run] écriture prévue dans ${deps.baseAffichee} (${operation}) : ${doc.url}`);
    return { action: 'dry-run', youtubeId };
  }
  log.etape(6, 'Confirmation', `base de PRODUCTION ${deps.baseAffichee} — ${operation}`);
  log.info(`prepvideos { cible: ${cible.type}, code: ${cible.code}, langue: ${cible.langue} } ← ${doc.url} · « ${doc.title} » · ${duree(doc.durationSec)}`);
  if (!(await confirm(cible.code, 'Écrire en production ?'))) {
    log.avert('Annulé : rien n’a été écrit. L’envoi YouTube est conservé ; relance pour reprendre à cette étape.');
    return { action: 'annule', youtubeId };
  }

  // 7. Production (écriture) ────────────────────────────────────────────
  await db.ecrire(cible, doc);
  etat.ecrire(cible, { termine: true, ecritEnBaseLe: new Date(now()).toISOString() });
  log.etape(7, 'Production', 'enregistrée ✓ — visible dans l’application sous 5 minutes, sans nouvelle version');
  log.ok(doc.url);
  return { action: existante ? 'remplacee' : 'creee', youtubeId, doc };
};

/** Retire une vidéo de l'application (statut « hidden ») sans la supprimer de YouTube. */
const masquer = async (opts, deps) => {
  const { log, confirm, db } = deps;
  const cible = deps.resoudreCible(opts);
  log.etape(1, 'Cible', `${cible.type} ${cible.code} (${cible.langue}) — « ${cible.titre} »`);
  const existante = await db.trouver(cible);
  if (!existante) throw new Error('Aucune vidéo enregistrée pour cette cible.');
  log.etape(2, 'Production', `vidéo ${existante.youtubeId} (${existante.status})`);
  if (existante.status === 'hidden') { log.ok('Déjà masquée : rien à faire.'); return { action: 'rien' }; }
  if (opts.dryRun) { log.etape(3, 'Production', `[dry-run] passage prévu en « hidden » dans ${deps.baseAffichee}`); return { action: 'dry-run' }; }
  if (!(await confirm(cible.code, `Masquer la vidéo ${existante.youtubeId} dans l’application (base ${deps.baseAffichee}) ?`))) {
    log.avert('Annulé : rien n’a été modifié.');
    return { action: 'annule' };
  }
  await db.masquer(cible);
  log.etape(3, 'Production', 'vidéo masquée ✓ (toujours sur YouTube ; republier avec --remplacer ou le même fichier)');
  return { action: 'masquee' };
};

/** État des vidéos en production, cible par cible (lecture seule). */
const listerEtat = async (deps) => {
  const { log, db } = deps;
  const cibles = (deps.toutesLesCibles || toutesLesCibles)();
  const docs = await db.lister();
  const key = (c) => `${c.type || c.cible}:${c.code}:${c.langue}`;
  const parCle = new Map(docs.map((d) => [key(d), d]));
  const lignes = cibles.map((c) => {
    const d = parCle.get(key(c));
    parCle.delete(key(c));
    let statut = '—';
    if (d) statut = `${d.status} ${d.youtubeId}${d.source?.empreinteContenu && d.source.empreinteContenu !== c.empreinte ? ' · contenu modifié depuis la vidéo' : ''}`;
    return { ...c, statut, video: Boolean(d && d.status === 'published') };
  });
  log.info(`${lignes.filter((l) => l.video).length} vidéo(s) publiée(s) sur ${lignes.length} cible(s) — base ${deps.baseAffichee}`);
  lignes.forEach((l) => log.info(`${l.video ? '▶' : ' '} ${l.type.padEnd(8)} ${`${l.code} (${l.langue})`.padEnd(26)} ${l.statut}`));
  [...parCle.values()].forEach((d) => log.avert(`vidéo orpheline (cible absente du pack) : ${key(d)} → ${d.youtubeId}`));
  return lignes;
};

module.exports = { publier, masquer, listerEtat, lireFichier, hashFile, expandHome, SANS_GENERATEUR };
