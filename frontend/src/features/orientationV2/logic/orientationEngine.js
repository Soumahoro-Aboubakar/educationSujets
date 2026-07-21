import { CATALOG } from '../data/orientationCatalog';
import {
  applyAdvancedFilters,
  filterByAcademicEligibility,
  isAcademicallyEligible,
  calculateSocioEconomicScore,
  calculateProfessionalScore,
  checkTargetedEligibility
} from './filters';

/**
 * Calcule le score académique d'un élève pour une formation donnée
 * Basé sur les notes et les poids de chaque matière
 * @param {Object} profile - Profil de l'élève
 * @param {Object} formation - Formation
 * @returns {number} Score académique sur 100
 */
const calculateAcademicScore = (profile, formation) => {
  let totalScore = 0;
  let totalWeight = 0;

  for (const [subject, weight] of Object.entries(formation.scoreWeights)) {
    const note = profile.notes[subject];
    if (note !== undefined && note !== '' && note >= 0) {
      // Une note de 20 donne 100% de la pondération
      totalScore += (note / 20) * weight;
    }
    totalWeight += weight;
  }

  if (totalWeight === 0) return 0;

  const scorePercentage = (totalScore / totalWeight) * 100;
  return Math.min(100, Math.round(scorePercentage));
};

/**
 * Calcule le score de compatibilité global (tri-dimensionnel)
 * Dimensions:
 * - Académique: 50%
 * - Socio-économique: 30%
 * - Professionnel: 20%
 *
 * @param {Object} profile - Profil de l'élève complet
 * @param {Object} formation - Formation
 * @returns {number} Score global sur 100
 */
const calculateGlobalCompatibilityScore = (profile, formation) => {
  // Score académique (50%)
  const academicScore = calculateAcademicScore(profile, formation);

  // Score socio-économique (30%)
  const socioScore = calculateSocioEconomicScore(formation, profile.socioProfile || {});

  // Score professionnel (20%)
  const professionalScore = calculateProfessionalScore(formation, profile.preferredSectors || []);

  // Calcul pondéré
  const globalScore = (academicScore * 0.5) + (socioScore * 0.3) + (professionalScore * 0.2);

  return Math.round(globalScore);
};

/**
 * Mode "AUTOPILOT" : Analyse complète du catalogue national
 * Retourne toutes les formations triées par compatibilité
 * @param {Object} profile - Profil de l'élève
 * @param {Object} filters - Filtres optionnels (géographique, budget, etc.)
 * @returns {Object} Formations catégorisées
 */
export const runAutopilotMode = (profile, filters = {}) => {
  // Étape 1: Appliquer les filtres avancés
  let formations = applyAdvancedFilters(CATALOG, filters);

  // Étape 2: Filtrer par éligibilité académique
  const { eligible, rejected: academicRejected } = filterByAcademicEligibility(formations, profile);

  // Étape 3: Calculer les scores et catégoriser
  const topRecommendations = [];
  const secondaryOptions = [];
  const tertiaryOptions = [];

  eligible.forEach(formation => {
    const compatibilityScore = calculateGlobalCompatibilityScore(profile, formation);
    const resultObj = { ...formation, compatibilityScore };

    if (compatibilityScore >= 80) {
      topRecommendations.push(resultObj);
    } else if (compatibilityScore >= 60) {
      secondaryOptions.push(resultObj);
    } else {
      tertiaryOptions.push(resultObj);
    }
  });

  // Tri par score décroissant
  topRecommendations.sort((a, b) => b.compatibilityScore - a.compatibilityScore);
  secondaryOptions.sort((a, b) => b.compatibilityScore - a.compatibilityScore);
  tertiaryOptions.sort((a, b) => b.compatibilityScore - a.compatibilityScore);

  return {
    topRecommendations,
    secondaryOptions,
    tertiaryOptions,
    rejected: academicRejected
  };
};

