const fs = require('fs');
const path = require('path');

/**
 * Journal de reprise local, un fichier par cible : backend/.video-state/<type>-<code>-<langue>.json
 * (ignoré par git). Il retient la session d'envoi et l'identifiant YouTube obtenu : si l'écriture
 * en base échoue après l'envoi, la relance reprend à l'étape suivante sans renvoyer la vidéo.
 */
const DIR = path.resolve(__dirname, '../../../.video-state');

const createEtat = (dir = DIR) => {
  const file = (cible) => path.join(dir, `${cible.type}-${cible.code}-${cible.langue}.json`);
  return {
    dir,
    lire: (cible) => {
      try { return JSON.parse(fs.readFileSync(file(cible), 'utf8')); } catch (error) { return {}; }
    },
    ecrire: (cible, patch) => {
      fs.mkdirSync(dir, { recursive: true });
      const next = { ...createEtat(dir).lire(cible), ...patch, majLe: new Date().toISOString() };
      fs.writeFileSync(file(cible), `${JSON.stringify(next, null, 2)}\n`);
      return next;
    },
    effacer: (cible) => { try { fs.unlinkSync(file(cible)); } catch (error) { /* rien */ } },
  };
};

module.exports = { createEtat, DIR };
