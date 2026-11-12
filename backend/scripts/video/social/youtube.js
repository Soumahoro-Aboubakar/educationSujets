const fs = require('node:fs');
const { createYoutubeClient } = require('../lib/youtube');
const { request, json, read } = require('./http');

function youtubeClient(tokens, fetchImpl = fetch) {
  const authenticated = async (url, init = {}) => {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' || parsed.hostname !== 'www.googleapis.com') throw new Error('Hôte YouTube inattendu.');
    const run = async (force) => {
      const options = { ...init, headers: { ...init.headers, Authorization: `Bearer ${await tokens.access(force)}` } };
      return (!init.method || init.method === 'GET') ? read(fetchImpl, url, options) : request(fetchImpl, url, options);
    };
    let response = await run(false);
    if (response.status === 401) response = await run(true);
    // Le client historique inclut le message d'erreur externe dans ses exceptions.
    // Le remplacer avant qu'il ne puisse atteindre les journaux ou le terminal.
    if (!response.ok && ![308, 404, 410].includes(response.status)) {
      return new Response(JSON.stringify({ error: { message: `HTTP ${response.status} : vérifier connexion, permissions et quota` } }), { status: response.status });
    }
    return response;
  };
  const legacy = createYoutubeClient({ tokenProvider: () => tokens.access(), fetchImpl: authenticated });
  const api = async (edge, params, init) => json(await authenticated(`https://www.googleapis.com/youtube/v3/${edge}?${new URLSearchParams(params)}`, init), 'YouTube');
  const pages = async (edge, params, visit) => {
    let pageToken;
    do {
      const data = await api(edge, { ...params, maxResults: '50', ...(pageToken ? { pageToken } : {}) });
      const found = visit(data.items || []);
      if (found) return found;
      pageToken = data.nextPageToken;
    } while (pageToken);
    return null;
  };
  return { ...legacy,
    // Toutes les pages, sans limite arbitraire sur l'historique de la chaîne.
    chercherParMarqueur: (uploads, marker) => pages('playlistItems', { part: 'snippet', playlistId: uploads },
      (items) => items.find((item) => item.snippet?.description?.includes(marker))?.snippet.resourceId.videoId),
    async miniature(id, file) {
      const type = /\.png$/i.test(file) ? 'image/png' : 'image/jpeg';
      await json(await authenticated(`https://www.googleapis.com/upload/youtube/v3/thumbnails/set?uploadType=media&videoId=${id}`, {
        method: 'POST', headers: { 'Content-Type': type }, body: fs.readFileSync(file),
      }), 'Miniature YouTube');
    },
    async playlist(id, title, configuredId) {
      let playlistId = configuredId;
      if (!playlistId) {
        playlistId = await pages('playlists', { part: 'snippet', mine: 'true' }, (items) => items.find((item) => item.snippet?.title === title)?.id);
        if (!playlistId) {
          // Une création dont la réponse est perdue sera retrouvée par son titre à la relance.
          const result = await api('playlists', { part: 'snippet,status' }, { method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ snippet: { title }, status: { privacyStatus: 'unlisted' } }) });
          playlistId = result.id;
        }
      }
      const hit = await api('playlistItems', { part: 'id', playlistId, videoId: id, maxResults: '1' });
      if (!hit.items?.length) await api('playlistItems', { part: 'snippet' }, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snippet: { playlistId, resourceId: { kind: 'youtube#video', videoId: id } } }) });
      return playlistId;
    },
  };
}
module.exports = { youtubeClient };
