const fs = require('fs');

/**
 * Client minimal de l'API YouTube Data v3 (OAuth 2.0, fetch natif, aucune dépendance) :
 *  - rafraîchissement du jeton d'accès à partir du refresh token ;
 *  - envoi REPRENABLE (protocole « resumable upload ») par blocs de 8 Mio ;
 *  - lecture d'une vidéo (statut, traitement, durée) ;
 *  - recherche d'un envoi existant par marqueur dans la playlist « uploads » de la chaîne.
 */
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const API = 'https://www.googleapis.com/youtube/v3';
const UPLOAD = 'https://www.googleapis.com/upload/youtube/v3/videos';
const CHUNK = 8 * 1024 * 1024; // multiple de 256 Kio, exigé par le protocole

/** « PT1H2M10S » → 3730 */
const parseIsoDuration = (iso) => {
  const m = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(iso || '');
  if (!m) return null;
  const [, d, h, min, s] = m.map((x) => Number(x) || 0);
  return d * 86400 + h * 3600 + min * 60 + s;
};

const watchUrl = (id) => `https://www.youtube.com/watch?v=${id}`;

const createYoutubeClient = ({ clientId, clientSecret, refreshToken, fetchImpl = fetch, log = () => {} }) => {
  let token = null;

  const accessToken = async () => {
    if (token && token.expiresAt - Date.now() > 60000) return token.value;
    const body = new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: 'refresh_token' });
    const res = await fetchImpl(TOKEN_URL, { method: 'POST', body });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const hint = data.error === 'invalid_grant' ? ' — refresh token expiré ou révoqué : relance « npm run video:auth » (écran de consentement en mode « En production » pour qu’il n’expire pas après 7 jours).' : '';
      throw new Error(`OAuth YouTube refusé (${data.error || res.status})${hint}`);
    }
    token = { value: data.access_token, expiresAt: Date.now() + (data.expires_in || 3600) * 1000 };
    return token.value;
  };

  const api = async (pathname, params) => {
    const url = `${API}/${pathname}?${new URLSearchParams(params)}`;
    const res = await fetchImpl(url, { headers: { Authorization: `Bearer ${await accessToken()}` } });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`YouTube ${pathname} : ${data.error?.message || res.status}`);
    return data;
  };

  /** Chaîne authentifiée (contrôle : on envoie bien sur la chaîne attendue). */
  const maChaine = async () => {
    const data = await api('channels', { part: 'id,snippet,contentDetails', mine: 'true' });
    const ch = data.items?.[0];
    if (!ch) throw new Error('Aucune chaîne YouTube associée à ce compte Google');
    return { id: ch.id, titre: ch.snippet?.title, uploads: ch.contentDetails?.relatedPlaylists?.uploads };
  };

  /** Cherche un envoi déjà fait (marqueur dans la description) parmi les derniers envois. */
  const chercherParMarqueur = async (uploadsPlaylist, marqueur, maxPages = 10) => {
    let pageToken;
    for (let page = 0; page < maxPages; page += 1) {
      // eslint-disable-next-line no-await-in-loop
      const data = await api('playlistItems', { part: 'snippet', playlistId: uploadsPlaylist, maxResults: '50', ...(pageToken ? { pageToken } : {}) });
      const hit = (data.items || []).find((it) => (it.snippet?.description || '').includes(marqueur));
      if (hit) return hit.snippet.resourceId.videoId;
      pageToken = data.nextPageToken;
      if (!pageToken) break;
    }
    return null;
  };

  const lireVideo = async (id) => {
    const data = await api('videos', { part: 'snippet,status,contentDetails,processingDetails', id });
    const v = data.items?.[0];
    if (!v) return null;
    return {
      id: v.id,
      titre: v.snippet?.title || '',
      publieLe: v.snippet?.publishedAt || null,
      privacyStatus: v.status?.privacyStatus,
      uploadStatus: v.status?.uploadStatus,
      rejet: v.status?.rejectionReason || v.status?.failureReason || null,
      embeddable: v.status?.embeddable !== false,
      dureeSec: parseIsoDuration(v.contentDetails?.duration),
      traitement: v.processingDetails?.processingStatus || null,
    };
  };

  /** Ouvre une session d'envoi reprenable ; renvoie son URL (valable environ une semaine). */
  const ouvrirSession = async (meta, taille) => {
    const res = await fetchImpl(`${UPLOAD}?uploadType=resumable&part=snippet,status`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${await accessToken()}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Length': String(taille),
        'X-Upload-Content-Type': 'video/*',
      },
      body: JSON.stringify(meta),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(`Ouverture de l’envoi refusée : ${data.error?.message || res.status}`);
    }
    const location = res.headers.get('location');
    if (!location) throw new Error('YouTube n’a pas renvoyé d’URL de session d’envoi');
    return location;
  };

  /** Octets déjà reçus par une session (null : session expirée ; 'termine' : déjà complète). */
  const positionSession = async (sessionUrl, taille) => {
    const res = await fetchImpl(sessionUrl, {
      method: 'PUT', redirect: 'manual',
      headers: { Authorization: `Bearer ${await accessToken()}`, 'Content-Length': '0', 'Content-Range': `bytes */${taille}` },
    });
    if (res.status === 200 || res.status === 201) return { termine: true, video: await res.json() };
    if (res.status === 308) {
      const range = res.headers.get('range');
      return { termine: false, offset: range ? Number(range.split('-')[1]) + 1 : 0 };
    }
    return null; // 404 / 410 : session expirée
  };

  /** Envoie le fichier à partir de `offset` ; renvoie la ressource vidéo créée. */
  const envoyer = async (sessionUrl, fichier, taille, offset = 0, onProgress = () => {}) => {
    const fd = fs.openSync(fichier, 'r');
    try {
      let start = offset;
      while (start < taille) {
        const len = Math.min(CHUNK, taille - start);
        const buffer = Buffer.alloc(len);
        fs.readSync(fd, buffer, 0, len, start);
        const end = start + len - 1;
        // eslint-disable-next-line no-await-in-loop
        const res = await fetchImpl(sessionUrl, {
          method: 'PUT', redirect: 'manual',
          headers: { Authorization: `Bearer ${await accessToken()}`, 'Content-Length': String(len), 'Content-Range': `bytes ${start}-${end}/${taille}` },
          body: buffer,
        });
        if (res.status === 200 || res.status === 201) { onProgress(taille, taille); return res.json(); }
        if (res.status !== 308) {
          const data = await res.json().catch(() => ({})); // eslint-disable-line no-await-in-loop
          const err = new Error(`Envoi interrompu (${res.status}) : ${data.error?.message || 'réessaie, l’envoi reprendra où il s’est arrêté'}`);
          err.reprenable = res.status >= 500 || res.status === 429;
          throw err;
        }
        const range = res.headers.get('range');
        start = range ? Number(range.split('-')[1]) + 1 : end + 1;
        onProgress(start, taille);
      }
      throw new Error('Envoi terminé sans réponse finale de YouTube : relance le script pour vérifier la session');
    } finally {
      fs.closeSync(fd);
    }
  };

  return { accessToken, maChaine, chercherParMarqueur, lireVideo, ouvrirSession, positionSession, envoyer, log };
};

module.exports = { createYoutubeClient, parseIsoDuration, watchUrl };
