/**
 * App constants — filter definitions, config
 * Mirrors the FILTER_DEFINITIONS from the web frontend
 */

export const FILTER_DEFINITIONS = [
  {
    key: 'institution',
    label: 'Institution',
    placeholder: 'Toutes les institutions',
    icon: 'building-2',
    endpoint: '/api/institutions',
  },
  {
    key: 'university',
    label: 'Université',
    placeholder: 'Toutes les universités',
    icon: 'building-2',
    endpoint: '/api/universities',
  },
  {
    key: 'department',
    label: 'Département',
    placeholder: 'Tous les départements',
    icon: 'layers',
    endpoint: '/api/departments',
  },
  {
    key: 'level',
    label: 'Niveau',
    placeholder: 'Tous les niveaux',
    icon: 'graduation-cap',
    endpoint: '/api/levels',
  },
  {
    key: 'semester',
    label: 'Session',
    placeholder: 'Toutes les sessions',
    icon: 'calendar',
    endpoint: '/api/semesters',
  },
  {
    key: 'category',
    label: 'Concours / catégorie',
    placeholder: 'Tous les concours et catégories',
    icon: 'folder-open',
    endpoint: '/api/categories',
  },
];
export const DOCUMENTS_PER_PAGE = 12;

// Adresse stable de l'API, sur le domaine de Fatafalta (Cloudflare → hébergeur) : changer d'hébergeur ne
// demande qu'une modification DNS, jamais une mise à jour de l'application.
// En local : EXPO_PUBLIC_API_URL=http://<IP du Mac>:5000 npx expo start
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.fatafalta.com';

export const DOWNLOAD_DIR = 'fatafalta_downloads';
