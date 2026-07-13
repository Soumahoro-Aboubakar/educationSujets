/**
 * Constantes et configurations pour le moteur d'orientation
 */

// Seuils de scores de compatibilité
export const SCORE_THRESHOLDS = {
  TOP: 80,           // Top recommandations
  SECONDARY: 60,     // Options secondaires
  TERTIARY: 40,      // Options tertiaires (effort supplémentaire)
  MINIMUM: 0         // Rejeté
};

// Poids du scoring multi-dimensions
export const SCORING_WEIGHTS = {
  ACADEMIC: 0.5,         // 50% du score global
  SOCIO_ECONOMIC: 0.3,   // 30% du score global
  PROFESSIONAL: 0.2      // 20% du score global
};

// Descripteurs des modes de recherche
export const SEARCH_MODES = {
  AUTOPILOT: 'autopilot',      // Analyse complète du catalogue
  TARGETED: 'targeted',        // Analyse d'une école précise
  GEOGRAPHIC: 'geographic'     // Filtre par région/ville
};

// Catégories de résultats
export const RESULT_CATEGORIES = {
  TOP: 'top',
  SECONDARY: 'secondary',
  TERTIARY: 'tertiary',
  REJECTED: 'rejected'
};

// Types de raisons de rejet
export const REJECTION_REASONS = {
  AGE_LIMIT: 'AGE_LIMIT',
  BAC_TYPE: 'BAC_TYPE',
  NOTE_INSUFFISANTE: 'NOTE_INSUFFISANTE',
  GEOGRAPHIC_FILTER: 'GEOGRAPHIC_FILTER',
  BUDGET_FILTER: 'BUDGET_FILTER',
  OTHER: 'OTHER'
};

// Énumération des budgets
export const BUDGET_CATEGORIES = {
  LOW: { value: 'low', label: '< 100K XOF/an', max: 100000 },
  MEDIUM: { value: 'medium', label: '100-500K XOF/an', min: 100000, max: 500000 },
  HIGH: { value: 'high', label: '> 500K XOF/an', min: 500000 },
  ALL: { value: 'all', label: 'Tous', min: 0, max: Infinity }
};

// Énumération des durées de formation
export const DURATION_CATEGORIES = {
  SHORT: { value: 'short', label: 'Court terme (≤2 ans)', max: 2 },
  MEDIUM: { value: 'medium', label: 'Moyen terme (3-4 ans)', min: 3, max: 4 },
  LONG: { value: 'long', label: 'Long terme (≥5 ans)', min: 5 }
};

// Templates de messages pour les résultats
export const MESSAGES = {
  TOP_RECOMMENDATIONS: "Formations où vous remplissez 100% des critères - excellentes opportunités!",
  SECONDARY_OPTIONS: "Formations accessibles mais demandant un léger effort de rattrapage.",
  TERTIARY_OPTIONS: "Formations nécessitant un effort académique plus important.",
  NO_ELIGIBLE: "Aucune formation n'a pu être trouvée selon vos critères.",
  TARGETED_ELIGIBLE: "Vous êtes admissible à cette formation!",
  TARGETED_REJECTED: "Malheureusement, vous n'êtes pas actuellement admissible."
};

// Configuration des étapes du wizard
export const WIZARD_STEPS = {
  PROFILE: {
    number: 1,
    label: 'Profil',
    description: 'Informations de base'
  },
  NOTES: {
    number: 2,
    label: 'Notes au BAC',
    description: 'Vos résultats'
  },
  PREFERENCES: {
    number: 3,
    label: 'Préférences',
    description: 'Optionnel'
  },
  RESULTS: {
    number: 4,
    label: 'Résultats',
    description: 'Vos recommandations'
  }
};

// Secteurs professionnels
export const PROFESSIONAL_SECTORS = [
  'Informatique',
  'Ingénierie',
  'Santé',
  'Droit',
  'Gestion',
  'Communication',
  'Agriculture',
  'Audit',
  'Administration Publique',
  'Commerce'
];