/**
 * Mode "TARGETED" : Analyse d'une école/formation précise
 * @param {Object} profile - Profil de l'élève
 * @param {string} schoolName - Nom exact de l'établissement
 * @param {string} fieldsName - Nom exact de la filière (optionnel)
 * @returns {Object} Résultat détaillé de la candidature
 */
export const runTargetedMode = (profile, schoolName, fieldName = null) => {
  // Trouver les formations correspondantes
  let targetedFormations = CATALOG.filter(f => f.nomEtablissement === schoolName);

  if (fieldName) {
    targetedFormations = targetedFormations.filter(f => f.filiere === fieldName);
  }

  if (targetedFormations.length === 0) {
    return {
      found: false,
      message: `Aucune formation trouvée pour "${schoolName}"`,
      recommendations: []
    };
  }

  const recommendations = [];

  targetedFormations.forEach(formation => {
    // Vérifier l'éligibilité académique
    const isEligible = isAcademicallyEligible(formation, profile);

    if (isEligible) {
      const compatibilityScore = calculateGlobalCompatibilityScore(profile, formation);
      recommendations.push({
        ...formation,
        compatibilityScore,
        status: 'ELIGIBLE',
        details: {
          academic: calculateAcademicScore(profile, formation),
          socio: calculateSocioEconomicScore(formation, profile.socioProfile || {}),
          professional: calculateProfessionalScore(formation, profile.preferredSectors || [])
        }
      });
    } else {
      // Déterminer les raisons du rejet
      const reasons = [];
      if (profile.age > formation.ageLimite) {
        reasons.push(`Âge limite dépassé: ${profile.age} > ${formation.ageLimite}`);
      }
      if (!formation.conditions.bacsAcceptes.includes(profile.bacType)) {
        reasons.push(`Type de BAC non accepté: ${profile.bacType}`);
      }

      for (const [subject, minNote] of Object.entries(formation.conditions.notesMinimales)) {
        const userNote = profile.notes[subject];
        if (userNote === undefined || userNote === '' || userNote < minNote) {
          reasons.push(`Note insuffisante en ${subject}: ${userNote || 0} < ${minNote}`);
        }
      }

      recommendations.push({
        ...formation,
        status: 'REJECTED',
        rejectReasons: reasons
      });
    }
  });

  return {
    found: true,
    schoolName,
    recommendations,
    eligibleCount: recommendations.filter(r => r.status === 'ELIGIBLE').length,
    rejectedCount: recommendations.filter(r => r.status === 'REJECTED').length
  };
};

/**
 * Mode "GEOGRAPHIC" : Filtre par région/ville et retourne les formations disponibles
 * @param {Object} profile - Profil de l'élève
 * @param {string} region - Nom de la région (optionnel)
 * @param {string} ville - Nom de la ville (optionnel)
 * @returns {Object} Formations catégorisées par région/ville
 */
export const runGeographicMode = (profile, region = null, ville = null) => {
  let filters = {};

  if (region) {
    filters.geographic = { type: 'region', value: region };
  } else if (ville) {
    filters.geographic = { type: 'ville', value: ville };
  }

  return runAutopilotMode(profile, filters);
};

export const runFieldDiscoveryMode = (profile, fieldName, filters = {}) => {
  const normalizedField = fieldName?.trim().toLowerCase();
  const matches = applyAdvancedFilters(CATALOG, filters)
    .filter(formation => formation.filiere.toLowerCase().includes(normalizedField))
    .map(formation => {
      const compatibilityScore = calculateGlobalCompatibilityScore(profile, formation);
      const eligibility = checkTargetedEligibility(profile, formation);

      return {
        ...formation,
        compatibilityScore,
        admissionStatus: eligibility.isEligible ? 'ELIGIBLE' : 'INCONCLUSIVE',
        criteriaSummary: {
          isEligible: eligibility.isEligible,
          reasons: eligibility.reasons
        }
      };
    })
    .sort((a, b) => b.compatibilityScore - a.compatibilityScore);

  return {
    field: fieldName,
    matches,
    total: matches.length
  };
};

