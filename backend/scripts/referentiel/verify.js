#!/usr/bin/env node
/*
 * Contrôle anti-doublons d'un lot de sujets AVANT publication sur Fatafalta.
 * Ne publie rien et n'écrit rien par défaut (ni sur le serveur, ni dans le référentiel).
 *
 *   npm run verify:subjects -- <lot.json>                 # rapport lisible
 *   npm run verify:subjects -- <lot.json> --json          # rapport JSON (stdout)
 *   npm run verify:subjects -- <lot.json> --sortie r.json # rapport JSON dans un fichier
 *   npm run verify:subjects -- <lot.json> --journaliser   # trace la vérification dans journal-mises-a-jour.jsonl
 *
 * Format du lot : voir docs/referentiel-sujets/README.md (§ Format d'un lot) et exemple-lot.json.
 * Code de sortie : 0 = uniquement des nouvelles ressources ; 2 = au moins un « a_verifier » ;
 *                  1 = au moins un doublon confirmé ou probable (publication à suspendre) ; 3 = erreur.
 */
const fs = require('fs');
const path = require('path');
const lib = require('./lib');

const DECISIONS = {
  doublon_confirme: 'NE PAS PUBLIER : la ressource existe déjà (voir l\'identifiant existant).',
  doublon_probable: 'SUSPENDRE : vérifier le contenu des deux fichiers avant toute publication.',
  a_verifier: 'VÉRIFIER : correspondance incertaine, ne pas conclure automatiquement au doublon.',
  nouvelle_ressource: 'AUTORISÉ : aucune correspondance ; contrôler les métadonnées puis publier.',
};

const pickField = (item, ...names) => names.map((name) => item[name]).find((value) => value !== undefined && value !== null && value !== '');

/** Associe le texte « organisme » d'un candidat à un organisme connu du référentiel. */
const resolveOrganisme = (value, organismes) => {
  if (!value) return null;
  const key = lib.compact(value);
  // Le catalogue dynamique (organismes actuels) est prioritaire sur l'ancien modèle.
  const ordered = [...organismes].sort((a, b) => Number(b.source === 'catalogue_dynamique') - Number(a.source === 'catalogue_dynamique'));
  const found = ordered.find((organisme) => organisme.id === value
    || [organisme.nom, ...(organisme.alias || [])].some((name) => lib.compact(name) === key));
  return found || null;
};

const closest = (value, names, max = 3) => names
  .map((name) => ({ name, score: lib.similarity(value, name) }))
  .filter((item) => item.score >= 0.5)
  .sort((a, b) => b.score - a.score)
  .slice(0, max)
  .map((item) => item.name);

