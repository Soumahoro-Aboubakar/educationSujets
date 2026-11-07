const readline = require('readline');

/**
 * Confirmation explicite avant toute écriture en base de production : il faut taper le code de
 * la cible (ou le passer avec --confirmer <code> pour une exécution non interactive).
 */
const createConfirm = ({ input = process.stdin, output = process.stdout, preconfirme = null } = {}) => async (attendu, question) => {
  if (preconfirme !== null) return preconfirme === attendu;
  if (!input.isTTY) return false; // pas de terminal et pas de --confirmer : on n'écrit pas
  const rl = readline.createInterface({ input, output });
  try {
    const answer = await new Promise((resolve) => rl.question(`${question} Tape ${attendu} pour confirmer (Entrée pour annuler) : `, resolve));
    return answer.trim() === attendu;
  } finally {
    rl.close();
  }
};

module.exports = { createConfirm };