export const evaluateSchoolEligibility = (profile, schoolName, fieldName = null) => {
  const normalizedSchool = (schoolName || '').trim().toLowerCase();
  const normalizedField = (fieldName || '').trim().toLowerCase();

  const schoolMatches = CATALOG.filter(formation => {
    const establishmentName = formation.nomEtablissement.toLowerCase();
    return establishmentName === normalizedSchool || establishmentName.includes(normalizedSchool);
  });

  const filtered = schoolMatches.filter(formation => {
    if (!normalizedField) return true;
    const formationField = formation.filiere.toLowerCase();
    return formationField === normalizedField || formationField.includes(normalizedField);
  });

  const recommendation = filtered[0] || schoolMatches[0];

  if (!recommendation) {
    return {
      verdict: 'NOT_ELIGIBLE',
      schoolName,
      fieldName,
      matchedCriteria: [],
      missingCriteria: [],
      reasons: ['Aucune formation trouvée pour cet établissement.'],
      alternatives: []
    };
  }
  const eligibility = checkTargetedEligibility(profile, recommendation);
  const matchedCriteria = [];
  const missingCriteria = [];

  if (profile.age <= recommendation.ageLimite) {
    matchedCriteria.push(`Âge compatible (max ${recommendation.ageLimite} ans)`);
  } else {
    missingCriteria.push(`Âge au-dessus de la limite (${profile.age} > ${recommendation.ageLimite})`);
  }

  if (recommendation.conditions.bacsAcceptes.includes(profile.bacType)) {
    matchedCriteria.push(`Série de bac acceptée (${profile.bacType})`);
  } else {
    missingCriteria.push(`Série de bac non acceptée (${profile.bacType})`);
  }

  Object.entries(recommendation.conditions.notesMinimales).forEach(([subject, minNote]) => {
    const userNote = profile.notes?.[subject];
    if (userNote !== undefined && userNote !== '' && userNote >= minNote) {
      matchedCriteria.push(`Note suffisante en ${subject} (${userNote}/${minNote})`);
    } else {
      missingCriteria.push(`Note insuffisante en ${subject} (${userNote ?? 'N/A'}/${minNote})`);
    }
  });

  const verdict = eligibility.isEligible ? 'ELIGIBLE' : (missingCriteria.length > 0 ? 'INCONCLUSIVE' : 'NOT_ELIGIBLE');
  const alternatives = CATALOG.filter(formation =>
    formation.filiere.toLowerCase().includes((fieldName || recommendation.filiere).toLowerCase()) &&
    formation.nomEtablissement !== schoolName
  )
    .slice(0, 3)
    .map(formation => ({
      ...formation,
      compatibilityScore: calculateGlobalCompatibilityScore(profile, formation)
    }));

  return {
    verdict,
    schoolName,
    fieldName: recommendation.filiere,
    matchedCriteria,
    missingCriteria,
    reasons: eligibility.reasons,
    alternatives,
    compatibilityScore: calculateGlobalCompatibilityScore(profile, recommendation)
  };
};

/**
 * Moteur d'orientation principal (rétro-compatible avec l'ancienne API)
 * Dispatche automatiquement vers le mode approprié
 *
 * @param {Object} profile - Profil de l'élève
 * @param {Object} filters - Filtres et configuration
 * @returns {Object} Résultats d'orientation
 */
export const runOrientationEngine = (profile, filters = {}) => {
  // Déterminer le mode d'exécution
  if (filters.mode === 'targeted' && filters.targetedSchool) {
    return runTargetedMode(profile, filters.targetedSchool, filters.targetedField);
  }

  if (filters.mode === 'geographic') {
    return runGeographicMode(profile, filters.region, filters.ville);
  }

  // Mode par défaut: AUTOPILOT
  return runAutopilotMode(profile, filters);
};
