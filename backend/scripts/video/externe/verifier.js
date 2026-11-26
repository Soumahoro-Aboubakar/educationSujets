#!/usr/bin/env node
/**
 * Vérifie des vidéos YouTube (existence, intégration autorisée, durée ≤ 15 min, chaîne, langue)
 * et met en cache le résultat : data/prep/videos-externes/verifications.json (une entrée par id).
 *
 *   node scripts/video/externe/verifier.js <id|url> [...]          vérifie (cache 7 jours)
 *   node scripts/video/externe/verifier.js --selections [--force]  revérifie les vidéos retenues
 *
 * Une requête à la fois, espacées : lecture légère des pages publiques, comme un navigateur.
 */
const fs = require('fs');
const path = require('path');
const { DIR, verifierVideo, lireSelections } = require('./lib');

const CACHE = path.join(DIR, 'verifications.json');
const SEMAINE = 7 * 24 * 3600 * 1000;
const pause = (ms) => new Promise((r) => { setTimeout(r, ms); });
const idDe = (s) => (String(s).match(/(?:v=|youtu\.be\/|^)([A-Za-z0-9_-]{11})(?:[&?#]|$)/) || [])[1];

const lireCache = () => (fs.existsSync(CACHE) ? JSON.parse(fs.readFileSync(CACHE, 'utf8')) : {});
const ecrireCache = (c) => { fs.mkdirSync(DIR, { recursive: true }); fs.writeFileSync(CACHE, `${JSON.stringify(c, null, 1)}\n`); };

/** Vérifie une liste d'ids, en réutilisant le cache récent. Renvoie { id: verification }. */
const verifierListe = async (ids, { force = false, log = console.log } = {}) => {
  const cache = lireCache();
  const res = {};
  for (const id of [...new Set(ids)]) {
    const connu = cache[id];
    if (connu && !force && Date.now() - Date.parse(connu.verifieeLe) < SEMAINE && !/illisible|erreur réseau/.test(connu.motifs.join())) { res[id] = connu; continue; }
    try { res[id] = await verifierVideo(id); } catch (error) { res[id] = { youtubeId: id, ok: false, motifs: [`erreur réseau : ${error.message}`], verifieeLe: new Date().toISOString() }; }
    cache[id] = res[id];
    ecrireCache(cache);
    const v = res[id];
    log(`${v.ok ? '✓' : '✗'} ${id} ${v.durationSec ? `${Math.floor(v.durationSec / 60)}:${String(v.durationSec % 60).padStart(2, '0')}` : '?'} [${v.langueAudio || '?'}] ${v.chaine || ''} — ${v.titre || ''}${v.ok ? '' : ` ⟶ ${v.motifs.join(' ; ')}`}`);
    await pause(700);
  }
  return res;
};

if (require.main === module) {
  const args = process.argv.slice(2);
  const force = args.includes('--force');
  const ids = args.includes('--selections')
    ? Object.values(lireSelections()).filter((s) => s.youtubeId).map((s) => s.youtubeId)
    : args.filter((a) => !a.startsWith('--')).map(idDe).filter(Boolean);
  verifierListe(ids, { force }).then((r) => {
    const ko = Object.values(r).filter((v) => !v.ok).length;
    console.log(`${Object.keys(r).length} vidéo(s) · ${ko} refusée(s)`);
  });
}

module.exports = { verifierListe, lireCache, idDe };
