#!/usr/bin/env node
/*
 * Synchronise le référentiel docs/referentiel-sujets/ avec le serveur Fatafalta.
 *
 * LECTURE SEULE côté serveur : uniquement des requêtes GET publiques, paginées et espacées.
 * Aucun téléchargement de fichier (le téléchargement incrémente les compteurs de production).
 *
 *   npm run referentiel:sync                    # interroge le serveur et met à jour le référentiel
 *   npm run referentiel:sync -- --dry-run       # affiche les changements sans rien écrire
 *   npm run referentiel:sync -- --brut <dossier> # conserve aussi les réponses brutes de l'API
 *   npm run referentiel:sync -- --depuis-brut <dossier>  # reconstruit hors ligne depuis ces réponses
 *
 * Options : --api <url> (défaut https://educationsujets.onrender.com), --dir <dossier du référentiel>.
 * L'inventaire précédent n'est jamais écrasé silencieusement : les ressources disparues du serveur
 * restent listées (presentSurServeur: false) et chaque changement est journalisé.
 */
const fs = require('fs');
const path = require('path');
const lib = require('./lib');

const args = process.argv.slice(2);
const option = (name, fallback = null) => {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};
const flag = (name) => args.includes(name);

const API = (option('--api', process.env.FATAFALTA_API_URL || 'https://educationsujets.onrender.com')).replace(/\/+$/, '');
const DIR = path.resolve(option('--dir', lib.DEFAULT_DIR));
const RAW_OUT = option('--brut');
const RAW_IN = option('--depuis-brut');
const DRY_RUN = flag('--dry-run');
const DELAY_MS = Number(option('--delai-ms', 400));
const SCHEMA_VERSION = 1;

// ── Accès API (GET uniquement) ──────────────────────────────────────────────

const raw = {};
let requestCount = 0;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const get = async (pathname) => {
  if (RAW_IN) {
    const cached = lib.readJson(path.join(RAW_IN, 'reponses.json'), {})[pathname];
    if (!cached) throw new Error(`Réponse brute absente pour ${pathname}`);
    return cached;
  }
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    await sleep(attempt === 1 ? DELAY_MS : 5000 * attempt);
    requestCount += 1;
    try {
      const response = await fetch(`${API}/api${pathname}`, {
        method: 'GET',
        headers: { Accept: 'application/json', 'User-Agent': 'fatafalta-referentiel-sujets/1.0' },
        signal: AbortSignal.timeout(90000), // Render peut mettre ~1 min à sortir de veille.
      });
      const body = await response.json().catch(() => ({}));
      if (response.status === 429 || response.status >= 500) continue;
      if (!response.ok || body.success === false) throw new Error(`${pathname} → HTTP ${response.status} ${body.error || ''}`);
      raw[pathname] = body;
      return body;
    } catch (error) {
      if (attempt === 4 || /HTTP 4/.test(error.message)) throw error;
    }
  }
  throw new Error(`${pathname} : serveur indisponible après 4 tentatives`);
};

const getAllPages = async (pathname) => {
  const items = [];
  let page = 1;
  let pagination = null;
  do {
    const separator = pathname.includes('?') ? '&' : '?';
    const body = await get(`${pathname}${separator}limit=100&page=${page}`);
    items.push(...body.data);
    pagination = body.meta?.pagination || body.pagination || { pages: 1, total: body.data.length };
    page += 1;
  } while (page <= (pagination.pages || 1));
  return { items, total: pagination.total ?? items.length };
};

const fetchServer = async () => {
  const limites = [];
  const sujets = await getAllPages('/documents');
  const corriges = await getAllPages('/documents?documentType=corrige');
  const seo = (await get('/seo/catalog')).data;
  const organismes = (await getAllPages('/organismes')).items;

  const parOrganisme = {};
  for (const organisme of organismes) {
    const id = organisme._id;
    const structure = (await get(`/structures/${id}`)).data?.structure || null;
    const parcoursTypes = (await get(`/organismes/${id}/parcours-types`)).data || [];
    const matieres = (await getAllPages(`/matieres?organismeId=${id}`)).items;
    const noeuds = [];
    let frontier = [null];
    for (let depth = 0; frontier.length && depth < 10; depth += 1) {
      const next = [];
      for (const parentId of frontier) {
        const { items } = await getAllPages(`/noeuds?organismeId=${id}${parentId ? `&parentId=${parentId}` : ''}`);
        noeuds.push(...items);
        next.push(...items.map((node) => node._id));
      }
      frontier = next;
    }
    parOrganisme[id] = { structure, parcoursTypes, matieres, noeuds };
  }

  const legacy = {};
  for (const [key, route] of Object.entries({
    categories: '/categories', typesConcours: '/contest-types', universites: '/universities',
    institutions: '/institutions', niveaux: '/levels', semestres: '/semesters', departements: '/departments',
  })) {
    try {
      legacy[key] = (await get(route)).data || [];
    } catch (error) {
      legacy[key] = [];
      limites.push(`Référentiel legacy ${route} inaccessible : ${error.message}`);
    }
  }

  if (sujets.items.length !== sujets.total) limites.push(`Sujets : ${sujets.items.length} récupérés pour ${sujets.total} annoncés`);
  if (corriges.items.length !== corriges.total) limites.push(`Corrigés : ${corriges.items.length} récupérés pour ${corriges.total} annoncés`);
  return { sujets, corriges, seo, organismes, parOrganisme, legacy, limites };
};

