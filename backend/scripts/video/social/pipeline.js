const fs = require('node:fs');
const path = require('node:path');
const { resolveCible, metadonnees, marqueur, sha256, loadPack } = require('../lib/cible');
const { lireFichier, expandHome, documentVideo, enregistrerVideo } = require('../lib/pipeline');
const { required } = require('./storage');
const { sleep } = require('./http');
const { probeMp4, validateMedia } = require('./tiktok-media');
const { publishTiktok, validateCreator } = require('./tiktok');

const USAGE = `Usage : npm run video:publish-social -- --type lecon|concours --id CODE --fichier /chemin/video.mp4
  [--langue fr] [--titre TEXTE] [--description TEXTE] [--tags tag1,tag2]
  [--miniature image.jpg] [--visibilite unlisted|public|private]
  [--concours CODE] [--matiere TEXTE] [--metadonnees fichier.json]
  [--youtube | --sans-youtube] [--facebook | --sans-facebook] [--tiktok | --sans-tiktok]
  [--tiktok-fichier extrait.mp4] [--tiktok-visibilite SELF_ONLY|PUBLIC_TO_EVERYONE|MUTUAL_FOLLOW_FRIENDS|FOLLOWER_OF_CREATOR]
  [--tiktok-legende TEXTE] [--tiktok-commentaires] [--tiktok-duos] [--tiktok-collages]
  [--tiktok-marque] [--tiktok-partenariat] [--tiktok-ia]
  [--attente-minutes 20] [--remplacer] [--dry-run | --publier]
Essai à blanc par défaut : aucun réseau, jeton, journal ni base modifiés.
--publier autorise les plateformes actives, dans l'ordre YouTube → Facebook → TikTok.
TikTok : en publiant, vous acceptez la Music Usage Confirmation de TikTok et, pour
--tiktok-partenariat, sa Branded Content Policy (liens dans le guide).
YouTube/Facebook actifs par défaut ; TikTok désactivé. MongoDB seulement avec YouTube.`;
function parseArgs(argv) {
  const opts = { dryRun: true, langue: 'fr' };
  const flags = new Set(['dry-run', 'publier', 'remplacer', 'aide', 'youtube', 'sans-youtube', 'facebook', 'sans-facebook', 'tiktok', 'sans-tiktok',
    'tiktok-commentaires', 'tiktok-duos', 'tiktok-collages', 'tiktok-marque', 'tiktok-partenariat', 'tiktok-ia']);
  const values = new Set(['type', 'id', 'fichier', 'langue', 'titre', 'description', 'tags', 'miniature', 'visibilite', 'concours', 'matiere', 'metadonnees', 'attente-minutes', 'tiktok-fichier', 'tiktok-visibilite', 'tiktok-legende']);
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i].replace(/^--/, '');
    if (!argv[i].startsWith('--') || !(flags.has(key) || values.has(key))) throw new Error(`Option inconnue : ${argv[i]}`);
    if (flags.has(key)) opts[key] = true;
    else {
      if (!argv[i + 1] || argv[i + 1].startsWith('--')) throw new Error(`Valeur manquante pour --${key}.`);
      opts[key] = argv[++i];
    }
  }
  if (opts.aide) return opts;
  if (opts.publier && opts['dry-run']) throw new Error('--publier et --dry-run sont incompatibles.');
  opts.dryRun = !opts.publier;
  if (!['lecon', 'concours'].includes(opts.type) || !opts.id || !opts.fichier) throw new Error('--type, --id et --fichier requis.');
  if (opts.type === 'concours' && opts.langue !== 'fr') throw new Error('Un concours utilise la langue fr.');
  opts.attenteMinutes = Number(opts['attente-minutes'] || 20);
  if (!Number.isFinite(opts.attenteMinutes) || opts.attenteMinutes <= 0 || opts.attenteMinutes > 120) throw new Error('--attente-minutes doit être compris entre 0 et 120.');
  return opts;
}

