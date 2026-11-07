/**
 * Storyboard d'une vidéo : le script texte, scène par scène, produit AVANT le rendu.
 * Il est relisible et contrôlable automatiquement (exigence « expliquer avant d'utiliser »).
 *
 * {
 *   cible: { type: 'module' | 'concours', code, langue },
 *   scenes: [{
 *     id: 's1',
 *     objectif: 'ce que la scène apporte',
 *     narration: 'texte dit à voix haute',
 *     definit: ['participe passé'],          // termes définis dans cette scène
 *     utilise: ['auxiliaire'],               // termes utilisés (en plus de ceux trouvés dans la narration)
 *     visuel: { type: 'schema' | 'illustration' | 'animation' | 'tableau' | 'formule' | 'texte', description: '…' },
 *   }],
 * }
 * Aucune durée n'est imposée.
 */
const TYPES_VISUEL = new Set(['schema', 'illustration', 'animation', 'tableau', 'formule', 'texte']);

const norm = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const mentionne = (texte, terme) => new RegExp(`(^|[^\\p{L}\\p{N}])${escape(norm(terme))}([^\\p{L}\\p{N}]|$)`, 'u').test(norm(texte));

/**
 * @param storyboard voir ci-dessus
 * @param options.glossaire termes qui DOIVENT être définis (glossaire ordonné du dossier de génération)
 * @returns {{ ok: boolean, erreurs: string[] }}
 */
const verifierStoryboard = (storyboard, { glossaire = [] } = {}) => {
  const erreurs = [];
  const scenes = storyboard?.scenes;
  if (!Array.isArray(scenes) || !scenes.length) return { ok: false, erreurs: ['aucune scène'] };

  scenes.forEach((s, i) => {
    const ou = `scène ${s.id || i + 1}`;
    if (!s.narration || !String(s.narration).trim()) erreurs.push(`${ou} : narration vide`);
    if (!s.visuel || !TYPES_VISUEL.has(s.visuel.type) || !String(s.visuel.description || '').trim()) erreurs.push(`${ou} : visuel manquant ou non représentatif (type et description obligatoires)`);
  });

  const termes = new Set([...glossaire, ...scenes.flatMap((s) => [...(s.definit || []), ...(s.utilise || [])])]);
  termes.forEach((terme) => {
    const definition = scenes.findIndex((s) => (s.definit || []).some((t) => norm(t) === norm(terme)));
    const usage = scenes.findIndex((s) => (s.utilise || []).some((t) => norm(t) === norm(terme)) || mentionne(s.narration || '', terme));
    if (definition < 0) {
      if (glossaire.includes(terme) || usage >= 0) erreurs.push(`« ${terme} » n’est jamais défini`);
      return;
    }
    if (usage >= 0 && usage < definition) {
      erreurs.push(`« ${terme} » est utilisé scène ${scenes[usage].id || usage + 1} avant d’être défini (scène ${scenes[definition].id || definition + 1})`);
    }
  });
  return { ok: erreurs.length === 0, erreurs };
};

module.exports = { verifierStoryboard, TYPES_VISUEL };