// ── Construction des entrées ────────────────────────────────────────────────

const idOf = (value) => (value && typeof value === 'object' ? value._id : value) || null;
const nameOf = (value) => (value && typeof value === 'object' ? value.name || value.nom : null) || null;

const acronymFromLabel = (label) => {
  const head = String(label || '').split(/\s[-–]\s/)[0].trim();
  return head && head.length <= 12 ? head : null;
};

const buildContext = (server) => {
  const organismesById = new Map(server.organismes.map((organisme) => [organisme._id, organisme]));
  const nodesById = new Map();
  const levelTypes = new Map();
  Object.entries(server.parOrganisme).forEach(([organismeId, data]) => {
    data.noeuds.forEach((node) => nodesById.set(node._id, node));
    (data.structure?.niveaux || []).forEach((niveau) => levelTypes.set(`${organismeId}:${niveau.ordre}`, niveau));
  });
  return { organismesById, nodesById, levelTypes };
};

const dynamicOrganisme = (organisme) => ({
  id: organisme._id,
  nom: organisme.nom,
  alias: [...new Set([organisme.slug, organisme.nomNormalise].filter(Boolean))],
  source: 'catalogue_dynamique',
});

const legacyOrganisme = (document) => {
  const source = document.university ? 'legacy_universite' : document.institution ? 'legacy_institution' : null;
  const value = document.university || document.institution;
  if (!source || !value?._id) return null;
  const sigle = value.abbreviation || acronymFromLabel(value.name);
  return { id: value._id, nom: value.name, alias: sigle ? [sigle] : [], source };
};

const nodePath = (document, ctx) => {
  const chain = [];
  let node = document.noeudId && typeof document.noeudId === 'object' ? document.noeudId : ctx.nodesById.get(idOf(document.noeudId));
  for (let guard = 0; node && guard < 10; guard += 1) {
    const level = ctx.levelTypes.get(`${node.organismeId}:${node.ordreNiveau}`);
    chain.unshift({ id: node._id, nom: node.nom, niveau: node.ordreNiveau, typeNiveau: level?.type || null, libelleNiveau: level?.libelleSingulier || null });
    const parentId = idOf(node.parentId);
    node = parentId ? (typeof node.parentId === 'object' && node.parentId.nom ? node.parentId : ctx.nodesById.get(parentId)) : null;
  }
  return chain;
};

const testTitle = (title) => {
  const text = String(title || '').trim();
  return lib.TEST_TITLE.test(text) || lib.TEST_TITLE.test(lib.normalize(text));
};