const prepareCandidate = (item, index, ref, baseDir) => {
  const avertissements = [];
  const type = ['corrige', 'correction'].includes(pickField(item, 'type', 'documentType')) ? 'corrige' : 'sujet';
  const candidate = {
    ref: pickField(item, 'ref', 'reference') || `lot#${index + 1}`,
    id: pickField(item, 'id', '_id') || null,
    type,
    titre: pickField(item, 'titre', 'title') || '',
    description: pickField(item, 'description') || '',
    organismeTexte: pickField(item, 'organisme', 'organismeId', 'etablissement') || null,
    parcours: pickField(item, 'parcoursType', 'parcours', 'typeConcours') || null,
    annee: lib.normalizeYear(pickField(item, 'annee', 'year')),
    session: pickField(item, 'session') || null,
    matiere: pickField(item, 'matiere', 'matiereNom') || null,
    sujetParentId: pickField(item, 'sujetParentId', 'correctionFor') || null,
    nomFichier: pickField(item, 'nomFichier', 'originalFileName') || null,
    taille: Number(pickField(item, 'tailleOctets', 'fileSize')) || null,
    sha256: pickField(item, 'sha256') || null,
  };

  const filePath = pickField(item, 'fichier', 'cheminFichier', 'file');
  if (filePath) {
    const resolved = path.resolve(baseDir, filePath);
    if (fs.existsSync(resolved)) {
      candidate.sha256 = lib.sha256File(resolved);
      candidate.taille = fs.statSync(resolved).size;
      candidate.nomFichier = candidate.nomFichier || path.basename(resolved);
    } else avertissements.push(`fichier introuvable : ${filePath} (empreinte non calculée)`);
  }

  if (!candidate.annee) {
    const deduced = lib.extractYear(`${candidate.titre} ${candidate.description}`);
    if (deduced) {
      candidate.annee = deduced;
      avertissements.push(`année déduite du titre/description : ${deduced}`);
    }
  }
  candidate.session = candidate.session || lib.extractSession(`${candidate.titre} ${candidate.description}`);

  // Corrigé : il hérite du contexte de son sujet parent.
  let parent = null;
  if (type === 'corrige') {
    if (!candidate.sujetParentId) avertissements.push('corrigé sans sujetParentId : impossible de le rattacher à un sujet');
    else {
      parent = ref.byId.get(candidate.sujetParentId) || null;
      if (!parent) avertissements.push(`sujet parent ${candidate.sujetParentId} absent du référentiel (non publié, supprimé ou référentiel à resynchroniser)`);
      else {
        candidate.titre = candidate.titre || `Corrigé — ${parent.titre}`;
        candidate.organismeTexte = candidate.organismeTexte || parent.organisme?.nom || null;
        candidate.annee = candidate.annee || parent.annee?.valeur || null;
        candidate.matiere = candidate.matiere || parent.matiere?.nom || null;
        candidate.parcours = candidate.parcours || parent.parcoursType?.nom || null;
      }
    }
  }

  const organisme = resolveOrganisme(candidate.organismeTexte, ref.organismes);
  if (candidate.organismeTexte && !organisme) {
    const suggestions = closest(candidate.organismeTexte, ref.organismes.flatMap((item) => [item.nom, ...(item.alias || [])]));
    avertissements.push(`organisme « ${candidate.organismeTexte} » inconnu du référentiel${suggestions.length ? ` (proche de : ${suggestions.join(', ')})` : ' : nouvel organisme ?'}`);
  }

  // Taxonomie du catalogue dynamique : éviter de créer une variante d'une matière ou d'un parcours existant.
  const catalogue = organisme ? ref.catalogue.find((item) => item.id === organisme.id) : null;
  if (catalogue) {
    if (candidate.matiere && !catalogue.matieres.some((matiere) => lib.compact(matiere.nom) === lib.compact(candidate.matiere))) {
      const suggestions = closest(candidate.matiere, catalogue.matieres.map((matiere) => matiere.nom));
      avertissements.push(`matière « ${candidate.matiere} » absente pour ${catalogue.nom}${suggestions.length ? ` — existantes proches : ${suggestions.join(', ')}` : ' (sera créée)'}`);
    }
    if (candidate.parcours && catalogue.parcoursTypes.length && !catalogue.parcoursTypes.some((item) => lib.compact(item.nom) === lib.compact(candidate.parcours))) {
      avertissements.push(`type de parcours « ${candidate.parcours} » absent pour ${catalogue.nom} (existants : ${catalogue.parcoursTypes.map((item) => item.nom).join(', ')})`);
    }
    if (candidate.annee && !catalogue.noeuds.some((node) => lib.normalizeYear(node.nom) === candidate.annee)) {
      avertissements.push(`année ${candidate.annee} pas encore présente pour ${catalogue.nom} (nouveau nœud)`);
    }
  }

  const missing = [['titre', candidate.titre], ['organisme', candidate.organismeTexte], ['annee', candidate.annee], ['matiere', candidate.matiere]]
    .filter(([, value]) => !value).map(([name]) => name);
  if (missing.length) avertissements.push(`métadonnées absentes : ${missing.join(', ')} — la comparaison est moins fiable`);

  const comparable = lib.toComparable({
    ...candidate,
    organismeId: organisme?.id || null,
    organismeKeys: organisme ? [organisme.nom, ...(organisme.alias || [])] : candidate.organismeTexte ? [candidate.organismeTexte] : [],
  });
  return { candidate, comparable, parent, avertissements };
};

