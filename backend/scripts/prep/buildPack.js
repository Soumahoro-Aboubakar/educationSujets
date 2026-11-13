#!/usr/bin/env node
/**
 * Construit le pack de contenu de la préparation et le copie dans l'application mobile.
 *
 *   npm run prep:pack            contrôle + écriture
 *   npm run prep:pack -- --check contrôle seulement (code de sortie 1 si erreur)
 *
 * Étapes (cahier des charges § 26.2, étape 3 « contrôles automatiques ») :
 *  1. charge la bibliothèque de modules et les programmes pilotes ;
 *  2. valide chaque exercice (schéma, clés, mini-cours ≤ 150 mots, raisonnement) ;
 *  3. vérifie que chaque bonne réponse est bien acceptée par le validateur partagé ;
 *  4. écrit backend/data/prep/build/pack.json (source du seed MongoDB) ;
 *  5. copie le pack et prepCore.js dans fatafalta/src/prep/ (mode hors ligne, § 22).
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const DATA = path.join(ROOT, 'data/prep');
const MOBILE = path.resolve(ROOT, '../fatafalta/src/prep');
const checkOnly = process.argv.includes('--check');

const bibliotheque = fs.readdirSync(path.join(DATA, 'bibliotheque'))
  .filter((file) => file.endsWith('.js'))
  .flatMap((file) => require(path.join(DATA, 'bibliotheque', file)));
const programmes = require(path.join(DATA, 'programmes'));

const { validateContent } = require('../../services/prep/contentValidator');
const { hash } = require('../../services/prep/publicationService');
const normalized = programmes.map(prog => ({ ...prog, matieres: prog.matieres.map((matiere, teinte) => ({
  nom: matiere.nom, teinte, modules: matiere.modules.map(ref => typeof ref === 'string'
    ? { code: ref, publie: true }
    : { code: ref.code, titre: ref.titre, notions: ref.notions.map((libelle, i) => ({ code: `N${i + 1}`, libelle })), publie: false }),
})) }));
const { errors, warnings: warn, modules, programmes: packProgrammes } = validateContent(bibliotheque, normalized);

if (warn.length) console.warn(`⚠️  ${warn.length} avertissement(s)\n  ${warn.join('\n  ')}`);
if (errors.length) {
  console.error(`❌ ${errors.length} erreur(s) de contenu :\n  ${errors.join('\n  ')}`);
  process.exit(1);
}

const totalEx = Object.values(modules).reduce((s, m) => s + m.exercices.length, 0);
const totalLecons = Object.values(modules).reduce((s, m) => s + m.lecons.length, 0);
console.log(`✅ Contenu valide : ${Object.keys(modules).length} modules, ${totalLecons} leçons, ${totalEx} exercices, ${packProgrammes.length} programmes.`);
if (checkOnly) process.exit(0);

const pack = {
  version: 1,
  genereLe: new Date().toISOString(),
  provenance: {
    redaction: 'Claude (Anthropic) — modèle A',
    relecture: 'À faire par un second modèle d’une autre famille puis par le propriétaire (§ 26.2, étapes 4 à 6)',
    statut: 'brouillon-pilote',
  },
  programmes: packProgrammes,
  modules,
  // Empreintes SHA-256 de chaque module, calculées comme le registre de publication (lot 3) :
  // l'app garde le module embarqué tant que le manifeste publié porte la même empreinte.
  empreintes: { modules: Object.fromEntries(Object.entries(modules).map(([code, mod]) => [code, hash(mod)])) },
};

fs.mkdirSync(path.join(DATA, 'build'), { recursive: true });
fs.writeFileSync(path.join(DATA, 'build/pack.json'), `${JSON.stringify(pack, null, 1)}\n`);

fs.mkdirSync(path.join(MOBILE, 'shared'), { recursive: true });
fs.mkdirSync(path.join(MOBILE, 'content'), { recursive: true });
fs.copyFileSync(path.join(ROOT, 'services/prep/shared/prepCore.js'), path.join(MOBILE, 'shared/prepCore.js'));
fs.writeFileSync(path.join(MOBILE, 'content/pack.json'), JSON.stringify(pack));
const size = fs.statSync(path.join(MOBILE, 'content/pack.json')).size;
console.log(`📦 Pack écrit (${(size / 1024).toFixed(0)} Ko) : backend/data/prep/build/pack.json et fatafalta/src/prep/content/pack.json`);
