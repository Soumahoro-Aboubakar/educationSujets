#!/usr/bin/env node
/*
 * Enregistre l'empreinte SHA-256 d'un fichier APRÈS sa publication réussie sur Fatafalta.
 * Le serveur ne stocke pas d'empreinte : ce registre local permet ensuite à verify:subjects
 * de reconnaître le même fichier même s'il est republié sous un autre titre (doublon confirmé).
 *
 *   npm run referentiel:empreinte -- --id <identifiant renvoyé par le serveur> --fichier <chemin du PDF>
 *
 * N'écrit que dans docs/referentiel-sujets/ (empreintes-fichiers.json + journal). Aucun appel réseau.
 */
const fs = require('fs');
const path = require('path');
const lib = require('./lib');

const args = process.argv.slice(2);
const option = (name) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : null;
};

const recordFingerprint = ({ id, filePath, dir = lib.DEFAULT_DIR, now = new Date().toISOString() }) => {
  if (!/^[0-9a-f]{24}$/i.test(String(id || ''))) throw new Error('--id doit être un identifiant de document (24 caractères hexadécimaux)');
  if (!filePath || !fs.existsSync(filePath)) throw new Error(`Fichier introuvable : ${filePath}`);
  const registryFile = path.join(dir, 'empreintes-fichiers.json');
  const registry = lib.readJson(registryFile, { version: 1, empreintes: [] });
  const inventaire = lib.readJson(path.join(dir, 'inventaire-complet.json'), { ressources: [] });
  const entry = inventaire.ressources.find((item) => item.id === id);
  const sha256 = lib.sha256File(filePath);
  const size = fs.statSync(filePath).size;
  const warnings = [];

  const sameHash = registry.empreintes.find((item) => item.sha256 === sha256 && item.id !== id);
  if (sameHash) warnings.push(`ce fichier est déjà enregistré pour ${sameHash.id} : doublon confirmé à traiter`);
  if (!entry) warnings.push('identifiant absent de l\'inventaire : lancer « npm run referentiel:sync » après la publication');
  else if (entry.fichier?.tailleOctets && entry.fichier.tailleOctets !== size) {
    warnings.push(`taille locale ${size} o ≠ taille serveur ${entry.fichier.tailleOctets} o (image convertie en PDF ou mauvais fichier ?)`);
  }

  const record = { id, sha256, tailleOctets: size, nomFichier: path.basename(filePath), titre: entry?.titre || null, enregistreLe: now };
  registry.empreintes = [...registry.empreintes.filter((item) => item.id !== id), record];
  fs.writeFileSync(registryFile, `${JSON.stringify(registry, null, 2)}\n`);
  fs.appendFileSync(path.join(dir, 'journal-mises-a-jour.jsonl'), `${JSON.stringify({ date: now, action: 'empreinte', id, sha256, tailleOctets: size, avertissements: warnings })}\n`);
  return { record, warnings };
};

if (require.main === module) {
  try {
    const base = process.env.INIT_CWD || process.cwd();
    const { record, warnings } = recordFingerprint({
      id: option('--id'),
      filePath: option('--fichier') && path.resolve(base, option('--fichier')),
      dir: option('--dir') ? path.resolve(base, option('--dir')) : lib.DEFAULT_DIR,
    });
    console.log(`Empreinte enregistrée pour ${record.id} : ${record.sha256} (${record.tailleOctets} o)`);
    warnings.forEach((warning) => console.log(`⚠ ${warning}`));
  } catch (error) {
    console.error(`Erreur : ${error.message}`);
    process.exit(1);
  }
}

module.exports = { recordFingerprint };