// Matières et leurs abréviations
export const SUBJECTS = {
  MATH: { key: 'math', label: 'Mathématiques', abbr: 'Math' },
  PC: { key: 'pc', label: 'Physique-Chimie', abbr: 'PC' },
  SVT: { key: 'svt', label: 'Sciences de la Vie et de la Terre', abbr: 'SVT' },
  FRANCAIS: { key: 'francais', label: 'Français', abbr: 'FR' },
  PHILO: { key: 'philo', label: 'Philosophie', abbr: 'PHILO' },
  ANGLAIS: { key: 'anglais', label: 'Anglais', abbr: 'ANG' }
};

// Validations et limites
export const VALIDATION = {
  MIN_AGE: 15,
  MAX_AGE: 50,
  MIN_NOTE: 0,
  MAX_NOTE: 20,
  MIN_BAC_TYPE_LENGTH: 1,
  MAX_BAC_TYPE_LENGTH: 2
};

// Textes d'aide et tooltips
export const HELP_TEXTS = {
  BAC_TYPE: "Sélectionnez votre série de baccalauréat (A1, A2, C, D, E, F1, F2, G1, G2, etc.)",
  AGE: "Votre âge au moment de la candidature",
  NOTES: "Entrez vos notes au baccalauréat (sur 20) dans chaque matière",
  GEOGRAPHIC: "Limitez votre recherche à une région ou ville spécifique (optionnel)",
  BUDGET: "Indiquez votre budget maximum annuel si vous avez des contraintes financières",
  BOURSE: "Cochez si vous cherchez une formation avec des bourses disponibles",
  LOGEMENT: "Cochez si vous avez besoin d'un logement étudiant",
  ALTERNANCE: "Cochez si vous préférez une formation en alternance",
  MODE: "Choisissez le mode d'accès préféré (Dossier, Concours, ou les deux)"
};

// Informations sur les établissements publics vs privés
export const ESTABLISHMENT_TYPES = {
  PUBLIC: {
    value: 'Public',
    label: 'Établissement Public',
    avgCost: 'Moins cher',
    avgCompetition: 'Plus sélectif'
  },
  PRIVATE: {
    value: 'Privé',
    label: 'Établissement Privé',
    avgCost: 'Plus cher',
    avgCompetition: 'Variable'
  }
};

// Modes d'accès aux formations
export const ACCESS_MODES = {
  DOSSIER: {
    value: 'Dossier',
    label: 'Étude de dossier',
    description: 'Évaluation basée sur votre dossier académique'
  },
  CONCOURS: {
    value: 'Concours',
    label: 'Concours d\'entrée',
    description: 'Vous devez passer des épreuves de sélection'
  },
  MIXED: {
    value: 'Dossier + Concours',
    label: 'Dossier + Concours',
    description: 'Présélection sur dossier, puis concours si accepté'
  }
};

// Grades des notes (pour aide pédagogique)
export const GRADE_LEVELS = {
  EXCELLENT: { min: 16, max: 20, label: 'Excellent', color: '#1F7A54' },
  GOOD: { min: 12, max: 15.99, label: 'Bon', color: '#2E8B57' },
  ADEQUATE: { min: 10, max: 11.99, label: 'Acceptable', color: '#B98A3B' },
  WEAK: { min: 5, max: 9.99, label: 'Faible', color: '#D97706' },
  VERY_WEAK: { min: 0, max: 4.99, label: 'Très faible', color: '#B3392C' }
};

export default {
  SCORE_THRESHOLDS,
  SCORING_WEIGHTS,
  SEARCH_MODES,
  RESULT_CATEGORIES,
  REJECTION_REASONS,
  BUDGET_CATEGORIES,
  DURATION_CATEGORIES,
  MESSAGES,
  WIZARD_STEPS,
  PROFESSIONAL_SECTORS,
  SUBJECTS,
  VALIDATION,
  HELP_TEXTS,
  ESTABLISHMENT_TYPES,
  ACCESS_MODES,
  GRADE_LEVELS
};
