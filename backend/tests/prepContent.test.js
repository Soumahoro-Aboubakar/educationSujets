const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');

test('Le contenu de préparation passe tous les contrôles automatiques', () => {
  const out = execFileSync(process.execPath, [path.join(ROOT, 'scripts/prep/buildPack.js'), '--check'], { encoding: 'utf8' });
  assert.match(out, /Contenu valide/);
});

test('La copie mobile du moteur partagé est identique à la source', () => {
  const source = fs.readFileSync(path.join(ROOT, 'services/prep/shared/prepCore.js'), 'utf8');
  const mobilePath = path.resolve(ROOT, '../fatafalta/src/prep/shared/prepCore.js');
  if (!fs.existsSync(mobilePath)) return; // dépôt backend déployé seul
  assert.equal(fs.readFileSync(mobilePath, 'utf8'), source, 'Lancer « npm run prep:pack » pour resynchroniser la copie mobile.');
});

test('Chaque programme pilote couvre les 6 organismes demandés', () => {
  const programmes = require('../data/prep/programmes');
  const sigles = new Set(programmes.map((p) => p.organisme.sigle));
  ['INPHB', 'ESATIC', 'INFJ', 'INFAS', 'ENS', 'ENSEA'].forEach((s) => assert.ok(sigles.has(s), s));
  programmes.forEach((p) => {
    assert.ok(p.sources.length, `${p.code} : sources manquantes`);
    assert.ok(['officielle', 'anciens-sujets'].includes(p.fiabilite));
  });
});
