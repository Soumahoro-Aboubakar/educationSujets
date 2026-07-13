/**
 * Module de filtrage avancé pour le moteur d'orientation
 * Gère les filtres géographiques, budgétaires, socio-économiques, etc.
 */

/**
 * Applique les filtres utilisateur au catalogue de formations
 * @param {Array} catalog - Catalogue de formations
 * @param {Object} filters - Objet contenant les filtres à appliquer
 * @returns {Array} Formations filtrées
 */
export const applyAdvancedFilters = (catalog, filters) => {
  return catalog.filter(formation => {
    // Filtre géographique (Région ou Ville)
    if (filters.geographic) {
      if (filters.geographic.type === 'region' && formation.region !== filters.geographic.value) {
        return false;
      }
      if (filters.geographic.type === 'ville' && filters.geographic.value !== 'Toutes' && formation.ville !== filters.geographic.value) {
        return false;
      }
    }

    // Filtre par type d'établissement
    if (filters.typeEtablissement && filters.typeEtablissement !== 'Tous' && formation.typeEtablissement !== filters.typeEtablissement) {
      return false;
    }

    // Filtre de budget (prix annuel)
    if (filters.budget) {
      const prix = formation.prix;
      if (filters.budget === 'low' && prix > 100000) return false;
      if (filters.budget === 'medium' && (prix < 100000 || prix > 500000)) return false;
      if (filters.budget === 'high' && prix < 500000) return false;
    }

    // Filtre par disponibilité de bourses
    if (filters.bourse === 'available' && !formation.bourses.disponible) {
      return false;
    }
    if (filters.bourse === 'none' && formation.bourses.disponible) {
      return false;
    }

    // Filtre par logement étudiant
    if (filters.logement && !formation.logement) {
      return false;
    }

    // Filtre par mode d'accès
    if (filters.modeAcces && filters.modeAcces !== 'Tous' && formation.modeAcces !== filters.modeAcces) {
      return false;
    }

    // Filtre par alternance
    if (filters.alternance && !formation.alternance) {
      return false;
    }

    // Filtre par durée de la formation
    if (filters.duree) {
      if (filters.duree === 'short' && formation.duree > 2) return false;
      if (filters.duree === 'medium' && (formation.duree < 3 || formation.duree > 4)) return false;
      if (filters.duree === 'long' && formation.duree < 5) return false;
    }

    // Filtre ciblé : une école précise
    if (filters.targetedSchool) {
      if (formation.nomEtablissement !== filters.targetedSchool) {
        return false;
      }
    }

    return true;
  });
};

/**
 * Filtre basé sur la compatibilité académique d'un élève
 * @param {Array} catalog - Catalogue de formations
 * @param {Object} profile - Profil de l'élève
 * @returns {Object} {eligible: Array, rejected: Array}
 */
export const filterByAcademicEligibility = (catalog, profile) => {
  const eligible = [];
  const rejected = [];

  catalog.forEach(formation => {
    let rejectReason = null;

    // Vérifier l'âge
    if (profile.age > formation.ageLimite) {
      rejectReason = `Âge limite dépassé (max ${formation.ageLimite} ans, vous avez ${profile.age} ans)`;
    }

    // Vérifier le type de BAC
    if (!rejectReason && !formation.conditions.bacsAcceptes.includes(profile.bacType)) {
      rejectReason = `Série de BAC non acceptée (Acceptées: ${formation.conditions.bacsAcceptes.join(', ')})`;
    }

    // Vérifier les notes minimales
    if (!rejectReason) {
      for (const [subject, minNote] of Object.entries(formation.conditions.notesMinimales)) {
        const userNote = profile.notes[subject];
        if (userNote === undefined || userNote === '' || userNote < minNote) {
          rejectReason = `Note insuffisante en ${subject} (Obtenu: ${userNote || 'N/A'}, Requis: ${minNote})`;
          break;
        }
      }
    }

    if (rejectReason) {
      rejected.push({ ...formation, rejectReason });
    } else {
      eligible.push(formation);
    }
  });

  return { eligible, rejected };
};

