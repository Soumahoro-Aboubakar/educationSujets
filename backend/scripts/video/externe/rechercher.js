#!/usr/bin/env node
/**
 * Recherche déléguée à ChatGPT (Codex CLI, compte ChatGPT, recherche web) pour un ou plusieurs
 * modules. Résultat brut : data/prep/videos-externes/recherches/<MODULE>.json (à vérifier ensuite
 * par verifier.js — une proposition de ChatGPT n'est jamais écrite en base telle quelle).
 *
 *   node scripts/video/externe/rechercher.js MATH-LNEXP [ENSEA-AS-STAT …] [--force] [--modele gpt-6.1-sol]
 *
 * Code de sortie 5 : quota ChatGPT atteint (les modules déjà traités sont conservés).
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { DIR } = require('./lib');

const args = process.argv.slice(2);
const force = args.includes('--force');
const modele = args.includes('--modele') ? args[args.indexOf('--modele') + 1] : 'gpt-6.1-sol';
const modules = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--modele');
const LOTS = path.join(DIR, 'lots');
const OUT = path.join(DIR, 'recherches');
const BRIEF = fs.readFileSync(path.join(__dirname, 'brief-recherche.md'), 'utf8');
const SCHEMA = path.join(__dirname, 'recherche.schema.json');
fs.mkdirSync(OUT, { recursive: true });

for (const code of modules) {
  const lot = path.join(LOTS, `${code}.json`);
  const sortie = path.join(OUT, `${code}.json`);
  if (!fs.existsSync(lot)) { console.error(`✗ ${code} : lot absent (lancer inventaire.js)`); process.exitCode = 2; continue; }
  if (fs.existsSync(sortie) && !force) { console.log(`= ${code} : déjà recherché (--force pour refaire)`); continue; }
  const debut = Date.now();
  const r = spawnSync('codex', ['--search', 'exec', '-m', modele, '-c', 'model_reasoning_effort=medium',
    '-s', 'read-only', '--skip-git-repo-check', '--ephemeral', '-C', LOTS,
    '--output-schema', SCHEMA, '-o', `${sortie}.tmp`, BRIEF.replace('{{LOT}}', `${code}.json`)],
  { encoding: 'utf8', timeout: 40 * 60 * 1000, maxBuffer: 64 * 1024 * 1024 });
  const journal = `${r.stdout || ''}\n${r.stderr || ''}`;
  fs.writeFileSync(path.join(OUT, `${code}.log`), journal.slice(-20000));
  if (/usage limit|rate limit|quota/i.test(journal) && r.status !== 0) {
    console.error(`✗ ${code} : quota ChatGPT atteint — arrêt (reprendre plus tard ou continuer à la main).`);
    process.exit(5);
  }
  try {
    const data = JSON.parse(fs.readFileSync(`${sortie}.tmp`, 'utf8'));
    fs.renameSync(`${sortie}.tmp`, sortie);
    const n = data.lecons.filter((l) => l.candidats.length).length;
    console.log(`✓ ${code} : ${n}/${data.lecons.length} leçons avec candidat(s) · ${Math.round((Date.now() - debut) / 1000)} s`);
  } catch (error) {
    console.error(`✗ ${code} : réponse inexploitable (code ${r.status}) — voir recherches/${code}.log`);
    process.exitCode = 1;
  }
}
