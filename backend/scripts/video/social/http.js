const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Ne propage jamais de corps d'erreur ni d'URL pouvant contenir un secret.
async function request(fetchImpl, url, init = {}) {
  try { return await fetchImpl(url, { signal: AbortSignal.timeout(120000), redirect: 'error', ...init }); }
  catch { throw new Error('Requête réseau interrompue. Relancer la même commande pour reprendre.'); }
}
async function json(response, service) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.error) {
    const code = data.error?.code;
    const error = new Error(`${service} : HTTP ${response.status}${Number.isInteger(code) ? ` (code ${code})` : ''}. Vérifier droits, quota et connexion dans le guide.`);
    error.status = response.status;
    // Seuls les offsets numériques sont conservés, jamais le message externe.
    const offsets = data.error?.error_data;
    if (offsets && /^\d+$/.test(String(offsets.start_offset)) && /^\d+$/.test(String(offsets.end_offset))) {
      error.offsets = { start: Number(offsets.start_offset), end: Number(offsets.end_offset) };
    }
    throw error;
  }
  return data;
}
// Réessaie uniquement les lectures. Les créations doivent d'abord être réconciliées.
async function read(fetchImpl, url, init = {}, pause = sleep) {
  for (let attempt = 0; ; attempt += 1) {
    const response = await request(fetchImpl, url, init);
    if (attempt >= 3 || !(response.status === 429 || response.status >= 500)) return response;
    await pause(1000 * 2 ** attempt);
  }
}
module.exports = { request, json, read, sleep };
