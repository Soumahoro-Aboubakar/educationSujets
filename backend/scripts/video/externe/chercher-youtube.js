#!/usr/bin/env node
/**
 * Recherche de secours (quand ChatGPT n'est pas disponible) : lit la page publique de résultats
 * YouTube et liste de vrais candidats (identifiant, titre, chaîne, durée, vues) pour chaque leçon.
 * Aucun identifiant n'est inventé : tout vient de la page de résultats. Le choix reste humain/Claude.
 *
 *   node scripts/video/externe/chercher-youtube.js "<requête>" ["<requête 2>" …]   → candidats en clair
 *   node scripts/video/externe/chercher-youtube.js --lot MODULE [--codes L1,L2]    → requêtes tirées du lot,
 *       résultat : data/prep/videos-externes/candidats/<MODULE>.json
 *
 * Une requête à la fois, espacées (lecture légère, comme un navigateur). Durée > 15 min ignorée.
 */
const fs = require('fs');
const path = require('path');
const { DIR, extraireJson, propre } = require('./lib');

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36',
  'Accept-Language': 'fr-FR,fr;q=0.9',
  Cookie: 'CONSENT=YES+1; SOCS=CAI',
};
const pause = (ms) => new Promise((r) => { setTimeout(r, ms); });
const secondes = (t) => (t ? t.split(':').reduce((a, x) => a * 60 + Number(x), 0) : null);

const collecter = (noeud, sortie) => {
  if (!noeud || typeof noeud !== 'object') return;
  if (noeud.videoRenderer) { sortie.push(noeud.videoRenderer); return; }
  for (const v of Object.values(noeud)) collecter(v, sortie);
};

const chercher = async (requete, max = 8, essai = 0) => {
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(requete.replace(/[\^]/g, ' '))}&hl=fr&gl=CI`;
  let html;
  try { html = await (await fetch(url, { headers: HEADERS })).text(); } catch (error) {
    if (essai < 2) { await pause(5000 * (essai + 1)); return chercher(requete, max, essai + 1); }
    console.error(`! « ${requete} » : ${error.message}`);
    return [];
  }
  const data = extraireJson(html, 'ytInitialData');
  if (!data) return [];
  const rendus = [];
  collecter(data, rendus);
  return rendus.map((r) => ({
    id: r.videoId,
    titre: propre(r.title?.runs?.map((x) => x.text).join('')),
    chaine: propre(r.ownerText?.runs?.[0]?.text),
    duree: r.lengthText?.simpleText || null,
    sec: secondes(r.lengthText?.simpleText),
    vues: propre(r.viewCountText?.simpleText || ''),
  })).filter((c) => c.id && c.sec && c.sec <= 900).slice(0, max);
};

const requetesLecon = (l) => {
  const titre = l.titre.replace(/[«»"?]/g, '').trim();
  const [, mod = '', matiere = ''] = String(l.module || '').match(/^(.*?)\s*\((.*)\)$/) || [];
  return [`${titre} ${matiere} cours`, `${mod} ${titre}`.slice(0, 120)];
};

const main = async () => {
  const args = process.argv.slice(2);
  if (args[0] !== '--lot') {
    for (const q of args) {
      console.log(`# ${q}`);
      for (const c of await chercher(q, Number(process.env.MAX) || 8)) console.log(`${c.id} ${c.duree.padStart(5)} | ${c.chaine} | ${c.titre} | ${c.vues}`);
      await pause(800);
    }
    return;
  }
  const mod = args[1];
  const codes = args.includes('--codes') ? args[args.indexOf('--codes') + 1].split(',') : null;
  const lot = JSON.parse(fs.readFileSync(path.join(DIR, 'lots', `${mod}.json`), 'utf8'));
  const lecons = (lot.lecons || lot).filter((l) => !codes || codes.some((c) => l.code.endsWith(`-${c}`) || l.code === c));
  const out = {};
  for (const l of lecons) {
    const vus = new Map();
    for (const q of requetesLecon(l)) {
      for (const c of await chercher(q)) if (!vus.has(c.id)) vus.set(c.id, c);
      await pause(800);
    }
    out[l.code] = { titre: l.titre, candidats: [...vus.values()].slice(0, 10) };
    console.log(`· ${l.code} ${l.titre} : ${vus.size} candidat(s)`);
  }
  const dir = path.join(DIR, 'candidats');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${mod}.json`), `${JSON.stringify(out, null, 1)}\n`);
};

main();