const buildEntry = (document, ctx, corrigesBySujet) => {
  const isCorrige = document.documentType === 'corrige' || document.type === 'correction';
  const dynamic = Boolean(document.noeudId || document.matiereId || document.type);
  const chemin = nodePath(document, ctx);
  const organismeId = idOf(document.noeudId?.organismeId) || idOf(document.matiereId?.organismeId);
  const organismeRaw = organismeId ? ctx.organismesById.get(String(organismeId)) : null;
  const organisme = organismeRaw ? dynamicOrganisme(organismeRaw) : legacyOrganisme(document);
  const titre = document.title || document.titre || null;
  const texteAnnee = [titre, document.description, document.originalFileName];

  const anneeNode = chemin.find((node) => node.typeNiveau === 'annee');
  let annee = null;
  if (anneeNode) annee = { valeur: lib.normalizeYear(anneeNode.nom), source: 'catalogue' };
  else {
    const sources = ['titre', 'description', 'nomFichier'];
    const found = texteAnnee.map(lib.extractYear).findIndex(Boolean);
    if (found >= 0) annee = { valeur: lib.extractYear(texteAnnee[found]), source: `deduite_${sources[found]}` };
  }
  const sessionNode = chemin.find((node) => node.typeNiveau === 'session');
  const sessionText = lib.extractSession(`${titre || ''} ${document.description || ''}`);
  const session = sessionNode ? { valeur: sessionNode.nom, source: 'catalogue' } : sessionText ? { valeur: sessionText, source: 'deduite_titre' } : null;
  const nature = isCorrige ? { valeur: 'corrige', source: 'serveur' } : (() => {
    // Titre et catégorie seulement : les descriptions parlent d'« exercices » pour tout type d'épreuve.
    const value = lib.deduceNature(`${titre || ''} ${nameOf(document.category) || ''}`);
    return value ? { valeur: value, source: 'deduite_titre' } : null;
  })();

  const entry = {
    id: document._id,
    modele: dynamic ? 'catalogue_dynamique' : 'legacy',
    type: isCorrige ? 'corrige' : 'sujet',
    nature,
    statut: document.status,
    titre,
    description: document.description ?? null,
    organisme,
    parcoursType: document.parcoursTypeId ? { id: idOf(document.parcoursTypeId), nom: nameOf(document.parcoursTypeId) } : null,
    cheminCatalogue: chemin,
    annee,
    session,
    matiere: document.matiereId ? { id: idOf(document.matiereId), nom: nameOf(document.matiereId) } : null,
    legacy: dynamic ? null : {
      categorie: nameOf(document.category),
      typeConcours: nameOf(document.contestType),
      universite: nameOf(document.university),
      departement: nameOf(document.department),
      niveau: nameOf(document.level),
      semestre: nameOf(document.semester),
      institution: nameOf(document.institution),
      noeudsTaxonomie: (document.taxonomyNodes || []).map((node) => nameOf(node)).filter(Boolean),
    },
    fichier: {
      nomStocke: document.file || null,
      cleStockage: document.storageKey || null,
      nomOrigine: document.originalFileName || null,
      extension: document.extension || null,
      mimeType: document.mimeType || null,
      tailleOctets: document.fileSize ?? null,
      fournisseur: document.storageProvider || null,
    },
    corrige: isCorrige ? null : {
      inclusDansPdf: Boolean(document.correctionIncludedInPdf),
      corrigesSeparesIds: corrigesBySujet.get(document._id) || [],
    },
    sujetParentId: isCorrige ? idOf(document.sujetParentId) || idOf(document.correctionFor) : null,
    dates: {
      ajout: document.dateAjout || null,
      creation: document.createdAt || null,
      miseAJour: document.updatedAt || null,
      validation: document.validatedAt || null,
    },
  };
  entry.anomalies = [];
  if (!isCorrige && testTitle(titre)) entry.anomalies.push('titre_de_test_ou_provisoire');
  if (titre && /\d{5,}/.test(titre)) entry.anomalies.push('titre_malforme');
  else if (!isCorrige && titre && !testTitle(titre) && lib.tokens(titre).length < 2) entry.anomalies.push('titre_non_descriptif');
  if (titre && /\.pdf\b/i.test(titre)) entry.anomalies.push('titre_egal_nom_de_fichier');
  if (annee?.source === 'catalogue' && titre) {
    const yearInTitle = lib.extractYear(titre);
    if (yearInTitle && lib.compareYears(yearInTitle, annee.valeur) === 'different') entry.anomalies.push(`annee_titre_${yearInTitle}_differente_du_catalogue_${annee.valeur}`);
  }
  if (!isCorrige) {
    const text = lib.normalize(`${titre || ''} ${document.description || ''}`);
    const announcesNoCorrection = /\bsans corrig/.test(text);
    const announcesCorrection = /\b(avec|et) (proposition de )?(correction|corrige)/.test(text);
    if (entry.corrige.inclusDansPdf && announcesNoCorrection) entry.anomalies.push('corrige_inclus_mais_description_sans_corrige');
    if (!entry.corrige.inclusDansPdf && !entry.corrige.corrigesSeparesIds.length && announcesCorrection) entry.anomalies.push('correction_annoncee_mais_non_signalee');
  }
  return entry;
};

