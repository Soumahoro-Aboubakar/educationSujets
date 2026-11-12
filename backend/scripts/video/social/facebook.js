const fs = require('node:fs');
const { graphBase } = require('./oauth');
const { request, json, read } = require('./http');

function facebookClient(config, tokens, fetchImpl = fetch) {
  const base = graphBase(config);
  const api = async (edge, params = {}, body) => {
    const url = `${body ? base.replace('graph.', 'graph-video.') : base}/${edge}?${new URLSearchParams(params)}`;
    const run = async (force) => {
      const init = { headers: { Authorization: `Bearer ${await tokens.access(force)}` }, ...(body ? { method: 'POST', body } : {}) };
      return body ? request(fetchImpl, url, init) : read(fetchImpl, url, init);
    };
    let response = await run(false);
    const errorCode = !response.ok ? (await response.clone().json().catch(() => ({}))).error?.code : null;
    if (response.status === 401 || errorCode === 190) response = await run(true);
    return json(response, 'Facebook');
  };
  const edge = `${config.FACEBOOK_PAGE_ID}/videos`;
  const form = (data) => new URLSearchParams(Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])));
  const position = (data, size) => {
    const start = Number(data.start_offset); const end = Number(data.end_offset);
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || end < start || end > size) throw new Error('Offsets Facebook invalides.');
    return { start, end };
  };
  return {
    async page() { return api(config.FACEBOOK_PAGE_ID, { fields: 'id,name' }); },
    async find(marker) {
      let after;
      do {
        const data = await api(edge, { fields: 'id,description', limit: '100', ...(after ? { after } : {}) });
        const hits = (data.data || []).filter((v) => v.description?.includes(marker));
        if (hits.length > 1) throw new Error('Plusieurs vidéos Facebook portent ce marqueur : vérifier la Page manuellement.');
        if (hits.length) return hits[0].id;
        after = data.paging?.next ? data.paging?.cursors?.after : null;
      } while (after);
      return null;
    },
    video: (id) => api(id, { fields: 'id,status,published,description' }),
    async start(size) {
      const data = await api(edge, {}, form({ upload_phase: 'start', file_size: size }));
      if (!data.upload_session_id || !data.video_id) throw new Error('Session Facebook incomplète.');
      return { sessionId: data.upload_session_id, id: data.video_id, ...position(data, size) };
    },
    async transfer(state, file, checkpoint) {
      let { start, end } = state;
      const fd = fs.openSync(file.chemin, 'r');
      try {
        while (start < file.taille) {
          // Respecter la fenêtre demandée par Meta sans charger une vidéo entière en mémoire.
          if (end <= start || end - start > 64 * 1024 * 1024) throw new Error('Bloc Facebook invalide ou supérieur à 64 Mio.');
          const buffer = Buffer.alloc(end - start);
          if (fs.readSync(fd, buffer, 0, buffer.length, start) !== buffer.length) throw new Error('Fichier vidéo tronqué.');
          const body = new FormData();
          body.set('upload_phase', 'transfer'); body.set('upload_session_id', state.sessionId); body.set('start_offset', String(start));
          body.set('video_file_chunk', new Blob([buffer], { type: 'video/mp4' }), 'chunk.mp4');
          let next;
          try { next = position(await api(edge, {}, body), file.taille); }
          catch (error) {
            // Meta peut signaler l'offset attendu après une réponse de transfert perdue.
            if (!error.offsets) throw error;
            next = position({ start_offset: error.offsets.start, end_offset: error.offsets.end }, file.taille);
          }
          if (next.start <= start) throw new Error('Facebook n’a pas confirmé de progression : conserver la session et relancer.');
          ({ start, end } = next); checkpoint({ start, end });
        }
      } finally { fs.closeSync(fd); }
    },
    async finish(state, meta) {
      const result = await api(edge, {}, form({ upload_phase: 'finish', upload_session_id: state.sessionId,
        title: meta.snippet.title, description: meta.snippet.description, published: true }));
      if (result.success !== true) throw new Error('Finalisation Facebook non confirmée.');
    },
    async miniature(id, file) {
      const body = new FormData(); body.set('is_preferred', 'true');
      body.set('source', new Blob([fs.readFileSync(file)], { type: /\.png$/i.test(file) ? 'image/png' : 'image/jpeg' }), 'thumbnail');
      await api(`${id}/thumbnails`, {}, body);
    },
  };
}
module.exports = { facebookClient };
