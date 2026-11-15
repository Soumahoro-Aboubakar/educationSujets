#!/usr/bin/env node
/**
 * Recense formations (concours), modules et leçons du pack, puis écrit un lot de recherche par
 * module : data/prep/videos-externes/lots/<MODULE>.json (fiche pédagogique de chaque leçon).
 * Lecture seule sur le contenu. Les leçons déjà décidées (selections.json) sont marquées.
 *
 *   node scripts/video/externe/inventaire.js [--module MATH-LNEXP]
 */
const fs = require('fs');
const path = require('path');
const { DIR, brief, lireSelections } = require('./lib');

const pack = require('../../../data/prep/build/pack.json');

const filtre = process.argv.includes('--module') ? process.argv[process.argv.indexOf('--module') + 1] : null;
const selections = lireSelections();
const modules = Object.values(pack.modules).filter((m) => m.publie && (!filtre || m.code === filtre));
fs.mkdirSync(path.join(DIR, 'lots'), { recursive: true });

let lecons = 0; let decidees = 0;
for (const mod of modules) {
  const concours = pack.programmes
    .filter((p) => p.matieres.some((x) => x.modules.some((y) => y.code === mod.code)))
    .map((p) => `${p.organisme.sigle} — ${p.titre}`);
  const fiches = mod.lecons.map((l, i) => ({ ...brief(mod, l, i), dejaDecidee: Boolean(selections[l.code]) }));
  lecons += fiches.length; decidees += fiches.filter((f) => f.dejaDecidee).length;
  const lot = { module: mod.code, titre: mod.titre, matiere: mod.matiere, resume: mod.resume, concours, lecons: fiches };
  fs.writeFileSync(path.join(DIR, 'lots', `${mod.code}.json`), `${JSON.stringify(lot, null, 2)}\n`);
}
console.log(`Formations (concours) : ${pack.programmes.length} · modules : ${modules.length} · leçons : ${lecons} · déjà décidées : ${decidees}`);