const finalizeEntry = (entry, entriesById) => {
  if (entry.type === 'corrige') {
    const parent = entriesById.get(entry.sujetParentId);
    if (!parent) entry.anomalies.push('sujet_parent_absent_de_l_inventaire');
    else {
      // Un corrigé n'a pas de métadonnées propres : il hérite de celles de son sujet.
      entry.titreHerite = `Corrigé — ${parent.titre}`;
      if (!entry.organisme) entry.organisme = parent.organisme;
      if (!entry.annee && parent.annee) entry.annee = { ...parent.annee, source: `herite_sujet_${parent.annee.source}` };
      if (!entry.matiere && parent.matiere) entry.matiere = parent.matiere;
      if (!entry.parcoursType && parent.parcoursType) entry.parcoursType = parent.parcoursType;
      entry.contexteHerite = true;
    }
  }
  const absents = [];
  if (!entry.titre && !entry.titreHerite) absents.push('titre');
  if (!entry.description && entry.type === 'sujet') absents.push('description');
  if (!entry.organisme) absents.push('organisme');
  if (!entry.annee) absents.push('annee');
  else if (entry.annee.source !== 'catalogue') absents.push('annee (déduite du texte, non stockée sur le serveur)');
  if (!entry.matiere) absents.push('matiere');
  if (!entry.parcoursType && entry.modele === 'catalogue_dynamique') absents.push('parcoursType');
  if (!entry.session) absents.push('session');
  if (!entry.dates.ajout) absents.push('dateAjout');
  entry.champsAbsents = absents;
  const essentials = ['titre', 'organisme', 'annee', 'matiere', 'annee (déduite du texte, non stockée sur le serveur)'];
  entry.completude = absents.some((field) => essentials.includes(field)) ? 'partielle' : 'complete';
  return entry;
};

/** Ajoute les alias maintenus à la main (alias-organismes.json) : « UAO », « INP-HB », noms longs… */
const applyAliases = (entries, aliases) => {
  const groups = Object.entries(aliases).map(([nom, list]) => [nom, ...list]);
  entries.forEach((entry) => {
    if (!entry.organisme) return;
    const keys = [entry.organisme.nom, ...entry.organisme.alias].map(lib.compact);
    const extra = groups.filter((group) => group.some((name) => keys.includes(lib.compact(name)))).flat();
    entry.organisme.alias = [...new Set([...entry.organisme.alias, ...extra])].filter((name) => name !== entry.organisme.nom);
  });
};

// ── Fusion avec l'inventaire existant (aucun écrasement silencieux) ─────────

const TRACKED = ['titre', 'description', 'statut', 'type', 'organisme.nom', 'annee.valeur', 'matiere.nom', 'parcoursType.nom', 'fichier.cleStockage', 'fichier.tailleOctets', 'corrige.inclusDansPdf', 'corrige.corrigesSeparesIds', 'sujetParentId'];
const pick = (object, dotted) => dotted.split('.').reduce((value, key) => (value == null ? value : value[key]), object);

const mergeWithPrevious = (entries, previous, now) => {
  const events = [];
  const previousById = new Map((previous?.ressources || []).map((entry) => [entry.id, entry]));
  const merged = entries.map((entry) => {
    const old = previousById.get(entry.id);
    previousById.delete(entry.id);
    entry.presentSurServeur = true;
    entry.premiereDetection = old?.premiereDetection || now;
    entry.derniereDetection = now;
    if (!old) {
      if (previous) events.push({ date: now, action: 'ajout', id: entry.id, titre: entry.titre || entry.titreHerite, organisme: entry.organisme?.nom || null, annee: entry.annee?.valeur || null, matiere: entry.matiere?.nom || null });
      return entry;
    }
    if (old.presentSurServeur === false) events.push({ date: now, action: 'reapparition', id: entry.id });
    const changes = TRACKED
      .filter((field) => JSON.stringify(pick(old, field) ?? null) !== JSON.stringify(pick(entry, field) ?? null))
      .map((field) => ({ champ: field, avant: pick(old, field) ?? null, apres: pick(entry, field) ?? null }));
    if (changes.length) events.push({ date: now, action: 'modification', id: entry.id, changements: changes });
    if (old.notes) entry.notes = old.notes; // Annotations humaines conservées.
    return entry;
  });
  previousById.forEach((old) => {
    if (old.presentSurServeur !== false) events.push({ date: now, action: 'disparition', id: old.id, titre: old.titre || old.titreHerite, remarque: 'Absent de l\'API publique (supprimé, dépublié ou en attente). Conservé dans l\'inventaire.' });
    merged.push({ ...old, presentSurServeur: false });
  });
  return { merged, events };
};

// ── Doublons et relations ───────────────────────────────────────────────────

