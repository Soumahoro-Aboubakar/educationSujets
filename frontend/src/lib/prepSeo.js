import { NOINDEX, SITE_NAME, absoluteUrl, breadcrumbJsonLd, publisherRef } from './seo.js';

/*
 * Métadonnées de l'espace de préparation, partagées entre le site (useSeo) et le pré-rendu
 * (scripts/prerender.mjs) : mêmes titres, descriptions et données structurées.
 * Indexées : l'accueil de la préparation et la page publique de chaque programme (épreuves, matières,
 * modules, sources officielles). Non indexées : leçons, exercices, révisions, classement, concours
 * blanc, test de niveau (contenu réservé aux membres ou personnel).
 * Imports avec extension : ce fichier est aussi chargé directement par Node.
 */

export const PREP_ROOT = '/preparation';
export const programmePath = (code) => `${PREP_ROOT}/${encodeURIComponent(code)}`;

const sigleOf = (programme) => programme?.organisme?.sigle || programme?.sigle || '';
const list = (items, max = 4) => {
  const names = items.filter(Boolean);
  if (names.length <= max) return names.join(', ');
  return `${names.slice(0, max).join(', ')}…`;
};

/** Accueil de la préparation : organismes et programmes publiés (GET /api/prep/catalogue). */
export const prepHomeSeo = (catalogue = []) => {
  const sigles = catalogue.map((organisme) => organisme.sigle).filter(Boolean);
  const programmes = catalogue.flatMap((organisme) => (organisme.cycles || [])
    .filter((cycle) => cycle.publie !== false)
    .map((cycle) => ({ ...cycle, sigle: organisme.sigle })));
  return {
    title: 'Préparation aux concours en Côte d’Ivoire : cours, exercices corrigés, concours blancs',
    description: `Préparez votre concours${sigles.length ? ` (${list(sigles, 6)})` : ''} : programme officiel, leçons courtes avec vidéo, exercices corrigés par niveau, concours blancs chronométrés et suivi de progression.`,
    path: PREP_ROOT,
    jsonLd: [
      breadcrumbJsonLd([{ label: 'Accueil', path: '/' }, { label: 'Préparation', path: PREP_ROOT }]),
      programmes.length ? {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: 'Programmes de préparation aux concours',
        itemListElement: programmes.map((programme, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          url: absoluteUrl(programmePath(programme.programme)),
          name: `${programme.sigle} · ${programme.nom}`,
        })),
      } : null,
    ].filter(Boolean),
  };
};

/** Modules publiés d'un programme, dans l'ordre des matières. */
export const programmeModules = (data) => {
  const programme = data?.programme;
  const modules = data?.modules || {};
  return (programme?.matieres || []).map((matiere) => ({
    nom: matiere.nom,
    modules: (matiere.modules || []).map((ref) => modules[ref.code]).filter(Boolean),
  })).filter((matiere) => matiere.modules.length);
};

/** Page publique d'un programme (GET /api/prep/programmes/:code). */
export const programmeSeo = (data) => {
  const programme = data?.programme;
  if (!programme) return null;
  const sigle = sigleOf(programme);
  const matieres = (programme.matieres || []).map((matiere) => matiere.nom);
  const epreuves = programme.epreuves || [];
  const title = `Préparer le concours ${sigle} · ${programme.titre}`;
  const description = `Préparation au concours ${sigle} ${programme.titre} : ${epreuves.length ? `${epreuves.length} épreuves (${list(epreuves.map((epreuve) => epreuve.nom), 3)}), ` : ''}${matieres.length ? `cours de ${list(matieres, 3).toLowerCase()}, ` : ''}exercices corrigés et concours blanc.`;
  const path = programmePath(programme.code);
  const teaches = programmeModules(data).flatMap((matiere) => matiere.modules.map((module) => module.titre));
  const officialSources = (programme.sources || []).filter((source) => source.url);
  return {
    title,
    description,
    path,
    jsonLd: [
      breadcrumbJsonLd([
        { label: 'Accueil', path: '/' },
        { label: 'Préparation', path: PREP_ROOT },
        { label: `${sigle} · ${programme.titre}`, path },
      ]),
      {
        '@context': 'https://schema.org',
        '@type': 'Course',
        name: `${sigle} · ${programme.titre}`,
        description: programme.description || description,
        url: absoluteUrl(path),
        inLanguage: 'fr',
        provider: { ...publisherRef(), '@type': 'EducationalOrganization', name: SITE_NAME, url: absoluteUrl('/') },
        about: matieres,
        ...(teaches.length ? { teaches } : {}),
        educationalLevel: programme.parcoursType || undefined,
        isAccessibleForFree: false,
        ...(officialSources.length ? { citation: officialSources.map((source) => ({ '@type': 'CreativeWork', name: source.titre, url: source.url })) } : {}),
      },
    ],
  };
};

/** Pages personnelles ou réservées aux membres de la préparation. */
export const prepPrivateSeo = (title) => ({ title, robots: NOINDEX });
