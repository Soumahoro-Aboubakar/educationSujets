/*
 * Référentiel anti-doublons des sujets Fatafalta — fonctions pures (aucun accès réseau ni base).
 *
 * Utilisé par `sync.js` (construction du référentiel depuis l'API publique) et `verify.js`
 * (contrôle d'un lot avant publication). Voir docs/referentiel-sujets/README.md.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DEFAULT_DIR = path.resolve(__dirname, '..', '..', '..', 'docs', 'referentiel-sujets');

const STATUTS = ['doublon_confirme', 'doublon_probable', 'a_verifier', 'nouvelle_ressource'];
const GRAVITE = { doublon_confirme: 3, doublon_probable: 2, a_verifier: 1, nouvelle_ressource: 0 };

// ── Normalisation ───────────────────────────────────────────────────────────

const stripAccents = (value) => String(value ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Texte comparable : sans accents, minuscules, ponctuation remplacée par des espaces. */
const normalize = (value) => stripAccents(value)
  .toLowerCase()
  .replace(/['’`]/g, ' ')
  // Sigles composés : « INP-HB » → « inphb », « ENS-A » → « ensa ».
  .replace(/\b([a-z]{2,4})-([a-z]{1,3})\b/g, '$1$2')
  // « Analyse 3-A » → « 3a » : la lettre est discriminante.
  .replace(/\b(\d{1,2})-([a-z])\b/g, '$1$2')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim()
  .replace(/\s+/g, ' ');

/** Clé compacte (sans espaces) pour comparer des noms d'organismes ou de matières. */
const compact = (value) => normalize(value).replace(/\s+/g, '');

// Mots sans valeur discriminante dans un titre de sujet.
const STOPWORDS = new Set([
  'de', 'du', 'des', 'la', 'le', 'les', 'l', 'd', 'et', 'en', 'au', 'aux', 'a', 'un', 'une', 'pour', 'sur',
  'avec', 'sans', 'par', 'ou', 'sujet', 'sujets', 'epreuve', 'epreuves', 'session', 'annee', 'academique',
  'universitaire', 'proposition', 'detaillee', 'detaille', 'correction', 'corrige', 'corriges', 'pdf',
]);

const SYNONYMES = {
  math: 'mathematiques', maths: 'mathematiques', mathematique: 'mathematiques',
  stat: 'statistiques', stats: 'statistiques', statistique: 'statistiques',
  proba: 'probabilites', probas: 'probabilites', probabilite: 'probabilites',
  info: 'informatique', phys: 'physique', physiques: 'physique', chim: 'chimie',
};

// « Série C », « Option B », « Groupe 2 » → « seriec », « optionb », « groupe2 » (jetons discriminants).
const QUALIFIER = /\b(serie|option|groupe|variante|sujet|type)s? ([a-z]|\d{1,2}|[ivx]{1,4})\b/g;

const tokens = (value) => [...new Set(normalize(value)
  .replace(QUALIFIER, '$1$2')
  .split(' ')
  .map((token) => (token in SYNONYMES ? SYNONYMES[token] : token))
  .filter((token) => token && !STOPWORDS.has(token) && (token.length >= 2 || /\d/.test(token))))];

const bigrams = (value) => {
  const text = tokens(value).join('');
  return text.length < 2 ? (text ? [text] : []) : Array.from({ length: text.length - 1 }, (_, i) => text.slice(i, i + 2));
};

/** Similarité 0..1 entre deux titres (mots significatifs + bigrammes de caractères). */
const similarity = (a, b) => {
  const ta = tokens(a);
  const tb = tokens(b);
  if (!ta.length || !tb.length) return 0;
  if (ta.slice().sort().join(' ') === tb.slice().sort().join(' ')) return 1;
  const shared = ta.filter((token) => tb.includes(token)).length;
  const tokenScore = (shared / Math.min(ta.length, tb.length) + shared / Math.max(ta.length, tb.length)) / 2;
  const ba = bigrams(a);
  const bb = bigrams(b);
  const pool = [...bb];
  let common = 0;
  ba.forEach((bigram) => {
    const index = pool.indexOf(bigram);
    if (index >= 0) { common += 1; pool.splice(index, 1); }
  });
  const bigramScore = ba.length && bb.length ? (2 * common) / (ba.length + bb.length) : 0;
  return Number(Math.min(1, Math.max(tokenScore, bigramScore)).toFixed(2));
};

/**
 * Jetons discriminants (chiffres : années, « 1 »/« 2 », « 3a »/« 3b » ; séries et options : « Série C »).
 * Conflit si chaque titre en porte un que l'autre n'a pas : « Mathématiques 1 » ≠ « Mathématiques 2 ».
 */
const numericConflict = (a, b) => {
  const discriminant = (token) => /\d/.test(token) || /^(serie|option|groupe|variante|sujet|type)[a-z0-9]{1,4}$/.test(token);
  const na = tokens(a).filter(discriminant);
  const nb = tokens(b).filter(discriminant);
  if (!na.length || !nb.length) return false;
  return na.some((token) => !nb.includes(token)) && nb.some((token) => !na.includes(token));
};

// ── Extraction de métadonnées depuis le texte ───────────────────────────────

/** Année ou année académique (« 2022-2023 ») trouvée dans un texte, sinon null. */
const extractYear = (value) => {
  const text = String(value ?? '');
  const academic = text.match(/\b((?:19|20)\d{2})\s*[-/–]\s*((?:19|20)\d{2})\b/);
  if (academic && Number(academic[2]) - Number(academic[1]) === 1) return `${academic[1]}-${academic[2]}`;
  const single = text.match(/\b((?:19|20)\d{2})\b/);
  return single ? single[1] : null;
};

const normalizeYear = (value) => {
  if (value === null || value === undefined || value === '') return null;
  return extractYear(value) || String(value).trim();
};

/** Deux années sont compatibles si l'une contient l'autre (« 2023 » ⊂ « 2022-2023 »). */
const compareYears = (a, b) => {
  if (!a || !b) return 'inconnu';
  if (a === b) return 'identique';
  const pa = a.split('-');
  const pb = b.split('-');
  return pa.some((year) => pb.includes(year)) ? 'compatible' : 'different';
};

const extractSession = (value) => {
  const text = normalize(value);
  if (/\b(2 ?(eme)?|deuxieme|seconde?) session\b|\bsession 2\b|\brattrapage\b/.test(text)) return 'Session 2';
  if (/\b(1 ?(ere|er)?|premiere) session\b|\bsession 1\b/.test(text)) return 'Session 1';
  return null;
};

/** Nature de l'épreuve déduite du titre (le serveur ne stocke que sujet/corrigé). */
const deduceNature = (value) => {
  const text = normalize(value);
  if (/\b(tp|travaux pratiques)\b/.test(text)) return 'tp';
  if (/\b(td|travaux diriges|feuille de td|exercices?)\b/.test(text)) return 'td_exercices';
  if (/\bdevoirs?\b/.test(text)) return 'devoir';
  if (/\bcompilation\b/.test(text)) return 'compilation';
  if (/\bbac(calaureat)?\b/.test(text)) return 'baccalaureat';
  if (/\b(concours|test de selection|selection|entree)\b/.test(text)) return 'concours';
  if (/\bexamens?\b/.test(text)) return 'examen';
  return null;
};

const GENERIC_FILE_NAMES = /^(document genere|scan|sujet|sujets|corrige|document|fichier|file|img|image|untitled|sans titre)( ?\d+)?$/;
const isGenericFileName = (name) => {
  const base = normalize(String(name ?? '').replace(/\.[a-z0-9]{2,4}$/i, ''));
  return !base || base.length < 6 || GENERIC_FILE_NAMES.test(base);
};

const TEST_TITLE = /^(test\s*\d*|[a-z]{1,5}_?test_?\d*|test_?\d+|document genere( pdf)?)$|\*{3,}|-{5,}/i;

const sha256File = (filePath) => crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');

// ── Lecture du référentiel ──────────────────────────────────────────────────

const readJson = (file, fallback) => {
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
};

const loadReferentiel = (dir = DEFAULT_DIR) => {
  const inventaire = readJson(path.join(dir, 'inventaire-complet.json'), null);
  if (!inventaire) throw new Error(`Référentiel introuvable : ${path.join(dir, 'inventaire-complet.json')}. Lancer d'abord « npm run referentiel:sync ».`);
  return {
    dir,
    inventaire,
    organismes: readJson(path.join(dir, 'organismes.json'), { organismes: [] }),
    taxonomie: readJson(path.join(dir, 'taxonomie.json'), {}),
    empreintes: readJson(path.join(dir, 'empreintes-fichiers.json'), { empreintes: [] }),
    doublons: readJson(path.join(dir, 'index-doublons.json'), { decisionsManuelles: [] }),
  };
};

// ── Comparaison ─────────────────────────────────────────────────────────────

/**
 * Forme comparable d'une ressource (entrée d'inventaire ou candidat d'un lot).
 * `organismeKeys` : toutes les écritures connues de l'organisme (nom, sigle, nom long).
 */
const toComparable = (item) => ({
  id: item.id || null,
  ref: item.ref || item.id || null,
  type: item.type === 'corrige' || item.type === 'correction' ? 'corrige' : 'sujet',
  titre: item.titre || '',
  description: item.description || '',
  organismeKeys: (item.organismeKeys || []).map(compact).filter(Boolean),
  organismeId: item.organismeId || null,
  annee: normalizeYear(item.annee),
  matiere: item.matiere ? compact(item.matiere) : null,
  parcours: item.parcours ? compact(item.parcours) : null,
  session: item.session || null,
  sujetParentId: item.sujetParentId || null,
  fichier: item.fichier || null,
  stockage: item.stockage || null,
  nomFichier: item.nomFichier || null,
  taille: Number(item.taille) || null,
  sha256: item.sha256 ? String(item.sha256).toLowerCase() : null,
});

// Les identifiants ne suffisent pas à conclure « différent » : un même établissement peut exister
// à la fois comme université (ancien modèle) et comme organisme (catalogue dynamique).
const compareOrganismes = (a, b) => {
  if (a.organismeId && b.organismeId && a.organismeId === b.organismeId) return 'identique';
  if (!a.organismeKeys.length || !b.organismeKeys.length) return 'inconnu';
  return a.organismeKeys.some((key) => b.organismeKeys.includes(key)) ? 'identique' : 'different';
};

const compareValues = (a, b) => {
  if (!a || !b) return 'inconnu';
  return a === b ? 'identique' : 'different';
};

/**
 * Compare deux ressources et renvoie { statut, score, raisons } ou null si aucune correspondance.
 * Règle d'or : seule l'identité de fichier (identifiant, clé de stockage, empreinte SHA-256) ou une
 * décision humaine enregistrée permet `doublon_confirme`. La similarité de titre ne suffit jamais.
 */
const compare = (rawA, rawB) => {
  const a = rawA.organismeKeys ? rawA : toComparable(rawA);
  const b = rawB.organismeKeys ? rawB : toComparable(rawB);
  const raisons = [];

  if (a.id && b.id && a.id === b.id) return { statut: 'doublon_confirme', score: 1, raisons: ['même identifiant serveur'] };
  if (a.sha256 && b.sha256 && a.sha256 === b.sha256) return { statut: 'doublon_confirme', score: 1, raisons: ['empreinte SHA-256 identique (même fichier)'] };
  if (a.stockage && b.stockage && a.stockage === b.stockage) return { statut: 'doublon_confirme', score: 1, raisons: ['même clé de stockage'] };
  if (a.fichier && b.fichier && a.fichier === b.fichier) return { statut: 'doublon_confirme', score: 1, raisons: ['même fichier stocké'] };

  if (a.type !== b.type) return null; // Un sujet et son corrigé ne sont jamais des doublons.

  const titleScore = similarity(a.titre, b.titre);
  const descScore = a.description.length > 40 && b.description.length > 40 ? similarity(a.description, b.description) : 0;
  const score = Math.max(titleScore, Number((descScore * 0.9).toFixed(2)));
  const conflict = numericConflict(a.titre, b.titre);
  const differentFiles = Boolean(a.sha256 && b.sha256);
  const sameSize = Boolean(a.taille && b.taille && a.taille === b.taille);
  const sameFileName = Boolean(a.nomFichier && b.nomFichier && !isGenericFileName(a.nomFichier)
    && normalize(a.nomFichier) === normalize(b.nomFichier));

  const ctx = {
    organisme: compareOrganismes(a, b),
    annee: compareYears(a.annee, b.annee),
    matiere: compareValues(a.matiere, b.matiere),
    parcours: compareValues(a.parcours, b.parcours),
    session: compareValues(a.session, b.session),
  };
  const ctxConflict = ctx.organisme === 'different' || ctx.annee === 'different';
  const fullCtx = ctx.organisme === 'identique' && ['identique', 'compatible'].includes(ctx.annee)
    && ctx.matiere === 'identique' && ctx.parcours !== 'different' && ctx.session !== 'different';

  if (sameSize) raisons.push(`taille identique à l'octet (${a.taille} o)`);
  if (sameFileName) raisons.push(`même nom de fichier d'origine (« ${a.nomFichier} »)`);
  if (differentFiles) raisons.push('empreintes SHA-256 différentes : fichiers distincts');
  if (fullCtx) raisons.push('même organisme, année et matière');
  else {
    const described = Object.entries(ctx).filter(([, value]) => value !== 'inconnu').map(([key, value]) => `${key} ${value}`);
    if (described.length) raisons.push(`contexte : ${described.join(', ')}`);
  }
  if (score > 0) raisons.push(`similarité titre/description ${Math.round(score * 100)} %`);
  if (conflict) raisons.push('numéros discriminants différents dans les titres (ex. « 1 »/« 2 », « 3A »/« 3B »)');

  const result = (statut) => ({ statut, score, raisons, contexte: ctx });

  // Corrigés : leur titre est hérité du sujet, seuls le sujet parent et le fichier comptent.
  if (a.type === 'corrige' && a.sujetParentId && b.sujetParentId) {
    if (a.sujetParentId !== b.sujetParentId) return sameSize && !differentFiles ? result('a_verifier') : null;
    raisons.unshift('corrigé du même sujet parent');
    return result(sameSize && !differentFiles ? 'doublon_probable' : 'a_verifier');
  }

  // Taille identique à l'octet sans contradiction : très probablement le même fichier.
  if (sameSize && !differentFiles && !ctxConflict) return result('doublon_probable');
  if (sameSize && !differentFiles) return result('a_verifier');
  if (ctxConflict) return null;

  if (differentFiles) return fullCtx && score >= 0.6 && !conflict ? result('a_verifier') : null;

  if (fullCtx) {
    if (score >= 0.6 && !conflict) return result('doublon_probable');
    return result('a_verifier');
  }
  if (sameFileName) return score >= 0.6 && !conflict ? result('doublon_probable') : result('a_verifier');

  // Une matière, un parcours ou une session explicitement différents distinguent deux épreuves
  // (« Géologie 1 » / « Biologie 1 », « ISE Option Maths » / « ISE Option Économie », session 1 / 2).
  if (Object.values(ctx).some((value) => value === 'different')) return null;

  if (conflict || score < 0.75) return null;
  const sameOrganismeYear = ctx.organisme === 'identique' && ['identique', 'compatible'].includes(ctx.annee);
  if (sameOrganismeYear && score >= 0.95) {
    raisons.push('titres quasi identiques, même organisme et même année (matière non renseignée)');
    return result('doublon_probable');
  }
  raisons.push('métadonnées incomplètes : impossible de trancher');
  return result('a_verifier');
};

const pairKey = (a, b) => [a, b].sort().join('|');

/** Décisions humaines enregistrées dans index-doublons.json : { ids: [a, b], statut: 'doublon_confirme' | 'distinct' }. */
const manualDecisionFor = (decisions = [], a, b) => decisions.find((decision) => decision.ids?.length === 2
  && pairKey(decision.ids[0], decision.ids[1]) === pairKey(a, b));

/** Représentation comparable d'une entrée d'inventaire, avec les écritures connues de son organisme. */
const entryToComparable = (entry, empreintesById = new Map()) => toComparable({
  id: entry.id,
  type: entry.type,
  titre: entry.titre || entry.titreHerite || '',
  description: entry.description || '',
  organismeId: entry.organisme?.id || null,
  organismeKeys: entry.organisme ? [entry.organisme.nom, ...(entry.organisme.alias || [])] : [],
  annee: entry.annee?.valeur || null,
  matiere: entry.matiere?.nom || null,
  parcours: entry.parcoursType?.nom || null,
  session: entry.session?.valeur || null,
  sujetParentId: entry.sujetParentId || null,
  fichier: entry.fichier?.nomStocke || null,
  stockage: entry.fichier?.cleStockage || null,
  nomFichier: entry.fichier?.nomOrigine || null,
  taille: entry.fichier?.tailleOctets || null,
  sha256: empreintesById.get(entry.id) || null,
});

module.exports = {
  DEFAULT_DIR,
  STATUTS,
  GRAVITE,
  normalize,
  compact,
  tokens,
  similarity,
  numericConflict,
  extractYear,
  normalizeYear,
  compareYears,
  extractSession,
  deduceNature,
  isGenericFileName,
  TEST_TITLE,
  sha256File,
  readJson,
  loadReferentiel,
  toComparable,
  entryToComparable,
  compare,
  pairKey,
  manualDecisionFor,
};