const buildDuplicateIndex = (entries, previousIndex, empreintes, now) => {
  const decisions = previousIndex?.decisionsManuelles || [];
  const hashById = new Map((empreintes?.empreintes || []).map((item) => [item.id, item.sha256]));
  const comparables = entries.filter((entry) => entry.presentSurServeur).map((entry) => ({ entry, cmp: lib.entryToComparable(entry, hashById) }));
  const correspondances = [];
  for (let i = 0; i < comparables.length; i += 1) {
    for (let j = i + 1; j < comparables.length; j += 1) {
      const a = comparables[i];
      const b = comparables[j];
      const decision = lib.manualDecisionFor(decisions, a.entry.id, b.entry.id);
      if (decision?.statut === 'distinct') continue;
      const match = lib.compare(a.cmp, b.cmp);
      if (!match && decision?.statut !== 'doublon_confirme') continue;
      correspondances.push({
        ids: [a.entry.id, b.entry.id],
        statut: decision?.statut === 'doublon_confirme' ? 'doublon_confirme' : match.statut,
        score: match?.score ?? null,
        raisons: decision ? [...(match?.raisons || []), `décision manuelle du ${decision.date || '?'} : ${decision.note || decision.statut}`] : match.raisons,
        titres: [a.entry.titre || a.entry.titreHerite, b.entry.titre || b.entry.titreHerite],
        contexte: `${a.entry.organisme?.nom || '?'} ${a.entry.annee?.valeur || '?'} / ${b.entry.organisme?.nom || '?'} ${b.entry.annee?.valeur || '?'}`,
      });
    }
  }
  correspondances.sort((x, y) => lib.GRAVITE[y.statut] - lib.GRAVITE[x.statut] || (y.score || 0) - (x.score || 0));
  const statistiques = Object.fromEntries(lib.STATUTS.filter((statut) => statut !== 'nouvelle_ressource').map((statut) => [statut, correspondances.filter((item) => item.statut === statut).length]));
  return {
    version: SCHEMA_VERSION,
    genereLe: now,
    description: 'Paires de ressources existantes susceptibles d\'être des doublons. Aucune ressource n\'est supprimée ni fusionnée automatiquement.',
    regles: {
      doublon_confirme: 'Même identifiant, même clé de stockage, même empreinte SHA-256, ou décision manuelle enregistrée.',
      doublon_probable: 'Taille de fichier identique à l\'octet sans contradiction de contexte, ou même organisme + année + matière (+ parcours) avec titres proches (≥ 60 %).',
      a_verifier: 'Indices partiels : même contexte avec titres différents, métadonnées incomplètes, ou titres très proches avec une matière différente.',
    },
    statistiques,
    correspondances,
    decisionsManuelles: decisions,
    aideDecisionsManuelles: 'Ajouter { "ids": ["<idA>", "<idB>"], "statut": "doublon_confirme" | "distinct", "date": "AAAA-MM-JJ", "par": "<qui>", "note": "<justification>" } dans decisionsManuelles. Ces décisions sont conservées et appliquées à chaque synchronisation.',
  };
};

const buildRelations = (entries, now) => {
  const present = entries.filter((entry) => entry.presentSurServeur);
  const byId = new Map(present.map((entry) => [entry.id, entry]));
  const sujetsCorriges = present.filter((entry) => entry.type === 'corrige').map((entry) => ({
    sujetId: entry.sujetParentId,
    corrigeId: entry.id,
    mode: 'fichier_separe',
    sujetTitre: byId.get(entry.sujetParentId)?.titre || null,
    sujetPresent: byId.has(entry.sujetParentId),
  }));
  const corrigesInclusDansPdf = present.filter((entry) => entry.corrige?.inclusDansPdf).map((entry) => entry.id);

  // Arborescence organisme → parcours → année → matière → sujets.
  const tree = new Map();
  present.filter((entry) => entry.type === 'sujet').forEach((entry) => {
    const organisme = entry.organisme?.nom || '(organisme inconnu)';
    const branche = entry.modele === 'legacy' ? `(legacy) ${entry.legacy?.categorie || 'sans catégorie'}` : entry.parcoursType?.nom || '(sans type de parcours)';
    const annee = entry.annee ? `${entry.annee.valeur}${entry.annee.source === 'catalogue' ? '' : ' (déduite)'}` : '(année inconnue)';
    const matiere = entry.matiere?.nom || '(matière non renseignée)';
    const key = [entry.modele, organisme, branche, annee, matiere];
    let level = tree;
    key.forEach((part) => {
      if (!level.has(part)) level.set(part, new Map());
      level = level.get(part);
    });
    level.set(entry.id, null);
  });
  const toObject = (map, depth) => {
    const labels = ['modele', 'organisme', 'parcoursOuCategorie', 'annee', 'matiere'];
    if (depth === labels.length) {
      return [...map.keys()].map((id) => {
        const entry = byId.get(id);
        const corrige = entry.corrige?.inclusDansPdf ? 'inclus_dans_pdf' : entry.corrige?.corrigesSeparesIds.length ? entry.corrige.corrigesSeparesIds : null;
        return { id, titre: entry.titre, corrige };
      });
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b, 'fr', { numeric: true }))
      .map(([nom, children]) => ({ [labels[depth]]: nom, [depth + 1 === labels.length ? 'sujets' : 'enfants']: toObject(children, depth + 1) }));
  };

  // Même organisme + parcours + année + matière : cases à surveiller avant toute publication.
  const groups = new Map();
  present.filter((entry) => entry.type === 'sujet' && entry.organisme && entry.annee && entry.matiere).forEach((entry) => {
    const key = [entry.organisme.nom, entry.parcoursType?.nom || '', entry.annee.valeur, entry.matiere.nom].join(' | ');
    groups.set(key, [...(groups.get(key) || []), entry.id]);
  });

  return {
    version: SCHEMA_VERSION,
    genereLe: now,
    sujetsCorriges,
    corrigesInclusDansPdf,
    groupesMemeContexte: [...groups.entries()].filter(([, ids]) => ids.length > 1)
      .map(([cle, ids]) => ({ cle, ids, titres: ids.map((id) => byId.get(id).titre) })),
    arborescence: toObject(tree, 0),
  };
};