/**
 * Vérifie si une formation satisfait au moins les critères minimums d'accès
 * @param {Object} formation - Formation
 * @param {Object} profile - Profil de l'élève
 * @returns {boolean}
 */
export const isAcademicallyEligible = (formation, profile) => {
  if (profile.age > formation.ageLimite) return false;
  if (!formation.conditions.bacsAcceptes.includes(profile.bacType)) return false;

  for (const [subject, minNote] of Object.entries(formation.conditions.notesMinimales)) {
    const userNote = profile.notes[subject];
    if (userNote === undefined || userNote === '' || userNote < minNote) {
      return false;
    }
  }

  return true;
};

/**
 * Calcule un score de compatibilité socio-économique
 * @param {Object} formation - Formation
 * @param {Object} socioProfile - Profil socio-économique
 * @returns {number} Score sur 100
 */
export const calculateSocioEconomicScore = (formation, socioProfile) => {
  let score = 0;
  let totalWeight = 0;

  // Budget : si la formation rentre dans le budget prévu
  if (socioProfile.budget && socioProfile.budget !== 'all') {
    const prix = formation.prix;
    let budgetMatch = false;

    if (socioProfile.budget === 'low' && prix <= 100000) budgetMatch = true;
    if (socioProfile.budget === 'medium' && prix > 100000 && prix <= 500000) budgetMatch = true;
    if (socioProfile.budget === 'high' && prix > 500000) budgetMatch = true;

    score += budgetMatch ? 30 : 10;
    totalWeight += 30;
  }

  // Bourses disponibles
  if (socioProfile.preferBourse) {
    score += formation.bourses.disponible ? 30 : 5;
    totalWeight += 30;
  }

  // Logement étudiant
  if (socioProfile.needLogement) {
    score += formation.logement ? 25 : 10;
    totalWeight += 25;
  }

  // Alternance
  if (socioProfile.preferAlternance) {
    score += formation.alternance ? 15 : 5;
    totalWeight += 15;
  }

  if (totalWeight === 0) return 50; // Score neutre par défaut

  return Math.round((score / totalWeight) * 100);
};

/**
 * Calcule un score de compatibilité professionnelle
 * @param {Object} formation - Formation
 * @param {Array} preferredSectors - Secteurs professionnels préférés
 * @returns {number} Score sur 100
 */
export const calculateProfessionalScore = (formation, preferredSectors) => {
  if (!preferredSectors || preferredSectors.length === 0) {
    return 50; // Score neutre si aucun secteur préféré
  }

  // Mappage simplifié : check si le nom de la formation correspond à un secteur
  const formationName = formation.filiere.toLowerCase();
  const nomEcole = formation.nomEtablissement.toLowerCase();

  let matchCount = 0;
  preferredSectors.forEach(sector => {
    const sectorLower = sector.toLowerCase();
    if (formationName.includes(sectorLower) || nomEcole.includes(sectorLower)) {
      matchCount++;
    }
  });

  // Score basé sur le nombre de correspondances
  return Math.min(100, Math.round((matchCount / preferredSectors.length) * 100 + 30));
};

/**
 * Applique les critères de rejet pour le mode "ciblé"
 * @param {Object} profile - Profil de l'élève
 * @param {Object} formation - Formation ciblée
 * @returns {Object} {isEligible: boolean, reasons: Array}
 */
export const checkTargetedEligibility = (profile, formation) => {
  const reasons = [];

  if (profile.age > formation.ageLimite) {
    reasons.push(`Âge limite dépassé (${formation.ageLimite} ans max)`);
  }

  if (!formation.conditions.bacsAcceptes.includes(profile.bacType)) {
    reasons.push(`Série de BAC non acceptée`);
  }

  for (const [subject, minNote] of Object.entries(formation.conditions.notesMinimales)) {
    const userNote = profile.notes[subject];
    if (userNote === undefined || userNote === '' || userNote < minNote) {
      reasons.push(`Note insuffisante en ${subject}`);
    }
  }

  return {
    isEligible: reasons.length === 0,
    reasons
  };
};
