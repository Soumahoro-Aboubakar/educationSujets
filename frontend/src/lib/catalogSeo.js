import { formatDate, labelOf, organismeLabel } from './format.js';
import { SITE_NAME, absoluteUrl, breadcrumbJsonLd } from './seo.js';

/*
 * Adresses et textes des pages du catalogue, partagés par le site (ExplorePage, DocumentPage)
 * et le pré-rendu (scripts/prerender.mjs) : un robot lit exactement ce qu'affiche le site.
 *
 * Adresse d'une position : /sujets/<organisme>[/<parcours>]/<niveau 1>/…/<niveau n>[/<matière>]
 *   /sujets/ensea/2024/mathematiques · /sujets/inphb/idsi/2025
 * Les textes ne décrivent que ce qui est publié : compteurs issus du catalogue, aucune promesse.
 */
export const CATALOG_ROOT = '/sujets';

export const catalogPath = (segments = []) => [CATALOG_ROOT, ...segments.filter(Boolean).map((segment) => encodeURIComponent(segment))].join('/');

export const documentPath = (documentId) => `${CATALOG_ROOT}/document/${documentId}`;

const plural = (count, singular, pluralForm = `${singular}s`) => `${count} ${count > 1 ? pluralForm : singular}`;
const lower = (text = '') => text.toLocaleLowerCase('fr-FR');
/** « de Mathématiques », « d’Anglais » : élision devant une voyelle ou un h muet. */
const de = (word = '') => (/^[aeiouyhâàéèêëîïôöûüœ]/i.test(word) ? `d’${word}` : `de ${word}`);
const joinList = (items) => (items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} et ${items[items.length - 1]}`);

/** « INP-HB IDSI 2025 » : l'organisme, le parcours et les niveaux d'une position. */
export const scopeLabel = ({ organisme, parcoursType, nodes = [] }) => [
  organismeLabel(organisme), labelOf(parcoursType), ...nodes.map(labelOf),
].filter(Boolean).join(' ');

/**
 * Titre, intertitre de liste et description d'une position du catalogue.
 * @param {object} context
 *   organismes  liste des organismes (racine du catalogue)
 *   organisme, parcoursType, nodes, matiere  position courante
 *   levels      niveaux de la structure de l'organisme (libellés)
 *   step        'organisme' | 'parcours' | 'noeud' | 'matiere' | 'documents'
 *   count       nombre de sujets publiés à cette position, si connu
 */
export const catalogText = ({ organismes = [], organisme, parcoursType, nodes = [], matiere, levels = [], step, count }) => {
  if (step === 'organisme' || !organisme) {
    const names = organismes.map(organismeLabel);
    return {
      title: 'Anciens sujets de concours en Côte d’Ivoire par organisme',
      h1: 'Anciens sujets de concours par organisme',
      listHeading: 'Organismes',
      description: names.length
        ? `Anciens sujets de concours et d’examens classés par organisme : ${joinList(names)}. Choisissez un organisme, puis l’année et la matière.`
        : 'Anciens sujets de concours et d’examens classés par organisme, année et matière.',
    };
  }

  const scope = scopeLabel({ organisme, parcoursType, nodes });
  const levelNames = levels.slice(nodes.length).map((level) => lower(level.libelleSingulier)).filter(Boolean);
  const nextLevel = levels[nodes.length];
  const counted = Number.isFinite(count) && count > 0;
  const published = counted && count === 1 ? 'publié' : 'publiés';

  if (step === 'documents') {
    const subject = labelOf(matiere);
    return {
      title: `${subject} : sujets ${scope}`,
      h1: `${subject} : sujets ${scope}`,
      listHeading: 'Sujets',
      description: `${counted ? plural(count, 'sujet') : 'Sujets'} ${de(subject)} ${scope} ${published} sur ${SITE_NAME}. Chaque fiche indique l’année, la matière et si un corrigé est disponible.`,
    };
  }

  const classement = joinList([...levelNames, 'matière']);
  if (step === 'parcours' || (!nodes.length && !parcoursType)) {
    return {
      title: `Anciens sujets ${scope}${counted ? ` : ${plural(count, 'sujet')}` : ''} par ${classement}`,
      h1: `Anciens sujets ${scope}`,
      listHeading: step === 'parcours' ? 'Types de parcours' : nextLevel?.libellePluriel || 'Niveaux',
      description: `${counted ? `${plural(count, 'ancien sujet', 'anciens sujets')} ${scope} ${published}` : `Anciens sujets ${scope} publiés`} sur ${SITE_NAME}, ${counted && count === 1 ? 'classé' : 'classés'} par ${step === 'parcours' ? `type de parcours, ${classement}` : classement}.`,
    };
  }

  return {
    title: `Sujets ${scope}${counted ? ` : ${plural(count, 'sujet')}` : ''} par ${step === 'matiere' ? 'matière' : classement}`,
    h1: `${nodes.length ? 'Sujets' : 'Anciens sujets'} ${scope}`,
    listHeading: step === 'matiere' ? 'Matières' : nextLevel?.libellePluriel || 'Niveaux',
    description: `${counted ? `${plural(count, 'sujet')} ${scope} ${published}` : `Sujets ${scope} publiés`} sur ${SITE_NAME}, ${counted && count === 1 ? 'classé' : 'classés'} par ${step === 'matiere' ? 'matière' : classement}.`,
  };
};

/** Fil d'Ariane d'une position : [{ label, path }], de « Sujets » à la page elle-même. */
export const catalogCrumbs = (trail) => [{ label: 'Sujets', path: CATALOG_ROOT }, ...trail];

/** Métadonnées d'une page du catalogue (useSeo / pré-rendu). */
export const catalogSeo = ({ text, path, crumbs }) => ({
  title: text.title,
  description: text.description,
  path,
  jsonLd: crumbs.length > 1 ? breadcrumbJsonLd(crumbs) : null,
});

const isCorrectionDocument = (document) => document?.documentType === 'corrige' || document?.type === 'correction';

/**
 * Métadonnées d'une fiche de sujet. `context` : { organisme, parcoursType, nodes, matiere, crumbs }
 * (crumbs : fil d'Ariane jusqu'à la matière). La fiche n'expose que des informations visibles.
 */
export const documentSeo = (document, { organisme, parcoursType, nodes = [], matiere, crumbs = [] }) => {
  const title = document.title || document.titre || (isCorrectionDocument(document) ? 'Corrigé' : 'Sujet');
  const scope = scopeLabel({ organisme, parcoursType, nodes });
  const subject = labelOf(matiere);
  const path = documentPath(document._id);
  const correction = isCorrectionDocument(document) ? null
    : document.hasCorrection ? 'Corrigé disponible.' : 'Corrigé non publié.';
  const description = document.description
    || `${[`Sujet ${scope}`.trim(), subject].filter(Boolean).join(' – ')}, ajouté le ${formatDate(document.dateAjout || document.createdAt)}.`;
  const pageCrumbs = [...crumbs, { label: title, path }];
  return {
    title: [title, !title.includes(organismeLabel(organisme)) && scope].filter(Boolean).join(' – '),
    description: [description, correction].filter(Boolean).join(' '),
    path,
    type: 'article',
    jsonLd: [
      pageCrumbs.length > 1 ? breadcrumbJsonLd(pageCrumbs) : null,
      {
        '@context': 'https://schema.org',
        '@type': 'LearningResource',
        name: title,
        description: description || undefined,
        url: absoluteUrl(path),
        inLanguage: 'fr',
        learningResourceType: isCorrectionDocument(document) ? 'Corrigé' : 'Sujet d’examen',
        educationalLevel: scope || undefined,
        about: subject ? { '@type': 'Thing', name: subject } : undefined,
        encodingFormat: /pdf$/i.test(document.extension || '.pdf') ? 'application/pdf' : undefined,
        dateCreated: document.dateAjout || document.createdAt || undefined,
        provider: { '@type': 'Organization', name: SITE_NAME, url: absoluteUrl('/') },
      },
    ],
  };
};