const buildTaxonomy = (server, entries, now) => {
  const present = entries.filter((entry) => entry.presentSurServeur);
  const organismes = server.organismes.map((organisme) => {
    const data = server.parOrganisme[organisme._id];
    const matieres = data.matieres.map((matiere) => ({ id: matiere._id, nom: matiere.nom }));
    const variantes = [];
    matieres.forEach((a, i) => matieres.slice(i + 1).forEach((b) => {
      const sameBase = lib.compact(a.nom).replace(/\d+$/, '') === lib.compact(b.nom).replace(/\d+$/, '');
      if (sameBase && a.nom.trim()[0] !== b.nom.trim()[0]) variantes.push(`« ${a.nom} » / « ${b.nom} » : casse différente`);
      else if (lib.compact(a.nom) === lib.compact(b.nom)) variantes.push(`« ${a.nom} » / « ${b.nom} » : même nom normalisé`);
    }));
    return {
      id: organisme._id,
      nom: organisme.nom,
      slug: organisme.slug || null,
      niveauxStructure: data.structure?.niveaux || [],
      parcoursTypes: data.parcoursTypes.map((item) => ({ id: item._id, nom: item.nom, parDefaut: Boolean(item.isDefault) })),
      matieres,
      noeuds: data.noeuds.map((node) => ({ id: node._id, nom: node.nom, parentId: node.parentId || null, ordreNiveau: node.ordreNiveau })),
      variantesMatieresASurveiller: variantes,
    };
  });
  const names = (list) => list.map((item) => ({ id: item._id, nom: item.name || item.nom, ...(item.abbreviation ? { sigle: item.abbreviation } : {}) }));
  const count = (values) => Object.fromEntries([...values.reduce((map, value) => map.set(value, (map.get(value) || 0) + 1), new Map())].sort());
  return {
    version: SCHEMA_VERSION,
    genereLe: now,
    typesDocumentServeur: ['sujet', 'corrige'],
    naturesDeduites: count(present.map((entry) => entry.nature?.valeur || '(non déterminée)')),
    catalogueDynamique: { description: 'Organisme → nœuds (niveaux de la structure) → matière. Le type de concours / filière est porté par parcoursType.', organismes },
    referentielsLegacy: Object.fromEntries(Object.entries(server.legacy).map(([key, list]) => [key, names(list)])),
  };
};

const buildOrganismes = (entries, now) => {
  const map = new Map();
  entries.filter((entry) => entry.presentSurServeur && entry.organisme).forEach((entry) => {
    const key = `${entry.organisme.source}:${entry.organisme.id}`;
    const item = map.get(key) || { id: entry.organisme.id, nom: entry.organisme.nom, alias: entry.organisme.alias, source: entry.organisme.source, sujets: 0, corriges: 0, annees: new Set(), parcoursTypes: new Set(), matieres: new Set() };
    item[entry.type === 'corrige' ? 'corriges' : 'sujets'] += 1;
    if (entry.annee) item.annees.add(entry.annee.valeur);
    if (entry.parcoursType?.nom) item.parcoursTypes.add(entry.parcoursType.nom);
    if (entry.matiere?.nom) item.matieres.add(entry.matiere.nom);
    map.set(key, item);
  });
  const sorted = (set) => [...set].sort((a, b) => a.localeCompare(b, 'fr', { numeric: true }));
  return {
    version: SCHEMA_VERSION,
    genereLe: now,
    remarque: 'Un même établissement peut apparaître deux fois : comme organisme du catalogue dynamique et comme université de l\'ancien modèle (ex. inphb / INPHB). Les alias servent au rapprochement.',
    organismes: [...map.values()].map((item) => ({ ...item, annees: sorted(item.annees), parcoursTypes: sorted(item.parcoursTypes), matieres: sorted(item.matieres) }))
      .sort((a, b) => a.nom.localeCompare(b.nom, 'fr')),
  };
};

