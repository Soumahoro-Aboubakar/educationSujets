#!/usr/bin/env node
/**
 * Fiche de relecture d'un module : pour chaque leçon, son sujet, les candidats de ChatGPT
 * (recherches/<M>.json) VÉRIFIÉS sur YouTube, puis les candidats de la recherche de secours
 * (candidats/<M>.json). Sert à écrire decisions/<M>.json. Lecture seule (sauf cache de vérification).
 *
 *   node scripts/video/externe/revue.js MODULE [--secours N]
 */
const fs = require('fs');
const path = require('path');
const { DIR } = require('./lib');
const { verifierListe, idDe } = require('./verifier');

const lire = (sous, mod) => { const f = path.join(DIR, sous, `${mod}.json`); return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null; };
const mmss = (s) => (s ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : '?');

const main = async () => {
  const mod = process.argv[2];
  const nSecours = process.argv.includes('--secours') ? Number(process.argv[process.argv.indexOf('--secours') + 1]) : 4;
  const lot = lire('lots', mod);
  const rech = lire('recherches', mod);
  const sec = lire('candidats', mod) || {};
  const parCode = Object.fromEntries((rech?.lecons || []).map((l) => [l.code, l]));
  const ids = [];
  for (const l of lot.lecons) {
    for (const c of parCode[l.code]?.candidats || []) { const id = idDe(c.url); if (id) ids.push(id); }
    for (const c of (sec[l.code]?.candidats || []).slice(0, nSecours)) ids.push(c.id);
  }
  const v = await verifierListe(ids, { log: () => {} });
  console.log(`# ${mod} — ${lot.titre} (${lot.matiere}) · ${lot.lecons.length} leçons · ChatGPT : ${rech ? 'oui' : 'non'}`);
  for (const l of lot.lecons) {
    console.log(`\n## ${l.code} | ${l.titre}`);
    console.log(`   ${String(l.explication).slice(0, 220)}`);
    if (l.formules?.length) console.log(`   F: ${l.formules.slice(0, 3).join(' ; ').slice(0, 200)}`);
    const r = parCode[l.code];
    if (r && !r.candidats.length) console.log(`   GPT: aucun — ${r.justification.slice(0, 160)}`);
    for (const c of r?.candidats || []) {
      const id = idDe(c.url); const x = v[id] || {};
      console.log(`   GPT ${id} ${mmss(x.durationSec)} [${x.langueAudio || '?'}] ${x.ok ? 'OK' : `KO(${(x.motifs || ['?']).join(';')})`} ${c.couverture} | ${x.chaine || c.chaine} | ${x.titre || c.titre} — ${c.pourquoi.slice(0, 140)}`);
    }
    for (const c of (sec[l.code]?.candidats || []).slice(0, nSecours)) {
      const x = v[c.id] || {};
      console.log(`   YT  ${c.id} ${c.duree} [${x.langueAudio || '?'}] ${x.ok ? 'OK' : `KO(${(x.motifs || ['?']).join(';')})`} | ${c.chaine} | ${c.titre} | ${c.vues}`);
    }
  }
};

main();
