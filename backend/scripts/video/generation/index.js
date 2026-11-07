/**
 * Point de branchement des générateurs de vidéo (étape « a » du pipeline) — AUCUN branché.
 *
 * Contrat d'un générateur (à ajouter plus tard dans GENERATEURS) :
 *   async ({ brief, storyboard, sortie }) => ({ fichier: '<chemin du mp4>', generateur: '<nom@version>' })
 *   - brief      : dossier construit par generation/brief.js depuis le contenu du projet ;
 *   - storyboard : script scène par scène, validé par verifierStoryboard (expliquer avant d'utiliser) ;
 *   - sortie     : dossier local où écrire la vidéo (jamais dans le dépôt).
 * Le fichier produit est ensuite publié par publish.js --fichier <mp4> (étapes b → d).
 */
const { SANS_GENERATEUR } = require('../lib/pipeline');

const GENERATEURS = {};

const generer = async (nom, args) => {
  const generateur = GENERATEURS[nom];
  if (!generateur) throw new Error(SANS_GENERATEUR);
  return generateur(args);
};

module.exports = { GENERATEURS, generer };