// ── Écriture ────────────────────────────────────────────────────────────────

const CSV_COLUMNS = [
  ['id', (e) => e.id], ['present_sur_serveur', (e) => e.presentSurServeur], ['modele', (e) => e.modele], ['type', (e) => e.type],
  ['nature', (e) => e.nature?.valeur], ['organisme', (e) => e.organisme?.nom], ['parcours_type', (e) => e.parcoursType?.nom],
  ['annee', (e) => e.annee?.valeur], ['annee_source', (e) => e.annee?.source], ['session', (e) => e.session?.valeur],
  ['matiere', (e) => e.matiere?.nom], ['categorie_legacy', (e) => e.legacy?.categorie], ['niveau_legacy', (e) => e.legacy?.niveau],
  ['titre', (e) => e.titre || e.titreHerite], ['description', (e) => e.description],
  ['corrige_inclus_pdf', (e) => e.corrige?.inclusDansPdf], ['corriges_separes', (e) => e.corrige?.corrigesSeparesIds.join(' ')],
  ['sujet_parent_id', (e) => e.sujetParentId], ['nom_fichier_origine', (e) => e.fichier?.nomOrigine], ['nom_stocke', (e) => e.fichier?.nomStocke],
  ['taille_octets', (e) => e.fichier?.tailleOctets], ['date_ajout', (e) => e.dates?.ajout], ['completude', (e) => e.completude],
  ['champs_absents', (e) => e.champsAbsents?.join(' ; ')], ['anomalies', (e) => e.anomalies?.join(' ; ')],
];
const csvCell = (value) => {
  if (value === null || value === undefined) return '';
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};
const toCsv = (entries) => [CSV_COLUMNS.map(([name]) => name).join(','), ...entries.map((entry) => CSV_COLUMNS.map(([, read]) => csvCell(read(entry))).join(','))].join('\n') + '\n';

const writeJson = (file, value) => fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);

