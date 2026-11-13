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

test('Le pack de contenu est versionné (sinon l’API de préparation répond 500 en production)', () => {
  const pack = path.join(ROOT, 'data/prep/build/pack.json');
  assert.ok(fs.existsSync(pack), 'Lancer « npm run prep:pack ».');
  let ignored = false;
  try {
    execFileSync('git', ['check-ignore', '-q', pack], { cwd: ROOT, stdio: 'ignore' });
    ignored = true; // code 0 : le fichier est ignoré par git
  } catch (error) {
    ignored = false; // code 1 (non ignoré) ou git absent (dépôt déployé)
  }
  assert.equal(ignored, false, 'data/prep/build/pack.json ne doit pas être ignoré par .gitignore');
});

test('La copie mobile du moteur partagé est identique à la source', () => {
  const source = fs.readFileSync(path.join(ROOT, 'services/prep/shared/prepCore.js'), 'utf8');
  const mobilePath = path.resolve(ROOT, '../fatafalta/src/prep/shared/prepCore.js');
  if (!fs.existsSync(mobilePath)) return; // dépôt backend déployé seul
  assert.equal(fs.readFileSync(mobilePath, 'utf8'), source, 'Lancer « npm run prep:pack » pour resynchroniser la copie mobile.');
});

test('La copie web du moteur partagé est identique à la source', () => {
  const source = fs.readFileSync(path.join(ROOT, 'services/prep/shared/prepCore.js'), 'utf8');
  const webPath = path.resolve(ROOT, '../frontend/src/prep/shared/prepCore.js');
  if (!fs.existsSync(webPath)) return; // dépôt backend déployé seul
  assert.equal(fs.readFileSync(webPath, 'utf8'), source, 'Lancer « npm run prep:pack » pour resynchroniser la copie web.');
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
