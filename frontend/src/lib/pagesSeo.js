import { NOINDEX, SITE_NAME, absoluteUrl } from './seo.js';

/*
 * Métadonnées des pages fixes du site, partagées avec le pré-rendu (scripts/prerender.mjs).
 * Indexées : accueil, catalogue (voir catalogSeo.js), abonnement.
 * Non indexées (noindex, follow) : recherche interne, connexion, inscription, espace personnel,
 * administration, page introuvable. Elles restent explorables pour que la directive soit lue.
 */
export const PAGES_SEO = {
  home: {
    title: 'Fatafalta — Anciens sujets de concours et corrigés en Côte d’Ivoire',
    description: 'Anciens sujets de concours et d’examens en Côte d’Ivoire (ENSEA, EAMAC, INP-HB, ENA, ESATIC…), classés par organisme, année et matière, avec leurs corrigés quand ils sont publiés.',
    path: '/',
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: SITE_NAME,
        url: absoluteUrl('/'),
        inLanguage: 'fr',
      },
      {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: SITE_NAME,
        url: absoluteUrl('/'),
      },
    ],
  },
  subscribe: {
    title: 'Abonnement Fatafalta : téléchargez sujets et corrigés',
    description: 'L’abonnement Fatafalta donne accès au téléchargement des anciens sujets de concours et de leurs corrigés. Paiement par Orange Money, MTN, Moov ou Wave.',
    path: '/abonnement',
  },
  search: {
    title: 'Rechercher un sujet',
    description: 'Recherchez un ancien sujet par concours, année, matière ou titre.',
    robots: NOINDEX,
  },
  login: { title: 'Connexion', robots: NOINDEX },
  register: { title: 'Créer un compte', robots: NOINDEX },
  account: { title: 'Mon compte', robots: NOINDEX },
  dashboard: { title: 'Administration', robots: 'noindex, nofollow' },
  notFound: {
    title: 'Page introuvable',
    description: 'Ce lien ne correspond à aucune page de Fatafalta.',
    robots: NOINDEX,
  },
};