function platforms(opts, config) {
  const result = {};
  for (const name of ['youtube', 'facebook', 'tiktok']) {
    const value = config[`${name.toUpperCase()}_ENABLED`];
    if (value !== undefined && ![true, false, 'true', 'false'].includes(value)) throw new Error(`${name.toUpperCase()}_ENABLED doit valoir true ou false.`);
    if (opts[name] && opts[`sans-${name}`]) throw new Error(`--${name} et --sans-${name} sont incompatibles.`);
    result[name] = opts[`sans-${name}`] ? false : opts[name] ? true : value === undefined ? name !== 'tiktok' : value === true || value === 'true';
  }
  if (!Object.values(result).some(Boolean)) throw new Error('Activer au moins une plateforme.');
  return result;
}

const permittedFile = (file) => {
  if (typeof file !== 'string' || path.basename(file).startsWith('.env') || path.basename(file) === 'keys.text') throw new Error('Lecture de ce fichier interdite.');
  const resolved = fs.realpathSync(path.resolve(expandHome(file)));
  if (path.basename(resolved).startsWith('.env') || path.basename(resolved) === 'keys.text') throw new Error('Lecture de ce fichier interdite.');
  return resolved;
};
async function prepare(opts, config) {
  const enabled = platforms(opts, config);
  const cible = resolveCible(opts);
  let input = {};
  if (opts.metadonnees) {
    const file = permittedFile(opts.metadonnees);
    try { input = JSON.parse(fs.readFileSync(file, 'utf8')); }
    catch { throw new Error('Fichier de métadonnées JSON invalide.'); }
    if (!input || Array.isArray(input) || typeof input !== 'object') throw new Error('Les métadonnées doivent être un objet JSON.');
  }
  for (const key of ['titre', 'description', 'tags', 'miniature', 'visibilite', 'concours', 'matiere', 'tiktok-fichier', 'tiktok-visibilite', 'tiktok-legende']) if (opts[key] !== undefined) input[key] = opts[key];
  const fichier = await lireFichier(permittedFile(opts.fichier));
  if (input.titre !== undefined && (typeof input.titre !== 'string' || !input.titre.trim() || input.titre.length > 100)) throw new Error('Le titre doit contenir de 1 à 100 caractères.');
  const meta = metadonnees(cible, { titre: input.titre, fichierSha256: fichier.sha256 });
  const marker = marqueur(cible, fichier.sha256);
  if (input.description !== undefined && typeof input.description !== 'string') throw new Error('La description doit être un texte.');
  if (input.description !== undefined) meta.snippet.description = `${input.description}\n\n${marker}`;
  if (Buffer.byteLength(meta.snippet.description) > 5000) throw new Error('Description trop longue (5000 octets, marqueur inclus).');
  if (input.tags !== undefined) meta.snippet.tags = Array.isArray(input.tags) ? input.tags : String(input.tags).split(',').map((x) => x.trim()).filter(Boolean);
  if (meta.snippet.tags.some((x) => typeof x !== 'string') || meta.snippet.tags.join(',').length > 450) throw new Error('Tags invalides ou trop longs (450 caractères maximum).');
  meta.status.privacyStatus = input.visibilite || config.YOUTUBE_PRIVACY || 'unlisted';
  if (!['unlisted', 'public', 'private'].includes(meta.status.privacyStatus)) throw new Error('Visibilité attendue : unlisted, public ou private.');
  const programmes = cible.type === 'concours' ? [cible.code] : loadPack().programmes.filter((p) => p.matieres.some((m) => m.modules.some((v) => v.code === cible.module.code && v.publie))).map((p) => p.code);
  if (input.concours && !programmes.includes(input.concours)) throw new Error('Ce concours ne correspond pas à cette cible dans le pack.');
  const matiere = input.matiere || cible.matiere || 'Présentation';
  if (typeof matiere !== 'string' || !matiere.trim() || matiere.length > 100) throw new Error('Matière invalide (1 à 100 caractères).');
  const playlists = (input.concours ? [input.concours] : programmes).map((code) => {
    const key = `${code}/${matiere}`;
    return { key, title: `Fatafalta | ${code} | ${matiere}`, id: config.YOUTUBE_PLAYLISTS?.[key] || null };
  });
  let miniature;
  if (input.miniature) {
    const file = permittedFile(input.miniature);
    if (!/\.(jpe?g|png)$/i.test(file)) throw new Error('Miniature attendue au format JPEG ou PNG.');
    miniature = await lireFichier(file);
    if (miniature.taille > 2 * 1024 * 1024) throw new Error('Miniature supérieure à 2 Mio.');
  }
  let tiktok;
  if (enabled.tiktok) {
    const file = input['tiktok-fichier'] ? await lireFichier(permittedFile(input['tiktok-fichier'])) : fichier;
    const maxDuration = Number(config.TIKTOK_MAX_DURATION_SEC ?? 180);
    const media = validateMedia(probeMp4(file.chemin), maxDuration);
    const privacy = input['tiktok-visibilite'];
    if (!['SELF_ONLY', 'PUBLIC_TO_EVERYONE', 'MUTUAL_FOLLOW_FRIENDS', 'FOLLOWER_OF_CREATOR'].includes(privacy)) throw new Error('--tiktok-visibilite requis explicitement (aucune visibilité TikTok par défaut).');
    const title = input['tiktok-legende'] ?? meta.snippet.title;
    if (typeof title !== 'string' || title.length > 2200) throw new Error('Légende TikTok limitée à 2200 caractères UTF-16.');
    if (opts['tiktok-partenariat'] && privacy === 'SELF_ONLY') throw new Error('Un partenariat TikTok ne peut pas être SELF_ONLY.');
    tiktok = { fichier: file, media, maxDuration, postInfo: { title, privacy_level: privacy,
      disable_comment: !opts['tiktok-commentaires'], disable_duet: !opts['tiktok-duos'], disable_stitch: !opts['tiktok-collages'],
      brand_organic_toggle: Boolean(opts['tiktok-marque']), brand_content_toggle: Boolean(opts['tiktok-partenariat']), is_aigc: Boolean(opts['tiktok-ia']) } };
  }
  return { cible, fichier, meta, marker, playlists, miniature, enabled, tiktok };
}

