/* eslint-disable */
/**
 * Fatafalta · Préparation — logique pure partagée entre l'API et l'application mobile.
 *
 * SOURCE UNIQUE : backend/services/prep/shared/prepCore.js
 * Copie générée  : fatafalta/src/prep/shared/prepCore.js (npm run prep:pack, côté backend).
 * Ne pas modifier la copie mobile : un test vérifie que les deux fichiers sont identiques.
 *
 * Écrit en CommonJS sans dépendance pour être lu par Node et par Metro.
 * Le serveur fait foi (cahier des charges § 11.1) : le mobile utilise ces fonctions pour
 * l'affichage immédiat et le hors-ligne, le serveur recalcule à la réception.
 */

// ── Types d'exercices (§ 11) ─────────────────────────────────────────────
var TYPES = {
  qcm: 'QCM',
  vraiFaux: 'Vrai / Faux rapide',
  glisser: 'Glisser pour compléter',
  entourer: 'Entourer les bonnes réponses',
  ordre: 'Remettre dans l’ordre',
  relier: 'Relier',
  classer: 'Classer dans des catégories',
  numerique: 'Réponse numérique',
  surligner: 'Surligner dans un texte',
};

var NIVEAUX = {
  1: { code: 1, nom: 'Application', poids: 1 },
  2: { code: 2, nom: 'Entraînement', poids: 1.5 },
  3: { code: 3, nom: 'Approfondissement', poids: 2 },
};

var SEUILS_PAR_DEFAUT = { validationModule: 0.7, niveau3: 0.7 };

// ── Outils ───────────────────────────────────────────────────────────────
function asArray(value) { return Array.isArray(value) ? value : (value == null ? [] : [value]); }
function round(value, digits) { var f = Math.pow(10, digits || 4); return Math.round(value * f) / f; }
function clamp01(value) { return value < 0 ? 0 : (value > 1 ? 1 : value); }
function sameSet(a, b) {
  var sa = asArray(a).slice().sort(); var sb = asArray(b).slice().sort();
  if (sa.length !== sb.length) return false;
  for (var i = 0; i < sa.length; i += 1) if (sa[i] !== sb[i]) return false;
  return true;
}
function normalizeNumber(raw) {
  if (typeof raw === 'number') return raw;
  if (typeof raw !== 'string') return NaN;
  var cleaned = raw.replace(/\s| /g, '').replace(',', '.');
  if (!/^[-+]?\d*\.?\d+(e[-+]?\d+)?$/i.test(cleaned)) return NaN;
  return Number(cleaned);
}