const verifyBatch = (items, options = {}) => {
  const dir = options.dir || lib.DEFAULT_DIR;
  const referentiel = lib.loadReferentiel(dir);
  const present = referentiel.inventaire.ressources.filter((entry) => entry.presentSurServeur !== false);
  const hashById = new Map((referentiel.empreintes.empreintes || []).map((item) => [item.id, item.sha256]));
  const ref = {
    byId: new Map(present.map((entry) => [entry.id, entry])),
    organismes: referentiel.organismes.organismes || [],
    catalogue: referentiel.taxonomie.catalogueDynamique?.organismes || [],
  };
  const existing = present.map((entry) => ({ entry, cmp: lib.entryToComparable(entry, hashById) }));
  const decisions = referentiel.doublons.decisionsManuelles || [];
  const prepared = items.map((item, index) => prepareCandidate(item, index, ref, options.baseDir || process.cwd()));

  const resultats = prepared.map((current, index) => {
    const correspondances = [];
    existing.forEach(({ entry, cmp }) => {
      const match = lib.compare(current.comparable, cmp);
      if (!match) return;
      const decision = current.candidate.id ? lib.manualDecisionFor(decisions, current.candidate.id, entry.id) : null;
      if (decision?.statut === 'distinct') return;
      correspondances.push({
        statut: match.statut,
        score: match.score,
        existant: { id: entry.id, titre: entry.titre || entry.titreHerite, organisme: entry.organisme?.nom || null, annee: entry.annee?.valeur || null, matiere: entry.matiere?.nom || null, url: `/api/documents/${entry.id}` },
        raisons: match.raisons,
      });
    });

    // Doublons à l'intérieur du lot lui-même.
    prepared.forEach((other, otherIndex) => {
      if (otherIndex === index) return;
      const match = lib.compare(current.comparable, other.comparable);
      if (match) correspondances.push({ statut: match.statut, score: match.score, existant: { ref: other.candidate.ref, titre: other.candidate.titre, dansLeLot: true }, raisons: match.raisons });
    });

    const { candidate, parent } = current;
    if (candidate.type === 'corrige' && parent) {
      const existingCorrections = parent.corrige?.corrigesSeparesIds || [];
      if (parent.corrige?.inclusDansPdf || existingCorrections.length) {
        correspondances.push({
          statut: 'a_verifier',
          score: null,
          existant: { id: parent.id, titre: parent.titre, corrigesExistants: existingCorrections, corrigeInclusDansPdf: Boolean(parent.corrige?.inclusDansPdf) },
          raisons: [parent.corrige?.inclusDansPdf ? 'le sujet parent contient déjà son corrigé dans le PDF' : `le sujet parent a déjà un corrigé (${existingCorrections.join(', ')}) : publier un nouveau corrigé met l'ancien à la corbeille`],
        });
      }
    }

    correspondances.sort((a, b) => lib.GRAVITE[b.statut] - lib.GRAVITE[a.statut] || (b.score || 0) - (a.score || 0));
    const statut = correspondances[0]?.statut || 'nouvelle_ressource';
    return {
      ref: candidate.ref,
      titre: candidate.titre,
      type: candidate.type,
      contexte: { organisme: candidate.organismeTexte, parcours: candidate.parcours, annee: candidate.annee, session: candidate.session, matiere: candidate.matiere },
      fichier: candidate.sha256 ? { nom: candidate.nomFichier, tailleOctets: candidate.taille, sha256: candidate.sha256 } : null,
      statut,
      decision: DECISIONS[statut],
      correspondances: correspondances.slice(0, 5),
      avertissements: current.avertissements,
    };
  });

  const synthese = Object.fromEntries(lib.STATUTS.map((statut) => [statut, resultats.filter((item) => item.statut === statut).length]));
  return {
    verifieLe: new Date().toISOString(),
    referentielGenereLe: referentiel.inventaire.genereLe,
    ressourcesDeReference: present.length,
    synthese,
    resultats,
  };
};

