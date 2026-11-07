/**
 * Petit langage de rédaction des contenus de préparation.
 * Les auteurs (modèle A puis relecture B, § 26) écrivent dans l'ordre « juste » :
 * le mélange est fait à l'exécution, avec une graine par session (§ 11.11).
 */

const ids = (prefix, list) => list.map((_, index) => `${prefix}${index + 1}`);

const base = (spec, type, contenu, cle) => {
  const ex = {
    code: spec.code,
    type,
    niveau: spec.niveau,
    consigne: spec.consigne,
    contenu,
    cle,
    explication: spec.explication,
    miniCours: spec.miniCours,
    indice: spec.indice || null,
    notions: spec.notions || [],
  };
  if (spec.raisonnement) {
    ex.raisonnement = { actif: true, reference: spec.raisonnement.reference, etapesCles: spec.raisonnement.etapes };
  }
  if (spec.source) ex.source = spec.source;
  return ex;
};

/** Mini-cours : rappel de la règle, jamais la réponse (§ 12.1). */
const mc = (titre, corps, aRetenir) => ({ titre, corps, aRetenir: aRetenir || null });

const qcm = (spec) => {
  const optionIds = ids('o', spec.options);
  const bonnes = Array.isArray(spec.bonne) ? spec.bonne : [spec.bonne];
  return base(spec, 'qcm', {
    enonce: spec.enonce || null,
    multiple: Boolean(spec.multiple),
    options: spec.options.map((texte, index) => ({ id: optionIds[index], texte })),
  }, { ids: bonnes.map((index) => optionIds[index]) });
};

const vf = (spec) => {
  const aIds = ids('a', spec.affirmations);
  const valeurs = {};
  spec.affirmations.forEach(([, valeur], index) => { valeurs[aIds[index]] = valeur; });
  return base(spec, 'vraiFaux', {
    chronometre: spec.chronometre || null,
    affirmations: spec.affirmations.map(([texte, , explication], index) => ({ id: aIds[index], texte, explication: explication || null })),
  }, { valeurs });
};

/**
 * Texte à trous : « ln(ab) = {{ln a + ln b}} ». Plusieurs réponses acceptées : {{a|b}}.
 * Chaque trou crée une étiquette ; les distracteurs s'ajoutent à la réserve.
 */
const glisser = (spec) => {
  const segments = [];
  const etiquettes = [];
  const trous = {};
  const pattern = /\{\{([^}]+)\}\}/g;
  let last = 0;
  let match;
  let hole = 0;
  const etiquetteFor = (texte) => {
    const existing = etiquettes.find((e) => e.texte === texte && spec.reutilisable);
    if (existing) return existing.id;
    const id = `e${etiquettes.length + 1}`;
    etiquettes.push({ id, texte });
    return id;
  };
  while ((match = pattern.exec(spec.texte)) !== null) {
    if (match.index > last) segments.push(spec.texte.slice(last, match.index));
    hole += 1;
    const trou = `t${hole}`;
    const reponses = match[1].split('|').map((s) => s.trim());
    trous[trou] = reponses.map((texte) => etiquetteFor(texte));
    segments.push({ trou });
    last = pattern.lastIndex;
  }
  if (last < spec.texte.length) segments.push(spec.texte.slice(last));
  (spec.distracteurs || []).forEach((texte) => etiquettes.push({ id: `e${etiquettes.length + 1}`, texte }));
  return base(spec, 'glisser', { segments, etiquettes, reutilisable: Boolean(spec.reutilisable) }, { trous });
};

const entourer = (spec) => {
  const eIds = ids('x', spec.elements);
  return base(spec, 'entourer', {
    disposition: spec.disposition || 'nuage',
    afficherNombre: spec.afficherNombre !== false,
    nombreAttendu: spec.afficherNombre === false ? null : spec.elements.filter(([, ok]) => ok).length,
    elements: spec.elements.map(([texte], index) => ({ id: eIds[index], texte })),
  }, { ids: spec.elements.map(([, ok], index) => (ok ? eIds[index] : null)).filter(Boolean) });
};

const ordre = (spec) => {
  const eIds = ids('r', spec.elements);
  return base(spec, 'ordre', {
    mode: spec.mode || 'partiel',
    libelleHaut: spec.libelleHaut || null,
    libelleBas: spec.libelleBas || null,
    elements: spec.elements.map((texte, index) => ({ id: eIds[index], texte })),
  }, { ordre: eIds });
};

const relier = (spec) => {
  const gIds = ids('g', spec.paires);
  const droite = spec.paires.map(([, d], index) => ({ id: `d${index + 1}`, texte: d }));
  (spec.intrus || []).forEach((texte) => droite.push({ id: `d${droite.length + 1}`, texte }));
  const paires = {};
  gIds.forEach((g, index) => { paires[g] = `d${index + 1}`; });
  return base(spec, 'relier', {
    gauche: spec.paires.map(([g], index) => ({ id: gIds[index], texte: g })),
    droite,
  }, { paires });
};

const classer = (spec) => {
  const cIds = ids('k', spec.categories);
  const cartesIds = ids('c', spec.cartes);
  const cartes = {};
  spec.cartes.forEach(([, cat], index) => { cartes[cartesIds[index]] = cIds[cat]; });
  return base(spec, 'classer', {
    categories: spec.categories.map((nom, index) => ({ id: cIds[index], nom })),
    cartes: spec.cartes.map(([texte], index) => ({ id: cartesIds[index], texte })),
  }, { cartes });
};

const numerique = (spec) => base(spec, 'numerique', {
  enonce: spec.enonce || null,
  unite: spec.unite || null,
  decimales: spec.decimales == null ? null : spec.decimales,
}, {
  valeur: spec.valeur,
  tolerance: spec.tolerance || { type: 'abs', valeur: 0 },
  calcul: spec.calcul || [],
});

const surligner = (spec) => {
  const sIds = ids('s', spec.segments);
  return base(spec, 'surligner', {
    segments: spec.segments.map(([texte], index) => ({ id: sIds[index], texte })),
  }, {
    ids: spec.segments.map(([, ok], index) => (ok === true ? sIds[index] : null)).filter(Boolean),
    tolerance: spec.segments.map(([, ok], index) => (ok === 'tolere' ? sIds[index] : null)).filter(Boolean),
  });
};

// ── Blocs de leçon (§ 9.1) ───────────────────────────────────────────────
const b = {
  texte: (md) => ({ type: 'texte', md }),
  titre: (texte) => ({ type: 'titre', texte }),
  retenir: (texte, titre = 'À retenir') => ({ type: 'aRetenir', titre, texte }),
  piege: (texte, titre = 'Piège fréquent') => ({ type: 'piege', titre, texte }),
  exemple: (titre, texte) => ({ type: 'exemple', titre, texte }),
  liste: (items, ordonnee = false) => ({ type: 'liste', items, ordonnee }),
  tableau: (entetes, lignes, legende) => ({ type: 'tableau', entetes, lignes, legende: legende || null }),
  formule: (texte, legende) => ({ type: 'formule', texte, legende: legende || null }),
  question: (exercice) => ({ type: 'miniQuestion', exercice }),
  recap: (items) => ({ type: 'recap', items }),
};

const lecon = (code, titre, duree, blocs) => ({ code, titre, duree, blocs });

module.exports = { mc, qcm, vf, glisser, entourer, ordre, relier, classer, numerique, surligner, b, lecon };
