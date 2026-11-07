/**
 * Vérification du raisonnement par IA (§ 13).
 *
 * Le fournisseur et le modèle ne sont pas encore choisis (§ 33, question 3). Ce module définit le
 * contrat attendu ; tant qu'aucun fournisseur n'est branché, `verify` renvoie `null` et l'API
 * affiche le raisonnement de référence SANS décompter de vérification (§ 13.4).
 *
 * Contrat d'un fournisseur : async ({ consigne, reponseCorrecte, reference, etapesCles, texte })
 *   → { verdict: 'exact'|'partiel'|'faux', etapesValidees: string[], etapesManquantes: string[], explication: string }
 * L'IA compare le texte à la grille (référence + étapes clés) ; elle n'invente pas la réponse.
 */
let provider = null;

const registerProvider = (fn) => { provider = typeof fn === 'function' ? fn : null; };

const sanitize = (texte) => String(texte || '').replace(/\s+/g, ' ').trim().slice(0, 1000);

const verify = async ({ exercice, texte, timeoutMs = 4000 }) => {
  if (!provider || !exercice?.raisonnement?.actif) return null;
  const input = {
    consigne: exercice.consigne,
    reference: exercice.raisonnement.reference,
    etapesCles: exercice.raisonnement.etapesCles,
    texte: sanitize(texte),
  };
  try {
    const result = await Promise.race([
      provider(input),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), timeoutMs)),
    ]);
    if (!result || !['exact', 'partiel', 'faux'].includes(result.verdict)) return null;
    const etapes = new Set(exercice.raisonnement.etapesCles);
    return {
      verdict: result.verdict,
      etapesValidees: (result.etapesValidees || []).filter((e) => etapes.has(e)),
      etapesManquantes: (result.etapesManquantes || []).filter((e) => etapes.has(e)),
      explication: String(result.explication || '').slice(0, 900),
    };
  } catch (error) {
    return null; // échec ou délai dépassé : non décompté
  }
};

module.exports = { registerProvider, verify, isAvailable: () => Boolean(provider) };