async function publishSocial(opts, config, deps) {
  const plan = await prepare(opts, config);
  const { cible, fichier, meta, marker, playlists, miniature, enabled } = plan;
  if (opts.dryRun !== false || opts.publier !== true) return { action: 'dry-run',
    cible: `${cible.type}:${cible.code}:${cible.langue}`, fichier: fichier.chemin, sha256: fichier.sha256,
    titre: meta.snippet.title, description: meta.snippet.description, tags: meta.snippet.tags,
    plateformes: enabled, visibiliteYouTube: enabled.youtube ? meta.status.privacyStatus : null,
    facebook: enabled.facebook ? 'Page publique après traitement' : null,
    tiktok: plan.tiktok ? { fichier: plan.tiktok.fichier.chemin, sha256: plan.tiktok.fichier.sha256, media: plan.tiktok.media,
      postInfo: plan.tiktok.postInfo, controleRestant: 'Durée maximale et options du compte à relire via creator_info avant tout envoi' } : null,
    miniature: miniature?.chemin || null, playlists: enabled.youtube ? playlists : [],
    base: enabled.youtube ? 'Enregistrement youtubeId + URL après validation des plateformes actives' : 'Aucune lecture/écriture MongoDB (YouTube désactivé)' };
  if (enabled.youtube) required(config, ['YOUTUBE_CHANNEL_ID']);
  if (enabled.facebook) required(config, ['FACEBOOK_PAGE_ID']);
  if (enabled.tiktok) required(config, ['TIKTOK_CLIENT_KEY', 'TIKTOK_OPEN_ID']);
  // Une vidéo privée ne peut pas être utilisée par les élèves via le lecteur intégré.
  if (enabled.youtube && meta.status.privacyStatus === 'private') throw new Error('Visibilité private incompatible avec le lecteur Fatafalta. Choisir unlisted ou public avant --publier.');
  const { youtube, facebook, db, store } = deps;
  const pause = deps.sleep || sleep;
  const key = `video-${sha256(JSON.stringify([config.YOUTUBE_CHANNEL_ID, config.FACEBOOK_PAGE_ID, cible.type, cible.code, cible.langue, fichier.sha256]))}.json`;
  const fingerprint = sha256(JSON.stringify([meta, playlists, miniature?.sha256 || null]));
  let state = store.read(key) || { version: 1, fingerprint, cible: { type: cible.type, code: cible.code, langue: cible.langue }, sha256: fichier.sha256, youtube: {}, facebook: {}, playlists: {} };
  if (state.version !== 1 || state.fingerprint !== fingerprint) throw new Error('Les métadonnées diffèrent du journal. Reprendre avec les valeurs initiales puis modifier dans les studios des plateformes.');
  const checkpoint = (patch) => { state = { ...state, ...patch, updatedAt: new Date().toISOString() }; store.write(key, state); };
  const saveYt = (patch) => checkpoint({ youtube: { ...state.youtube, ...patch } });
  const saveFb = (patch) => checkpoint({ facebook: { ...state.facebook, ...patch } });
  // Contrôler les restrictions distantes TikTok avant tout upload, même sur YouTube.
  const creator = enabled.tiktok ? await deps.tiktok.creator() : null;
  if (enabled.tiktok) {
    if (await deps.tiktok.identity() !== config.TIKTOK_OPEN_ID) throw new Error('Compte TikTok différent de TIKTOK_OPEN_ID.');
    validateCreator(plan.tiktok, creator);
    (deps.output || console.log)(`TikTok : ${creator.creator_nickname || creator.creator_username || '(compte sans nom)'}, visibilité ${plan.tiktok.postInfo.privacy_level}, durée maximale ${creator.max_video_post_duration_sec} s. Traitement différé après envoi.`);
  }
  const existing = enabled.youtube ? await db.trouver(cible) : null;
  if (existing && existing.source?.fichierSha256 !== fichier.sha256 && !opts.remplacer) throw new Error('Cette cible a déjà une autre vidéo : --remplacer requis.');
  const channel = enabled.youtube ? await youtube.maChaine() : null;
  if (enabled.youtube && channel.id !== config.YOUTUBE_CHANNEL_ID) throw new Error('La chaîne YouTube connectée ne correspond pas à YOUTUBE_CHANNEL_ID.');
  const page = enabled.facebook ? await facebook.page() : null;
  if (enabled.facebook && page.id !== config.FACEBOOK_PAGE_ID) throw new Error('La Page Facebook connectée ne correspond pas à FACEBOOK_PAGE_ID.');

  let doc;
  if (enabled.youtube) {
    if (!state.youtube.id) {
      const found = existing?.source?.fichierSha256 === fichier.sha256 ? existing.youtubeId : await youtube.chercherParMarqueur(channel.uploads, marker);
      if (found) saveYt({ id: found });
      else {
        let position;
        if (state.youtube.session) {
          position = await youtube.positionSession(state.youtube.session, fichier.taille);
          if (!position) throw new Error('Session YouTube expirée et vidéo non retrouvée. Vérifier YouTube Studio ; ne pas effacer le journal sans contrôle.');
          if (position.termine) saveYt({ id: position.video.id });
        } else if (state.youtube.starting) {
          throw new Error('Création YouTube incertaine. Attendre puis relancer pour rechercher le marqueur ; voir le guide.');
        } else {
          saveYt({ starting: true });
          const session = await youtube.ouvrirSession(meta, fichier.taille);
          saveYt({ session, starting: false });
        }
        if (!state.youtube.id) {
          const result = await youtube.envoyer(state.youtube.session, fichier.chemin, fichier.taille, position?.offset || 0);
          saveYt({ id: result.id });
        }
      }
    }
    const deadline = Date.now() + (opts.attenteMinutes || 20) * 60000;
    let video = await youtube.lireVideo(state.youtube.id);
    while (video?.uploadStatus === 'uploaded' && Date.now() < deadline) {
      await pause(15000); video = await youtube.lireVideo(state.youtube.id);
    }
    if (!video) throw new Error('Vidéo YouTube introuvable. Conserver le journal et vérifier YouTube Studio.');
    doc = documentVideo({ cible, video, youtubeId: state.youtube.id, fichierSha256: fichier.sha256,
      titre: meta.snippet.title, generateur: 'social', visibilites: ['public', 'unlisted'] });
    if (miniature && !state.youtube.thumbnail) { await youtube.miniature(state.youtube.id, miniature.chemin); saveYt({ thumbnail: true }); }
    for (const playlist of playlists) {
      if (!state.playlists[playlist.key]) {
        const id = await youtube.playlist(state.youtube.id, playlist.title, playlist.id);
        checkpoint({ playlists: { ...state.playlists, [playlist.key]: id } });
      }
    }
  }

  if (enabled.facebook) {
    if (!state.facebook.id) {
      const found = await facebook.find(marker);
      if (found) saveFb({ id: found, recovered: true });
      else if (state.facebook.starting) throw new Error('Création Facebook incertaine. Attendre puis relancer pour retrouver le marqueur ; voir le guide.');
      else {
        saveFb({ starting: true });
        saveFb({ ...await facebook.start(fichier.taille), starting: false });
      }
    }
    let fbVideo = await facebook.video(state.facebook.id);
    const finalizing = state.facebook.finishAttempted && (fbVideo.status?.video_status === 'processing'
      || ['in_progress', 'complete'].includes(fbVideo.status?.publishing_phase?.status));
    const fbComplete = fbVideo.published && fbVideo.status?.video_status === 'ready';
    if (!fbComplete && !state.facebook.finished && !finalizing) {
      if (!state.facebook.sessionId) throw new Error('Vidéo Facebook retrouvée mais non publiée : vérifier la Page avant de reprendre.');
      await facebook.transfer(state.facebook, fichier, saveFb);
      // La finalisation vise toujours la même session et le même video_id.
      saveFb({ finishAttempted: true });
      await facebook.finish(state.facebook, meta); saveFb({ finished: true });
    }
    const fbDeadline = Date.now() + (opts.attenteMinutes || 20) * 60000;
    while (!fbVideo.published || fbVideo.status?.video_status !== 'ready') {
      if (['error', 'expired', 'upload_failed'].includes(fbVideo.status?.video_status) || Date.now() >= fbDeadline) {
        throw new Error('Traitement/publication Facebook non terminé ou refusé. Relancer sans effacer le journal.');
      }
      await pause(15000); fbVideo = await facebook.video(state.facebook.id);
    }
    saveFb({ finished: true, ready: true });
    if (miniature && !state.facebook.thumbnail) { await facebook.miniature(state.facebook.id, miniature.chemin); saveFb({ thumbnail: true }); }
  }
  const tiktokPublishId = enabled.tiktok ? await publishTiktok(plan, opts, config, deps) : undefined;
  if (enabled.youtube) await enregistrerVideo(db, cible, doc, { remplacer: opts.remplacer });
  checkpoint({ registered: enabled.youtube });
  return { action: enabled.youtube ? 'enregistree' : 'publiee', youtubeId: enabled.youtube ? state.youtube.id : undefined,
    url: doc?.url, facebookId: enabled.facebook ? state.facebook.id : undefined, tiktokPublishId };
}
module.exports = { parseArgs, prepare, publishSocial, platforms, USAGE };
