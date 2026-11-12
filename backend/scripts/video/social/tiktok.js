const fs = require('node:fs');
const { request, read, sleep } = require('./http');
const { sha256 } = require('../lib/cible');
const { validateMedia } = require('./tiktok-media');
const { required } = require('./storage');

const BASE = 'https://open.tiktokapis.com/v2';
const SCOPES = ['video.publish', 'video.upload'];
// TikTok fournit error.code="ok" même dans les réponses réussies.
async function tiktokJson(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok || (data.error && data.error.code !== 'ok')) {
    const known = new Set(['invalid_grant', 'access_token_invalid', 'scope_not_authorized', 'invalid_publish_id',
      'unaudited_client_can_only_post_to_private_accounts', 'privacy_level_option_mismatch', 'rate_limit_exceeded',
      'spam_risk_too_many_posts', 'reached_active_user_cap']);
    const code = known.has(data.error?.code || data.error) ? data.error?.code || data.error : 'erreur API';
    throw new Error(`TikTok : HTTP ${response.status}, ${code}. Voir le guide ; aucune réponse brute affichée.`);
  }
  return data;
}
function chunkPlan(size) {
  if (!Number.isSafeInteger(size) || size <= 0 || size > 4_000_000_000) throw new Error('Taille TikTok invalide (maximum 4 Go).');
  const chunkSize = Math.min(size, 10_000_000);
  // Le dernier morceau absorbe le reste, conformément au protocole TikTok (floor, pas ceil).
  return { chunkSize, chunkCount: Math.max(1, Math.floor(size / chunkSize)) };
}
function uploadUrl(value) {
  let url;
  try { url = new URL(value); } catch { throw new Error('URL de transfert TikTok invalide.'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.port || url.hash
    || !url.hostname.endsWith('.tiktokapis.com')) throw new Error('URL de transfert TikTok non autorisée.');
  return url.href;
}
function tiktokClient(tokens, fetchImpl = fetch, pause = sleep) {
  const api = async (edge, body = {}, reading = true) => {
    const run = async (force) => {
      const init = { method: 'POST', headers: { Authorization: `Bearer ${await tokens.access(force)}`,
        'Content-Type': 'application/json; charset=UTF-8' }, body: JSON.stringify(body) };
      return (reading ? read : request)(fetchImpl, `${BASE}/post/publish/${edge}/`, init, pause);
    };
    let response = await run(false);
    if (reading && response.status === 401) response = await run(true);
    return (await tiktokJson(response)).data;
  };
  return {
    identity: () => tokens.identity(),
    creator: () => api('creator_info/query'),
    status: (publishId) => api('status/fetch', { publish_id: publishId }),
    async start(file, postInfo) {
      const { chunkSize, chunkCount } = chunkPlan(file.taille);
      const data = await api('video/init', { post_info: postInfo, source_info: { source: 'FILE_UPLOAD',
        video_size: file.taille, chunk_size: chunkSize, total_chunk_count: chunkCount } }, false);
      if (typeof data?.publish_id !== 'string' || !data.publish_id) throw new Error('Session TikTok incomplète. Conserver le journal.');
      return { publishId: data.publish_id, uploadUrl: uploadUrl(data.upload_url), chunkSize, chunkCount, offset: 0 };
    },
    async transfer(state, file, offset, checkpoint) {
      const { chunkSize, chunkCount } = chunkPlan(file.taille);
      if (state.chunkSize !== chunkSize || state.chunkCount !== chunkCount || !Number.isSafeInteger(offset)
        || offset < 0 || offset > file.taille || (offset !== file.taille && (offset % chunkSize || offset / chunkSize >= chunkCount))) {
        throw new Error('Offset/morceaux TikTok incohérents : conserver le journal et réinterroger le statut.');
      }
      const url = uploadUrl(state.uploadUrl);
      const fd = fs.openSync(file.chemin, 'r');
      try {
        while (offset < file.taille) {
          const end = offset / chunkSize === chunkCount - 1 ? file.taille : offset + chunkSize;
          const body = Buffer.alloc(end - offset);
          if (fs.readSync(fd, body, 0, body.length, offset) !== body.length) throw new Error('Fichier TikTok modifié pendant le transfert.');
          // URL signée uniquement : ne jamais transmettre le Bearer OAuth à l'hôte d'upload.
          const response = await request(fetchImpl, url, { method: 'PUT', headers: { 'Content-Type': 'video/mp4',
            'Content-Length': String(body.length), 'Content-Range': `bytes ${offset}-${end - 1}/${file.taille}` }, body });
          if (![201, 206].includes(response.status)) throw new Error(`Transfert TikTok : HTTP ${response.status}. Relancer pour réconcilier uploaded_bytes ; aucune nouvelle session créée.`);
          offset = end; checkpoint({ offset });
        }
      } finally { fs.closeSync(fd); }
    },
  };
}

async function publishTiktok(plan, opts, config, deps) {
  required(config, ['TIKTOK_CLIENT_KEY', 'TIKTOK_OPEN_ID']);
  const { tiktok, store } = deps; const { fichier, postInfo } = plan.tiktok;
  const identity = await tiktok.identity();
  if (identity !== config.TIKTOK_OPEN_ID) throw new Error('Compte TikTok différent de TIKTOK_OPEN_ID : reconnecter le compte prévu.');
  // YouTube/Facebook peuvent avoir demandé plusieurs minutes : relire les limites au dernier moment.
  validateCreator(plan.tiktok, await tiktok.creator());
  // Journal séparé : activer/désactiver une plateforme ne recrée pas un post TikTok.
  const key = `tiktok-${sha256(JSON.stringify([config.TIKTOK_CLIENT_KEY, identity, plan.cible.type,
    plan.cible.code, plan.cible.langue, plan.fichier.sha256]))}.json`;
  const fingerprint = sha256(JSON.stringify([fichier.sha256, postInfo]));
  let state = store.read(key) || { version: 1, fingerprint };
  if (state.version !== 1 || state.fingerprint !== fingerprint) throw new Error('Métadonnées/extrait TikTok différents du journal : reprendre les valeurs initiales et contrôler le profil.');
  const save = (patch) => { state = { ...state, ...patch }; store.write(key, state); };
  if (!state.publishId) {
    if (state.starting) throw new Error('Création TikTok incertaine : ne pas recréer de session. Contrôler le profil et le journal ; voir le guide.');
    save({ starting: true });
    save({ ...await tiktok.start(fichier, postInfo), starting: false });
  }
  if (state.complete) return state.publishId;
  const deadline = Date.now() + (opts.attenteMinutes || 20) * 60000;
  let status = await tiktok.status(state.publishId);
  if (status?.status === 'PROCESSING_UPLOAD') {
    // Le serveur est l'autorité après une réponse PUT perdue. Aucun renvoi aveugle.
    const offset = status.uploaded_bytes;
    if (!Number.isSafeInteger(offset) || offset < (state.offset || 0)) throw new Error('Progression TikTok pas encore réconciliée. Attendre puis relancer sans effacer le journal.');
    await tiktok.transfer(state, fichier, offset, save);
    status = await tiktok.status(state.publishId);
  }
  while (status?.status !== 'PUBLISH_COMPLETE') {
    if (status?.status === 'FAILED') {
      save({ failed: true });
      throw new Error('Publication TikTok refusée (FAILED). Consulter le profil/support TikTok ; conserver le journal, aucune nouvelle session automatique.');
    }
    if (!['PROCESSING_UPLOAD', 'PROCESSING_DOWNLOAD', 'PROCESSING'].includes(status?.status)) throw new Error('Statut TikTok inattendu : conserver le journal et vérifier le profil.');
    if (Date.now() >= deadline) throw new Error('Traitement TikTok en cours : relancer pour interroger le même publish_id.');
    await (deps.sleep || sleep)(15000); status = await tiktok.status(state.publishId);
  }
  save({ complete: true }); return state.publishId;
}
function validateCreator(tiktok, creator) {
  const max = Number(creator?.max_video_post_duration_sec);
  if (!Number.isFinite(max) || max <= 0) throw new Error('Durée maximale du compte TikTok indisponible.');
  validateMedia(tiktok.media, Math.min(tiktok.maxDuration, max));
  if (!creator?.privacy_level_options?.includes(tiktok.postInfo.privacy_level)) throw new Error('Visibilité TikTok non disponible pour ce compte (privacy_level_options). Choisir explicitement une valeur autorisée.');
  for (const interaction of ['comment', 'duet', 'stitch']) {
    if (creator[`${interaction}_disabled`] && !tiktok.postInfo[`disable_${interaction}`]) throw new Error(`Interaction TikTok ${interaction} désactivée sur le compte : retirer son option d’activation.`);
  }
}
module.exports = { tiktokClient, tiktokJson, chunkPlan, publishTiktok, validateCreator, SCOPES, BASE };
