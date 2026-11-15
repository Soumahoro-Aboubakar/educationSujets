/**
 * Vidéos YouTube EXTERNES (publiées par d'autres chaînes) rattachées aux leçons de la préparation.
 * Procédure : docs/videos/videos-externes.md
 *
 * - brief(lecon)       : fiche pédagogique compacte d'une leçon (sert à la recherche et au contrôle) ;
 * - verifierVideo(id)  : relit la page publique de la vidéo (existence, lecture intégrée autorisée,
 *                        durée, chaîne, langue des sous-titres automatiques) — aucune clé API ;
 * - selections         : fichier de décisions versionné (une entrée par leçon), relançable.
 *
 * On ne télécharge ni ne réhéberge jamais une vidéo : seuls l'identifiant et les métadonnées
 * publiques sont conservés ; la lecture passe par le lecteur officiel intégré de YouTube.
 */
const fs = require('fs');
const path = require('path');

const DIR = path.resolve(__dirname, '../../../data/prep/videos-externes');
const SELECTIONS = path.join(DIR, 'selections.json');
const DUREE_MAX = 600; // 10 minutes : plafond de la mission
const ID = /^[A-Za-z0-9_-]{11}$/;

const propre = (s) => String(s || '').replace(/\*\*/g, '').replace(/\s+/g, ' ').trim();
const court = (s, n) => { const t = propre(s); return t.length > n ? `${t.slice(0, n - 1)}…` : t; };

/** Fiche d'une leçon : titre, place dans le module, notions, formules, exemples, à retenir. */
const brief = (mod, lecon, index) => {
  const blocs = lecon.blocs || [];
  const de = (type) => blocs.filter((b) => b.type === type);
  return {
    code: lecon.code,
    titre: lecon.titre,
    module: `${mod.titre} (${mod.matiere})`,
    position: `${index + 1}/${mod.lecons.length}`,
    precedente: mod.lecons[index - 1]?.titre || null,
    suivante: mod.lecons[index + 1]?.titre || null,
    explication: court(de('texte').map((b) => b.md).join(' '), 900),
    formules: de('formule').map((b) => court(b.texte, 140)),
    exemples: de('exemple').map((b) => court(b.titre || b.texte, 90)),
    pieges: de('piege').map((b) => court(b.texte || b.md || b.titre, 140)),
    aRetenir: (de('recap')[0]?.items || []).map((x) => court(x, 160)),
  };
};

const lireSelections = () => (fs.existsSync(SELECTIONS) ? JSON.parse(fs.readFileSync(SELECTIONS, 'utf8')) : {});
const ecrireSelections = (data) => {
  const tri = Object.fromEntries(Object.keys(data).sort().map((k) => [k, data[k]]));
  fs.mkdirSync(DIR, { recursive: true });
  fs.writeFileSync(`${SELECTIONS}.tmp`, `${JSON.stringify(tri, null, 2)}\n`);
  fs.renameSync(`${SELECTIONS}.tmp`, SELECTIONS);
};

/** Extrait un objet JSON affecté dans la page (var x = {...};) sans évaluer de code. */
const extraireJson = (html, nom) => {
  const debut = html.indexOf(`${nom} = {`);
  if (debut < 0) return null;
  let i = html.indexOf('{', debut); const start = i; let profondeur = 0; let chaine = false;
  for (; i < html.length; i += 1) {
    const c = html[i];
    if (chaine) { if (c === '\\') i += 1; else if (c === '"') chaine = false; continue; }
    if (c === '"') chaine = true;
    else if (c === '{') profondeur += 1;
    else if (c === '}') { profondeur -= 1; if (profondeur === 0) break; }
  }
  try { return JSON.parse(html.slice(start, i + 1)); } catch (e) { return null; }
};

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36',
  'Accept-Language': 'fr-FR,fr;q=0.9',
  Cookie: 'CONSENT=YES+1; SOCS=CAI',
};

/**
 * Vérification d'une vidéo par ses pages publiques. Renvoie { ok, motifs[], ...métadonnées }.
 * ok = true seulement si : la vidéo existe, est publique et lisible, l'intégration est autorisée
 * (oEmbed + playableInEmbed), ce n'est pas un direct, et elle dure au plus 10 minutes.
 */
const verifierVideo = async (youtubeId, { fetchImpl = fetch } = {}) => {
  if (!ID.test(String(youtubeId))) return { youtubeId, ok: false, motifs: ['identifiant YouTube invalide'] };
  const url = `https://www.youtube.com/watch?v=${youtubeId}`;
  const motifs = [];
  const oembed = await fetchImpl(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`, { headers: HEADERS });
  if (oembed.status === 401 || oembed.status === 403) motifs.push('intégration désactivée par le créateur');
  else if (oembed.status === 404 || oembed.status === 400) motifs.push('vidéo introuvable, privée ou supprimée');
  else if (!oembed.ok) motifs.push(`oEmbed HTTP ${oembed.status}`);
  const page = await fetchImpl(url, { headers: HEADERS });
  const html = await page.text();
  const player = extraireJson(html, 'ytInitialPlayerResponse');
  if (!player) return { youtubeId, url, ok: false, motifs: [...motifs, 'page YouTube illisible (réessayer plus tard)'] };
  const statut = player.playabilityStatus || {};
  const details = player.videoDetails || {};
  const micro = player.microformat?.playerMicroformatRenderer || {};
  const pistes = player.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
  // Sous-titres automatiques = langue parlée ; plusieurs pistes « asr » : le français d'abord.
  const autos = pistes.filter((p) => p.kind === 'asr');
  const auto = autos.find((p) => p.languageCode?.startsWith('fr')) || autos[0];
  const durationSec = Number(details.lengthSeconds) || null;
  if (statut.status !== 'OK') motifs.push(`lecture impossible : ${statut.status || 'inconnu'}${statut.reason ? ` (${propre(statut.reason)})` : ''}`);
  if (statut.playableInEmbed === false) motifs.push('lecture intégrée interdite');
  if (details.isLiveContent) motifs.push('direct ou rediffusion de direct');
  if (!durationSec) motifs.push('durée inconnue');
  else if (durationSec > DUREE_MAX) motifs.push(`trop longue : ${Math.round(durationSec / 60)} min (> 10 min)`);
  if (Array.isArray(micro.availableCountries) && micro.availableCountries.length && !micro.availableCountries.includes('CI')) {
    motifs.push('non disponible en Côte d’Ivoire');
  }
  return {
    youtubeId,
    url,
    ok: motifs.length === 0,
    motifs,
    titre: propre(details.title),
    chaine: propre(details.author),
    chaineId: details.channelId || null,
    durationSec,
    langueAudio: auto?.languageCode || micro.defaultAudioLanguage || null,
    sousTitres: [...new Set(pistes.map((p) => `${p.languageCode}${p.kind === 'asr' ? '(auto)' : ''}`))],
    publieeLe: micro.publishDate || micro.uploadDate || null,
    description: court(details.shortDescription, 600),
    verifieeLe: new Date().toISOString(),
  };
};

module.exports = { DIR, SELECTIONS, DUREE_MAX, ID, brief, lireSelections, ecrireSelections, verifierVideo, extraireJson, propre };