/** Générateur pseudo-aléatoire déterministe (mulberry32) à partir d'une graine texte. */
function seededRandom(seed) {
  var h = 1779033703 ^ String(seed).length;
  var s = String(seed);
  for (var i = 0; i < s.length; i += 1) {
    h = Math.imul(h ^ s.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  var a = h >>> 0;
  return function next() {
    a = (a + 0x6D2B79F5) | 0;
    var t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Mélange stable pour une graine donnée (§ 11.11 : stable à la reprise, nouveau à la session suivante). */
function seededShuffle(items, seed) {
  var list = asArray(items).slice();
  var rand = seededRandom(seed);
  for (var i = list.length - 1; i > 0; i -= 1) {
    var j = Math.floor(rand() * (i + 1));
    var tmp = list[i]; list[i] = list[j]; list[j] = tmp;
  }
  return list;
}

// ── Validateurs (réponse → { correct, score, detail }) ───────────────────
// `contenu` : ce que voit l'utilisateur ; `cle` : réponse attendue (jamais envoyée avant la tentative) ;
// `reponse` : réponse de l'utilisateur.

var validators = {
  qcm: function (contenu, cle, reponse) {
    var attendus = asArray(cle.ids);
    var choisis = asArray(reponse && reponse.ids);
    var detail = {};
    (contenu.options || []).forEach(function (o) {
      var a = attendus.indexOf(o.id) >= 0; var c = choisis.indexOf(o.id) >= 0;
      detail[o.id] = a && c ? 'juste' : (!a && c ? 'faux' : (a && !c ? 'oublie' : 'neutre'));
    });
    if (!contenu.multiple) {
      var ok = choisis.length === 1 && attendus.indexOf(choisis[0]) >= 0;
      return { correct: ok, score: ok ? 1 : 0, detail: detail };
    }
    var justes = choisis.filter(function (id) { return attendus.indexOf(id) >= 0; }).length;
    var fautes = choisis.length - justes;
    var score = clamp01((justes - fautes) / Math.max(attendus.length, 1));
    return { correct: sameSet(choisis, attendus), score: round(score), detail: detail };
  },

  vraiFaux: function (contenu, cle, reponse) {
    var items = contenu.affirmations || [];
    var valeurs = (reponse && reponse.valeurs) || {};
    var detail = {}; var justes = 0;
    items.forEach(function (it) {
      var ok = typeof valeurs[it.id] === 'boolean' && valeurs[it.id] === cle.valeurs[it.id];
      detail[it.id] = ok ? 'juste' : 'faux';
      if (ok) justes += 1;
    });
    var score = items.length ? justes / items.length : 0;
    return { correct: justes === items.length, score: round(score), detail: detail };
  },

  glisser: function (contenu, cle, reponse) {
    var trous = Object.keys(cle.trous || {});
    var places = (reponse && reponse.trous) || {};
    var detail = {}; var justes = 0;
    trous.forEach(function (t) {
      var accepte = asArray(cle.trous[t]);
      var etiquette = places[t];
      var etiquetteTexte = null;
      (contenu.etiquettes || []).forEach(function (e) { if (e.id === etiquette) etiquetteTexte = e.texte; });
      // Deux étiquettes au même texte sont interchangeables (variante « plusieurs réponses acceptées »).
      var ok = accepte.indexOf(etiquette) >= 0 || (etiquetteTexte != null && (contenu.etiquettes || []).some(function (e) {
        return accepte.indexOf(e.id) >= 0 && e.texte === etiquetteTexte;
      }));
      detail[t] = ok ? 'juste' : (etiquette ? 'faux' : 'vide');
      if (ok) justes += 1;
    });
    var score = trous.length ? justes / trous.length : 0;
    return { correct: justes === trous.length, score: round(score), detail: detail };
  },

  entourer: function (contenu, cle, reponse) {
    var attendus = asArray(cle.ids);
    var choisis = asArray(reponse && reponse.ids);
    var detail = {};
    (contenu.elements || []).forEach(function (e) {
      var a = attendus.indexOf(e.id) >= 0; var c = choisis.indexOf(e.id) >= 0;
      detail[e.id] = a && c ? 'juste' : (!a && c ? 'faux' : (a && !c ? 'oublie' : 'neutre'));
    });
    var justes = choisis.filter(function (id) { return attendus.indexOf(id) >= 0; }).length;
    var fautes = choisis.length - justes;
    var score = clamp01((justes - fautes) / Math.max(attendus.length, 1));
    return { correct: sameSet(choisis, attendus), score: round(score), detail: detail };
  },

  ordre: function (contenu, cle, reponse) {
    var attendu = asArray(cle.ordre);
    var donne = asArray(reponse && reponse.ordre);
    var detail = {}; var bien = 0;
    attendu.forEach(function (id, index) {
      var ok = donne[index] === id;
      detail[id] = { position: donne.indexOf(id), attendue: index, juste: ok };
      if (ok) bien += 1;
    });
    var exact = bien === attendu.length && donne.length === attendu.length;
    var score = contenu.mode === 'exact' ? (exact ? 1 : 0) : (attendu.length ? bien / attendu.length : 0);
    return { correct: exact, score: round(score), detail: detail };
  },

  relier: function (contenu, cle, reponse) {
    var paires = cle.paires || {};
    var donnees = (reponse && reponse.paires) || {};
    var gauches = Object.keys(paires);
    var detail = {}; var justes = 0;
    gauches.forEach(function (g) {
      var ok = donnees[g] === paires[g];
      detail[g] = ok ? 'juste' : (donnees[g] ? 'faux' : 'vide');
      if (ok) justes += 1;
    });
    // Un intrus relié compte comme une faute.
    Object.keys(donnees).forEach(function (g) { if (!(g in paires) && donnees[g]) { detail[g] = 'faux'; justes -= 1; } });
    var score = clamp01(gauches.length ? justes / gauches.length : 0);
    return { correct: score === 1, score: round(score), detail: detail };
  },

  classer: function (contenu, cle, reponse) {
    var attendu = cle.cartes || {};
    var donne = (reponse && reponse.cartes) || {};
    var ids = Object.keys(attendu);
    var detail = {}; var justes = 0;
    ids.forEach(function (id) {
      var ok = donne[id] === attendu[id];
      detail[id] = ok ? 'juste' : (donne[id] ? 'faux' : 'vide');
      if (ok) justes += 1;
    });
    var score = ids.length ? justes / ids.length : 0;
    return { correct: justes === ids.length, score: round(score), detail: detail };
  },

  numerique: function (contenu, cle, reponse) {
    var valeur = normalizeNumber(reponse && reponse.valeur);
    var attendu = Number(cle.valeur);
    var tol = cle.tolerance || { type: 'abs', valeur: 0 };
    if (Number.isNaN(valeur)) return { correct: false, score: 0, detail: { attendu: attendu, ecart: null } };
    var marge = tol.type === 'pct' ? Math.abs(attendu) * (Number(tol.valeur) / 100) : Number(tol.valeur || 0);
    var ecart = Math.abs(valeur - attendu);
    var ok = ecart <= marge + 1e-9;
    return { correct: ok, score: ok ? 1 : 0, detail: { attendu: attendu, ecart: round(ecart, 6) } };
  },

  surligner: function (contenu, cle, reponse) {
    var attendus = asArray(cle.ids);
    var choisis = asArray(reponse && reponse.ids);
    var tolerés = asArray(cle.tolerance); // segments de bordure acceptés sans pénalité
    var detail = {};
    (contenu.segments || []).forEach(function (s) {
      var a = attendus.indexOf(s.id) >= 0; var c = choisis.indexOf(s.id) >= 0;
      detail[s.id] = a && c ? 'juste' : (!a && c ? (tolerés.indexOf(s.id) >= 0 ? 'neutre' : 'faux') : (a && !c ? 'oublie' : 'neutre'));
    });
    var justes = choisis.filter(function (id) { return attendus.indexOf(id) >= 0; }).length;
    var fautes = choisis.filter(function (id) { return attendus.indexOf(id) < 0 && tolerés.indexOf(id) < 0; }).length;
    var score = clamp01((justes - fautes) / Math.max(attendus.length, 1));
    return { correct: justes === attendus.length && fautes === 0, score: round(score), detail: detail };
  },
};

function validate(exercice, reponse) {
  var fn = validators[exercice && exercice.type];
  if (!fn) throw new Error('Type d’exercice inconnu : ' + (exercice && exercice.type));
  return fn(exercice.contenu || {}, exercice.cle || {}, reponse || {});
}

/** Une réponse est « complète » quand le bouton Vérifier peut s'activer (§ 10.1). */
function isComplete(exercice, reponse) {
  var c = exercice.contenu || {}; var r = reponse || {};
  switch (exercice.type) {
    case 'qcm': return asArray(r.ids).length > 0;
    case 'vraiFaux': return (c.affirmations || []).every(function (a) { return typeof (r.valeurs || {})[a.id] === 'boolean'; });
    case 'glisser': return countHoles(c).every(function (t) { return Boolean((r.trous || {})[t]); });
    case 'entourer': return asArray(r.ids).length > 0;
    case 'ordre': return asArray(r.ordre).length === (c.elements || []).length;
    case 'relier': return Object.keys(r.paires || {}).length >= Math.min((c.gauche || []).length, (c.droite || []).length);
    case 'classer': return (c.cartes || []).every(function (k) { return Boolean((r.cartes || {})[k.id]); });
    case 'numerique': return !Number.isNaN(normalizeNumber(r.valeur));
    case 'surligner': return asArray(r.ids).length > 0;
    default: return false;
  }
}

function countHoles(contenu) {
  var holes = [];
  (contenu.segments || []).forEach(function (s) { if (s && typeof s === 'object' && s.trou) holes.push(s.trou); });
  return holes;
}

// ── Contrôle de schéma (production de contenu, § 26.2 étape 3) ─────────
function checkExercise(ex) {
  var errors = [];
  var c = ex.contenu || {}; var k = ex.cle || {};
  if (!ex.code) errors.push('code manquant');
  if (!TYPES[ex.type]) errors.push('type inconnu : ' + ex.type);
  if (!NIVEAUX[ex.niveau]) errors.push('niveau invalide : ' + ex.niveau);
  if (!ex.consigne) errors.push('consigne manquante');
  if (!ex.explication) errors.push('explication manquante');
  if (!ex.miniCours || !ex.miniCours.corps) errors.push('mini-cours manquant');
  if (ex.miniCours && ex.miniCours.corps && ex.miniCours.corps.split(/\s+/).length > 150) errors.push('mini-cours > 150 mots');
  var ids = function (list) { return (list || []).map(function (x) { return x.id; }); };
  var known = function (list, values, label) {
    asArray(values).forEach(function (v) { if (ids(list).indexOf(v) < 0) errors.push(label + ' inconnu : ' + v); });
  };
  switch (ex.type) {
    case 'qcm':
      if ((c.options || []).length < 2) errors.push('QCM : au moins 2 propositions');
      if (!asArray(k.ids).length) errors.push('QCM : bonne réponse manquante');
      if (!c.multiple && asArray(k.ids).length !== 1) errors.push('QCM simple : une seule bonne réponse');
      known(c.options, k.ids, 'option');
      break;
    case 'vraiFaux':
      (c.affirmations || []).forEach(function (a) { if (typeof (k.valeurs || {})[a.id] !== 'boolean') errors.push('V/F : valeur manquante pour ' + a.id); });
      if (!(c.affirmations || []).length) errors.push('V/F : aucune affirmation');
      break;
    case 'glisser':
      var holes = countHoles(c);
      if (!holes.length) errors.push('Glisser : aucun trou');
      holes.forEach(function (t) { if (!asArray((k.trous || {})[t]).length) errors.push('Glisser : clé manquante pour ' + t); known(c.etiquettes, (k.trous || {})[t], 'étiquette'); });
      if ((c.etiquettes || []).length <= holes.length) errors.push('Glisser : prévoir au moins un distracteur');
      break;
    case 'entourer':
      known(c.elements, k.ids, 'élément');
      if (!asArray(k.ids).length) errors.push('Entourer : aucune bonne réponse');
      break;
    case 'ordre':
      if (!sameSet(ids(c.elements), k.ordre)) errors.push('Ordre : la clé doit contenir tous les éléments');
      break;
    case 'relier':
      Object.keys(k.paires || {}).forEach(function (g) { known(c.gauche, g, 'gauche'); known(c.droite, k.paires[g], 'droite'); });
      break;
    case 'classer':
      (c.cartes || []).forEach(function (card) { if (!(k.cartes || {})[card.id]) errors.push('Classer : catégorie manquante pour ' + card.id); else known(c.categories, k.cartes[card.id], 'catégorie'); });
      break;
    case 'numerique':
      if (typeof k.valeur !== 'number') errors.push('Numérique : valeur attendue manquante');
      break;
    case 'surligner':
      known(c.segments, k.ids, 'segment');
      if (!asArray(k.ids).length) errors.push('Surligner : aucun segment attendu');
      break;
    default: break;
  }
  if (ex.raisonnement && ex.raisonnement.actif) {
    if (!ex.raisonnement.reference) errors.push('raisonnement de référence manquant');
    if (!asArray(ex.raisonnement.etapesCles).length) errors.push('étapes clés manquantes');
  }
  return errors;
}

/** Retire la clé avant envoi au client (§ 29 : réponses jamais envoyées avant la tentative). */
function publicExercise(ex) {
  var copy = {};
  Object.keys(ex).forEach(function (key) { if (key !== 'cle' && key !== 'explication' && key !== 'raisonnement') copy[key] = ex[key]; });
  copy.raisonnement = ex.raisonnement && ex.raisonnement.actif ? { actif: true } : { actif: false };
  return copy;
}

// ── Versions linguistiques des cours de langue étrangère ─────────────────
/**
 * Un cours de langue étrangère (ex. ANG-GRAM, langueCible « en ») est rédigé en deux versions :
 *  - la version par défaut (« fr ») : explications en français, pour qui débute dans la langue ;
 *  - la version cible (module.versionCible) : le cours entièrement dans la langue étudiée.
 * Les exercices sont les MÊMES (codes, matériau linguistique, clés de correction) : seule
 * l'enveloppe pédagogique change. Progression, scores et correction serveur sont donc communs.
 */
var VERSION_PAR_DEFAUT = 'fr';

/** Textes d'un exercice qu'une version peut traduire (jamais la clé ni le matériau évalué). */
var TRADUISIBLES = {
  exercice: ['consigne', 'explication', 'miniCours', 'indice', 'raisonnement'],
  contenu: ['enonce', 'libelleHaut', 'libelleBas', 'affirmations', 'categories'],
};

function moduleVersions(module) {
  var v = module && module.versionCible;
  return v && v.langue ? [VERSION_PAR_DEFAUT, v.langue] : [VERSION_PAR_DEFAUT];
}

/** Applique la traduction d'une version à un exercice (copie ; l'original n'est pas modifié). */
function exerciseVersion(ex, trad) {
  if (!ex || !trad) return ex;
  var copy = Object.assign({}, ex);
  ['consigne', 'explication', 'miniCours', 'indice'].forEach(function (k) { if (trad[k] !== undefined) copy[k] = trad[k]; });
  if (trad.raisonnement && ex.raisonnement) {
    copy.raisonnement = Object.assign({}, ex.raisonnement, {
      reference: trad.raisonnement.reference || ex.raisonnement.reference,
      etapesCles: trad.raisonnement.etapes || trad.raisonnement.etapesCles || ex.raisonnement.etapesCles,
    });
  }
  var c = ex.contenu || {};
  var contenu = null;
  var touch = function () { if (!contenu) contenu = Object.assign({}, c); return contenu; };
  ['enonce', 'libelleHaut', 'libelleBas'].forEach(function (k) { if (trad[k] !== undefined) touch()[k] = trad[k]; });
  if (Array.isArray(trad.affirmations) && Array.isArray(c.affirmations)) {
    // Traduction de l'explication de chaque affirmation (le texte évalué reste celui du cours).
    touch().affirmations = c.affirmations.map(function (a, i) { return trad.affirmations[i] ? Object.assign({}, a, { explication: trad.affirmations[i] }) : a; });
  }
  if (Array.isArray(trad.categories) && Array.isArray(c.categories)) {
    touch().categories = c.categories.map(function (cat, i) { return trad.categories[i] ? Object.assign({}, cat, { nom: trad.categories[i] }) : cat; });
  }
  if (contenu) copy.contenu = contenu;
  return copy;
}

/**
 * Module dans la version demandée. Sans version cible, ou pour « fr », renvoie le module tel quel.
 * Le résultat porte `version` (code de langue) ; les leçons gardent leurs codes.
 */
function moduleVersion(module, langue) {
  var v = module && module.versionCible;
  if (!v || !langue || langue === VERSION_PAR_DEFAUT || langue !== v.langue) return module;
  var lecons = (module.lecons || []).map(function (l) {
    var t = (v.lecons || {})[l.code];
    return t ? Object.assign({}, l, { titre: t.titre || l.titre, duree: t.duree || l.duree, blocs: t.blocs || l.blocs }) : l;
  });
  var notions = (module.notions || []).map(function (n) {
    var libelle = (v.notions || {})[n.code];
    return libelle ? Object.assign({}, n, { libelle: libelle }) : n;
  });
  var exercices = (module.exercices || []).map(function (ex) { return exerciseVersion(ex, (v.exercices || {})[ex.code]); });
  return Object.assign({}, module, {
    titre: v.titre || module.titre,
    resume: v.resume || module.resume,
    notions: notions,
    lecons: lecons,
    exercices: exercices,
    duree: lecons.reduce(function (sum, l) { return sum + (l.duree || 0); }, 0),
    version: v.langue,
  });
}

// ── Barème (§ 10.2) ──────────────────────────────────────────────────────
/**
 * @param {{ score:number, essai:1|2, indices:number }} t
 * @returns {number} points obtenus sur 1
 */
function pointsTentative(t) {
  var base = clamp01(t.score || 0) * (t.essai === 2 ? 0.5 : 1);
  var malus = 1 - 0.2 * Math.max(0, t.indices || 0);
  return round(Math.max(0, base * Math.max(0, malus)));
}

// ── Révision espacée (§ 15) et cahier d'erreurs (§ 14) ───────────────────
var INTERVALLES = [1, 3, 7, 14];
var JOUR_MS = 24 * 60 * 60 * 1000;

function dayKey(date, offsetMinutes) {
  // Abidjan = UTC+0 : clé AAAA-MM-JJ dans le fuseau donné (minutes, défaut 0).
  var d = new Date((date instanceof Date ? date.getTime() : new Date(date).getTime()) + (offsetMinutes || 0) * 60000);
  return d.toISOString().slice(0, 10);
}

function addDays(key, days) {
  var d = new Date(key + 'T00:00:00.000Z');
  return new Date(d.getTime() + days * JOUR_MS).toISOString().slice(0, 10);
}

/** Nouvelle carte (notion ratée ou fragile) : due à J+1. */
function newReviewCard(input, todayKey) {
  return { exercice: input.exercice, notion: input.notion || null, origine: input.origine || 'erreur', palier: 0, echeance: addDays(todayKey, INTERVALLES[0]), maitrisee: false };
}

/** Réussite → palier suivant ; échec → retour à J+1 ; réussite à J+14 → maîtrisée. */
function reviewCard(card, success, todayKey) {
  var next = Object.assign({}, card);
  if (!success) { next.palier = 0; next.echeance = addDays(todayKey, INTERVALLES[0]); return next; }
  if (card.palier >= INTERVALLES.length - 1) { next.maitrisee = true; next.echeance = null; return next; }
  next.palier = card.palier + 1;
  next.echeance = addDays(todayKey, INTERVALLES[next.palier]);
  return next;
}

/** Sortie du cahier : 2 réussites consécutives espacées d'au moins un jour. */
function errorNotebookStep(entry, success, todayKey) {
  var next = Object.assign({ reussites: 0, dernierSucces: null, rates: 0 }, entry);
  if (!success) { next.reussites = 0; next.rates += 1; next.derniereTentative = todayKey; return next; }
  if (next.reussites === 0 || (next.dernierSucces && next.dernierSucces < todayKey)) {
    next.reussites += 1; next.dernierSucces = todayKey;
  }
  next.derniereTentative = todayKey;
  next.sortie = next.reussites >= 2;
  return next;
}

// ── Essai : 7 jours d'interaction (§ 25.3) ───────────────────────────────
var ESSAI = { jours: 7, verificationsIA: 3 };

function trialState(joursConsommes, iaUtilisees, todayKey) {
  var jours = asArray(joursConsommes).slice().sort();
  var unique = jours.filter(function (d, i) { return jours.indexOf(d) === i; });
  var aujourdHuiCompte = unique.indexOf(todayKey) >= 0;
  var restants = Math.max(0, ESSAI.jours - unique.length);
  // Le 7ᵉ jour se termine sans interruption : l'essai reste actif toute la journée en cours.
  var actif = restants > 0 || aujourdHuiCompte;
  return {
    joursUtilises: unique.length,
    joursRestants: restants,
    iaRestantes: Math.max(0, ESSAI.verificationsIA - (iaUtilisees || 0)),
    actif: actif,
    alerte: restants <= 2,
    jours: unique,
  };
}

/** Enregistre un jour d'interaction (idempotent dans la journée). */
function consumeTrialDay(joursConsommes, todayKey) {
  var jours = asArray(joursConsommes);
  if (jours.indexOf(todayKey) >= 0) return jours.slice();
  if (jours.length >= ESSAI.jours) return jours.slice();
  return jours.concat([todayKey]);
}

// ── Progression et score de classement (§ 7.3, § 20.4) ───────────────────
function moduleStatus(module, progression, seuils) {
  var s = Object.assign({}, SEUILS_PAR_DEFAUT, seuils || {});
  var lecons = module.lecons || [];
  var faites = lecons.filter(function (l) { return progression.lecons && progression.lecons[l.code] && progression.lecons[l.code].terminee; }).length;
  var scores = (progression.scores && progression.scores[module.code]) || {};
  var n2 = scores[2] || 0;
  var valide = lecons.length > 0 && faites === lecons.length && n2 >= s.validationModule;
  var parts = [lecons.length ? faites / lecons.length : 0, scores[1] || 0, n2, scores[3] || 0];
  var pourcentage = valide ? 1 : round(parts.reduce(function (a, b) { return a + b; }, 0) / parts.length, 2);
  var commence = faites > 0 || Object.keys(scores).length > 0;
  return {
    leconsFaites: faites,
    leconsTotal: lecons.length,
    niveau3Debloque: n2 >= s.niveau3,
    valide: valide,
    pourcentage: pourcentage,
    statut: valide ? 'valide' : (commence ? 'enCours' : 'nonCommence'),
  };
}

var PONDERATIONS = { maitrise: 0.5, progression: 0.25, blancs: 0.15, regularite: 0.1 };

/**
 * @param {{ premierCoupParNiveau:{1:[justes,total],2:[..],3:[..]}, modulesValides:number,
 *           modulesTotal:number, meilleurBlanc:number (0..1), joursActifs30:number }} s
 * @returns {number} score sur 100
 */
function rankingScore(s, ponderations) {
  var p = Object.assign({}, PONDERATIONS, ponderations || {});
  var num = 0; var den = 0;
  [1, 2, 3].forEach(function (n) {
    var pair = (s.premierCoupParNiveau || {})[n] || [0, 0];
    num += pair[0] * NIVEAUX[n].poids; den += pair[1] * NIVEAUX[n].poids;
  });
  // Lissage : 20 questions « virtuelles » à 50 % pour ne pas récompenser 1 question réussie sur 1.
  var maitrise = (num + 10) / (den + 20);
  var progression = s.modulesTotal ? s.modulesValides / s.modulesTotal : 0;
  var blancs = clamp01(s.meilleurBlanc || 0);
  var regularite = clamp01((s.joursActifs30 || 0) / 30);
  return round(100 * (p.maitrise * maitrise + p.progression * progression + p.blancs * blancs + p.regularite * regularite), 1);
}

// ── Pseudonymes automatiques (§ 25.1) ────────────────────────────────────
var MOTS_PSEUDO = ['Baobab', 'Fromager', 'Iroko', 'Lagune', 'Savane', 'Comoé', 'Bandama', 'Sassandra', 'Cavally', 'Nimba',
  'Kapokier', 'Teck', 'Acajou', 'Karité', 'Néré', 'Palmier', 'Colibri', 'Calao', 'Touraco', 'Héron', 'Éléphant', 'Okapi',
  'Antilope', 'Pangolin', 'Tisserin', 'Perle', 'Ébène', 'Ivoire', 'Bronze', 'Cauri', 'Kola', 'Mangue', 'Akwaba', 'Étoile'];

function pseudonymFromSeed(seed) {
  var rand = seededRandom('pseudo:' + seed);
  var mot = MOTS_PSEUDO[Math.floor(rand() * MOTS_PSEUDO.length)];
  var nombre = 1000 + Math.floor(rand() * 9000);
  return mot + '-' + nombre;
}

// ── État de progression (réducteurs purs, identiques sur mobile et serveur) ─
function emptyProgress(objectif) {
  return {
    lecons: {}, scores: {}, modulesValides: [],
    premierCoup: { 1: [0, 0], 2: [0, 0], 3: [0, 0] },
    compteurs: { questions: 0, erreurs: 0, erreursCorrigees: 0, secondesChancesReussies: 0, raisonnementsValides: 0 },
    erreurs: {}, revisions: {}, blancs: [], minutesParJour: {}, joursActifs: [],
    serie: { actuelle: 0, record: 0, dernierJourObjectif: null },
    objectifQuotidien: objectif || 10,
    test: null,
  };
}

function clone(state) { return JSON.parse(JSON.stringify(state || emptyProgress())); }

function markActiveDay(s, jour) {
  if (s.joursActifs.indexOf(jour) < 0) { s.joursActifs.push(jour); s.joursActifs.sort(); }
  if (s.joursActifs.length > 120) s.joursActifs = s.joursActifs.slice(-120);
}

/**
 * Applique une tentative vérifiée.
 * @param attempt { exercice, module, niveau, notion, essai, indices, contexte, correct, jour }
 */
function applyAttempt(state, attempt) {
  var s = clone(state);
  var ex = attempt.exercice; var jour = attempt.jour; var ctx = attempt.contexte || 'niveau';
  var final = attempt.correct || attempt.essai === 2 || ctx === 'blanc' || ctx === 'test';
  markActiveDay(s, jour);
  if (attempt.essai !== 2) s.compteurs.questions += 1;
  if (attempt.essai !== 2 && ctx !== 'test' && NIVEAUX[attempt.niveau]) {
    var pc = s.premierCoup[attempt.niveau] || [0, 0];
    s.premierCoup[attempt.niveau] = [pc[0] + (attempt.correct ? 1 : 0), pc[1] + 1];
  }
  if (attempt.correct && attempt.essai === 2) s.compteurs.secondesChancesReussies += 1;
  if (!final || ctx === 'test') return s;

  var dejaAuCahier = Boolean(s.erreurs[ex]);
  if (!attempt.correct) {
    s.compteurs.erreurs += 1;
    s.erreurs[ex] = Object.assign(errorNotebookStep(s.erreurs[ex] || { rates: 0 }, false, jour), { module: attempt.module });
    s.revisions[ex] = s.revisions[ex] ? reviewCard(s.revisions[ex], false, jour)
      : newReviewCard({ exercice: ex, notion: attempt.notion, origine: ctx === 'blanc' ? 'blanc' : 'erreur' }, jour);
    return s;
  }
  if (ctx === 'revision' || dejaAuCahier) {
    if (dejaAuCahier) {
      var step = errorNotebookStep(s.erreurs[ex], true, jour);
      if (step.sortie) { delete s.erreurs[ex]; s.compteurs.erreursCorrigees += 1; } else { s.erreurs[ex] = step; }
    }
    if (s.revisions[ex]) {
      var card = reviewCard(s.revisions[ex], true, jour);
      if (card.maitrisee) delete s.revisions[ex]; else s.revisions[ex] = card;
    }
  }
  return s;
}

/** Notion fragile (mini-question ratée, raisonnement faux ou partiel) → carte de révision (§ 15). */
function markFragile(state, exercice, notion, jour) {
  var s = clone(state);
  if (!s.revisions[exercice]) s.revisions[exercice] = newReviewCard({ exercice: exercice, notion: notion, origine: 'fragile' }, jour);
  return s;
}

function applyLesson(state, lecon, position, terminee, jour) {
  var s = clone(state);
  var prev = s.lecons[lecon] || { position: 0, terminee: false };
  s.lecons[lecon] = { position: Math.max(0, Math.min(1, position == null ? prev.position : position)), terminee: prev.terminee || Boolean(terminee), le: jour };
  markActiveDay(s, jour);
  return s;
}

/** Minutes d'étude → objectif du jour et série (§ 18). */
function applyMinutes(state, jour, minutes) {
  var s = clone(state);
  s.minutesParJour[jour] = round((s.minutesParJour[jour] || 0) + Math.max(0, minutes || 0), 2);
  var keys = Object.keys(s.minutesParJour).sort();
  if (keys.length > 60) keys.slice(0, keys.length - 60).forEach(function (k) { delete s.minutesParJour[k]; });
  if (s.minutesParJour[jour] >= s.objectifQuotidien && s.serie.dernierJourObjectif !== jour) {
    var veille = addDays(jour, -1); var avantVeille = addDays(jour, -2);
    // Un « gel de série » par semaine protège un jour manqué (§ 18) : simplifié ici à un trou d'un jour.
    var continuite = s.serie.dernierJourObjectif === veille
      || (s.serie.dernierJourObjectif === avantVeille && s.serie.gelUtiliseLe !== weekKey(jour));
    if (continuite && s.serie.dernierJourObjectif === avantVeille) s.serie.gelUtiliseLe = weekKey(jour);
    s.serie.actuelle = continuite ? s.serie.actuelle + 1 : 1;
    s.serie.record = Math.max(s.serie.record, s.serie.actuelle);
    s.serie.dernierJourObjectif = jour;
  }
  return s;
}

function weekKey(jour) {
  var d = new Date(jour + 'T00:00:00.000Z');
  var day = (d.getUTCDay() + 6) % 7; // lundi = 0
  return addDays(jour, -day);
}

/** Série affichée : elle tombe à 0 si l'objectif n'a été atteint ni aujourd'hui, ni hier (ni avant-hier avec gel). */
function currentStreak(state, today) {
  var s = state || emptyProgress();
  var last = s.serie && s.serie.dernierJourObjectif;
  if (!last) return 0;
  if (last === today || last === addDays(today, -1)) return s.serie.actuelle;
  if (last === addDays(today, -2) && s.serie.gelUtiliseLe !== weekKey(today)) return s.serie.actuelle;
  return 0;
}

/** Résultat d'une session de niveau : on retient le meilleur score (§ 7.3). */
function applySessionResult(state, moduleDef, niveau, score) {
  var s = clone(state);
  var code = moduleDef.code;
  s.scores[code] = s.scores[code] || {};
  s.scores[code][niveau] = Math.max(s.scores[code][niveau] || 0, round(clamp01(score), 4));
  return refreshModule(s, moduleDef);
}

function refreshModule(state, moduleDef, seuils) {
  var st = moduleStatus(moduleDef, state, seuils);
  var i = state.modulesValides.indexOf(moduleDef.code);
  if (st.valide && i < 0) state.modulesValides.push(moduleDef.code);
  return state;
}

function applyMockExam(state, note, sur, jour, dureeMinutes) {
  var s = clone(state);
  s.blancs.push({ note: note, sur: sur, le: jour, duree: dureeMinutes || 0 });
  markActiveDay(s, jour);
  return s;
}

/** Révisions dues aujourd'hui + cahier d'erreurs, priorité aux plus anciennes, 20 max (§ 15). */
function dueReviews(state, today, max) {
  var s = state || emptyProgress();
  var dues = Object.keys(s.revisions).filter(function (k) { var c = s.revisions[k]; return c && !c.maitrisee && c.echeance && c.echeance <= today; })
    .sort(function (a, b) { return s.revisions[a].echeance < s.revisions[b].echeance ? -1 : 1; });
  var erreurs = Object.keys(s.erreurs).filter(function (k) { return dues.indexOf(k) < 0; })
    .sort(function (a, b) { return (s.erreurs[a].derniereTentative || '') < (s.erreurs[b].derniereTentative || '') ? -1 : 1; })
    // Une erreur réussie aujourd'hui attend le lendemain pour sa seconde réussite.
    .filter(function (k) { return s.erreurs[k].dernierSucces !== today; });
  var all = dues.concat(erreurs);
  return { codes: all.slice(0, max || 20), revisionsDues: dues.length, erreurs: Object.keys(s.erreurs).length, total: all.length };
}

function minutesToday(state, today) { return ((state && state.minutesParJour) || {})[today] || 0; }

function rankingInput(state, modulesTotal, today) {
  var s = state || emptyProgress();
  var depuis = addDays(today, -29);
  var blancs = (s.blancs || []).map(function (b) { return b.sur ? b.note / b.sur : 0; });
  return {
    premierCoupParNiveau: s.premierCoup,
    modulesValides: (s.modulesValides || []).length,
    modulesTotal: modulesTotal,
    meilleurBlanc: blancs.length ? Math.max.apply(null, blancs) : 0,
    joursActifs30: (s.joursActifs || []).filter(function (d) { return d >= depuis && d <= today; }).length,
  };
}

/** Statistiques publiques d'un candidat (§ 20.2, § 20.3). */
function publicStats(state) {
  var s = state || emptyProgress();
  var justes = 0; var total = 0;
  [1, 2, 3].forEach(function (n) { var p = s.premierCoup[n] || [0, 0]; justes += p[0]; total += p[1]; });
  var blancs = (s.blancs || []).map(function (b) { return b.sur ? round(20 * b.note / b.sur, 1) : 0; });
  return {
    questions: s.compteurs.questions,
    modulesValides: (s.modulesValides || []).length,
    erreurs: s.compteurs.erreurs,
    erreursCorrigees: s.compteurs.erreursCorrigees,
    // Même périmètre : premiers essais N1–N3, tous contextes sauf test de positionnement ;
    // une répétition compte à nouveau, ce ne sont pas des exercices uniques.
    reussies: justes,
    reussite: total ? round(justes / total, 3) : 0, // fraction 0–1 sur ces premiers essais
    // Tous les succès à essai=2, tous contextes/niveaux, test compris (compteur historique).
    secondesChancesReussies: s.compteurs.secondesChancesReussies || 0,
    raisonnementsValides: s.compteurs.raisonnementsValides,
    serieRecord: s.serie.record,
    meilleurBlanc: blancs.length ? Math.max.apply(null, blancs) : null,
  };
}

module.exports = {
  emptyProgress: emptyProgress,
  applyAttempt: applyAttempt,
  markFragile: markFragile,
  applyLesson: applyLesson,
  applyMinutes: applyMinutes,
  currentStreak: currentStreak,
  applySessionResult: applySessionResult,
  refreshModule: refreshModule,
  applyMockExam: applyMockExam,
  dueReviews: dueReviews,
  minutesToday: minutesToday,
  rankingInput: rankingInput,
  publicStats: publicStats,
  TYPES: TYPES,
  NIVEAUX: NIVEAUX,
  SEUILS_PAR_DEFAUT: SEUILS_PAR_DEFAUT,
  INTERVALLES: INTERVALLES,
  ESSAI: ESSAI,
  PONDERATIONS: PONDERATIONS,
  validators: validators,
  validate: validate,
  isComplete: isComplete,
  countHoles: countHoles,
  checkExercise: checkExercise,
  publicExercise: publicExercise,
  VERSION_PAR_DEFAUT: VERSION_PAR_DEFAUT,
  TRADUISIBLES: TRADUISIBLES,
  moduleVersions: moduleVersions,
  moduleVersion: moduleVersion,
  exerciseVersion: exerciseVersion,
  pointsTentative: pointsTentative,
  seededRandom: seededRandom,
  seededShuffle: seededShuffle,
  normalizeNumber: normalizeNumber,
  dayKey: dayKey,
  addDays: addDays,
  newReviewCard: newReviewCard,
  reviewCard: reviewCard,
  errorNotebookStep: errorNotebookStep,
  trialState: trialState,
  consumeTrialDay: consumeTrialDay,
  moduleStatus: moduleStatus,
  rankingScore: rankingScore,
  pseudonymFromSeed: pseudonymFromSeed,
};