const exitCodeFor = (report) => {
  if (report.synthese.doublon_confirme || report.synthese.doublon_probable) return 1;
  if (report.synthese.a_verifier) return 2;
  return 0;
};

const printReport = (report) => {
  const ageDays = (Date.now() - new Date(report.referentielGenereLe).getTime()) / 86400000;
  console.log(`Référentiel du ${report.referentielGenereLe} (${report.ressourcesDeReference} ressources publiées)`);
  if (ageDays > 1) console.log(`⚠ Référentiel vieux de ${Math.floor(ageDays)} jour(s) : lancer « npm run referentiel:sync » pour intégrer les dernières publications.`);
  report.resultats.forEach((result) => {
    console.log(`\n[${result.statut.toUpperCase()}] ${result.ref} — ${result.titre || '(sans titre)'}`);
    console.log(`  Contexte : ${Object.entries(result.contexte).filter(([, value]) => value).map(([key, value]) => `${key}=${value}`).join(', ') || 'aucun'}`);
    console.log(`  Décision : ${result.decision}`);
    result.correspondances.forEach((match) => {
      const target = match.existant.dansLeLot ? `élément du lot ${match.existant.ref}` : `${match.existant.id}`;
      console.log(`  ↳ ${match.statut} avec ${target} « ${match.existant.titre} »${match.score !== null ? ` (${Math.round(match.score * 100)} %)` : ''}`);
      console.log(`     ${match.raisons.join(' ; ')}`);
    });
    result.avertissements.forEach((warning) => console.log(`  ⚠ ${warning}`));
  });
  console.log(`\nSynthèse : ${Object.entries(report.synthese).map(([key, value]) => `${key} ${value}`).join(' · ')}`);
};

const readBatch = (file) => {
  const content = JSON.parse(fs.readFileSync(file, 'utf8'));
  const items = Array.isArray(content) ? content : content.lot || content.ressources || content.documents;
  if (!Array.isArray(items)) throw new Error('Le lot doit être un tableau JSON ou un objet { "lot": [...] }');
  return items;
};

if (require.main === module) {
  const args = process.argv.slice(2);
  const option = (name) => {
    const index = args.indexOf(name);
    return index >= 0 ? args[index + 1] : null;
  };
  const file = args.find((arg, index) => !arg.startsWith('--') && !['--dir', '--sortie'].includes(args[index - 1]));
  if (!file) {
    console.error('Usage : npm run verify:subjects -- <lot.json> [--json] [--sortie rapport.json] [--journaliser] [--dir <référentiel>]');
    process.exit(3);
  }
  try {
    // npm exécute le script depuis backend/ : les chemins relatifs du lot partent du dossier du lot.
    const batchPath = path.resolve(process.env.INIT_CWD || process.cwd(), file);
    const dir = option('--dir') ? path.resolve(process.env.INIT_CWD || process.cwd(), option('--dir')) : lib.DEFAULT_DIR;
    const report = verifyBatch(readBatch(batchPath), { dir, baseDir: path.dirname(batchPath) });
    if (args.includes('--json')) console.log(JSON.stringify(report, null, 2));
    else printReport(report);
    if (option('--sortie')) fs.writeFileSync(path.resolve(process.env.INIT_CWD || process.cwd(), option('--sortie')), `${JSON.stringify(report, null, 2)}\n`);
    if (args.includes('--journaliser')) {
      fs.appendFileSync(path.join(dir, 'journal-mises-a-jour.jsonl'), `${JSON.stringify({ date: report.verifieLe, action: 'verification_lot', lot: path.basename(batchPath), synthese: report.synthese, resultats: report.resultats.map((item) => ({ ref: item.ref, statut: item.statut, correspondances: item.correspondances.map((match) => match.existant.id || match.existant.ref) })) })}\n`);
    }
    process.exit(exitCodeFor(report));
  } catch (error) {
    console.error(`Erreur : ${error.message}`);
    process.exit(3);
  }
}

module.exports = { verifyBatch, exitCodeFor, resolveOrganisme };