const main = async () => {
  const now = new Date().toISOString();
  console.log(RAW_IN ? `Reconstruction hors ligne depuis ${RAW_IN}` : `Lecture de ${API} (GET uniquement)…`);
  const server = await fetchServer();
  if (RAW_OUT) {
    fs.mkdirSync(RAW_OUT, { recursive: true });
    writeJson(path.join(RAW_OUT, 'reponses.json'), raw);
  }

  const ctx = buildContext(server);
  const corrigesBySujet = new Map();
  server.corriges.items.forEach((document) => {
    const parent = idOf(document.sujetParentId) || idOf(document.correctionFor);
    corrigesBySujet.set(parent, [...(corrigesBySujet.get(parent) || []), document._id]);
  });
  const built = [...server.sujets.items, ...server.corriges.items].map((document) => buildEntry(document, ctx, corrigesBySujet));
  applyAliases(built, lib.readJson(path.join(DIR, 'alias-organismes.json'), { alias: {} }).alias || {});
  const builtById = new Map(built.map((entry) => [entry.id, entry]));
  built.forEach((entry) => finalizeEntry(entry, builtById));

  const previous = lib.readJson(path.join(DIR, 'inventaire-complet.json'), null);
  const { merged, events } = mergeWithPrevious(built, previous, now);
  merged.sort((a, b) => String(b.dates?.ajout || '').localeCompare(String(a.dates?.ajout || '')) || a.id.localeCompare(b.id));

  const seoIds = new Set(server.seo.organismes.flatMap((organisme) => organisme.documents.map((document) => document._id)));
  const present = merged.filter((entry) => entry.presentSurServeur);
  const missingFromList = [...seoIds].filter((id) => !builtById.has(id));
  const limites = [...server.limites];
  if (missingFromList.length) limites.push(`${missingFromList.length} sujet(s) du catalogue SEO absents de /api/documents : ${missingFromList.join(', ')}`);

  const bilan = {
    ressources: present.length,
    sujets: present.filter((entry) => entry.type === 'sujet').length,
    corrigesSepares: present.filter((entry) => entry.type === 'corrige').length,
    sujetsAvecCorrigeInclus: present.filter((entry) => entry.corrige?.inclusDansPdf).length,
    catalogueDynamique: present.filter((entry) => entry.modele === 'catalogue_dynamique').length,
    legacy: present.filter((entry) => entry.modele === 'legacy').length,
    completes: present.filter((entry) => entry.completude === 'complete').length,
    partielles: present.filter((entry) => entry.completude === 'partielle').length,
    avecAnomalies: present.filter((entry) => entry.anomalies.length).length,
    disparusConserves: merged.length - present.length,
    sujetsCatalogueSeo: seoIds.size,
    organismesCatalogue: server.organismes.length,
    requetesHttp: requestCount,
  };

  const inventaire = {
    version: SCHEMA_VERSION,
    source: `${API}/api (GET publics : /documents, /documents?documentType=corrige, /seo/catalog, /organismes, /structures, /noeuds, /matieres, référentiels legacy)`,
    perimetre: 'Ressources publiées (status = approved, non supprimées). Les brouillons, documents en attente et la corbeille ne sont pas visibles sans authentification administrateur.',
    genereLe: now,
    bilan,
    limites,
    ressources: merged,
  };
  const empreintes = lib.readJson(path.join(DIR, 'empreintes-fichiers.json'), null);
  const doublons = buildDuplicateIndex(merged, lib.readJson(path.join(DIR, 'index-doublons.json'), null), empreintes, now);
  const relations = buildRelations(merged, now);
  const taxonomie = buildTaxonomy(server, merged, now);
  const organismes = buildOrganismes(merged, now);

  console.log('Bilan :', JSON.stringify(bilan));
  console.log('Doublons :', JSON.stringify(doublons.statistiques));
  console.log(`Changements depuis la dernière synchronisation : ${previous ? events.length : 'inventaire initial'}`);
  events.slice(0, 30).forEach((event) => console.log(`  - ${event.action} ${event.id} ${event.titre || ''}`));
  if (limites.length) console.log('Limites :', limites.join(' | '));
  if (DRY_RUN) {
    console.log('--dry-run : aucun fichier écrit.');
    return;
  }

  fs.mkdirSync(DIR, { recursive: true });
  writeJson(path.join(DIR, 'inventaire-complet.json'), inventaire);
  fs.writeFileSync(path.join(DIR, 'inventaire-complet.csv'), toCsv(merged));
  writeJson(path.join(DIR, 'organismes.json'), organismes);
  writeJson(path.join(DIR, 'taxonomie.json'), taxonomie);
  writeJson(path.join(DIR, 'index-doublons.json'), doublons);
  writeJson(path.join(DIR, 'relations-documents.json'), relations);
  if (!empreintes) writeJson(path.join(DIR, 'empreintes-fichiers.json'), { version: SCHEMA_VERSION, description: 'Empreintes SHA-256 des fichiers publiés, enregistrées localement après publication (le serveur ne les stocke pas). Ajout via npm run referentiel:empreinte.', empreintes: [] });

  const journal = previous ? events : [{ date: now, action: 'inventaire_initial', ressources: bilan.ressources }];
  journal.push({ date: now, action: 'synchronisation', bilan, doublons: doublons.statistiques, changements: previous ? events.length : null });
  fs.appendFileSync(path.join(DIR, 'journal-mises-a-jour.jsonl'), journal.map((line) => JSON.stringify(line)).join('\n') + '\n');

  const counts = (action) => events.filter((event) => event.action === action).length;
  const section = [
    '', `## Synchronisation du ${now.slice(0, 10)} (${now.slice(11, 16)} UTC) — automatique`, '',
    `- Ressources publiées : **${bilan.ressources}** (${bilan.sujets} sujets, ${bilan.corrigesSepares} corrigés séparés, ${bilan.sujetsAvecCorrigeInclus} sujets avec corrigé inclus)`,
    `- Catalogue dynamique : ${bilan.catalogueDynamique} · legacy : ${bilan.legacy} · complètes : ${bilan.completes} · partielles : ${bilan.partielles} · avec anomalies : ${bilan.avecAnomalies}`,
    `- Correspondances : ${Object.entries(doublons.statistiques).map(([key, value]) => `${key} ${value}`).join(', ')}`,
    previous ? `- Changements : ${counts('ajout')} ajout(s), ${counts('modification')} modification(s), ${counts('disparition')} disparition(s), ${counts('reapparition')} réapparition(s)` : '- Inventaire initial',
    `- Requêtes HTTP : ${bilan.requetesHttp}${limites.length ? ` · Limites : ${limites.join(' ; ')}` : ''}`,
  ].join('\n');
  const historyFile = path.join(DIR, 'historique-analyses.md');
  if (!fs.existsSync(historyFile)) fs.writeFileSync(historyFile, '# Historique des analyses du référentiel\n');
  fs.appendFileSync(historyFile, `${section}\n`);
  console.log(`Référentiel écrit dans ${DIR}`);
};

if (require.main === module) {
  main().catch((error) => {
    console.error(`Échec de la synchronisation : ${error.message}`);
    process.exit(1);
  });
}

module.exports = { buildEntry, finalizeEntry, mergeWithPrevious, buildDuplicateIndex, toCsv, CSV_COLUMNS };
