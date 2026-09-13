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
//'https://educationsujets-xaaz.onrender.com';

export const API_BASE_URL = 'http://10.84.202.234:5000';

export const DOWNLOAD_DIR = 'fatafalta_downloads';
