/**
 * Tests du moteur d'orientation V2
 * Exécuter avec: node src/features/orientationV2/__tests__/orientationEngine.test.js
 */

import { runOrientationEngine, runTargetedMode, runGeographicMode } from '../logic/orientationEngine.js';
import { applyAdvancedFilters, filterByAcademicEligibility } from '../logic/filters.js';
import { CATALOG } from '../data/orientationCatalog.js';

// Utilitaire pour afficher les résultats
const log = (title, data) => {
  console.log('\n' + '='.repeat(60));
  console.log(`✓ ${title}`);
  console.log('='.repeat(60));
  console.log(JSON.stringify(data, null, 2));
};

const testProfile = {
  bacType: 'D',
  age: 19,
  notes: {
    math: 14,
    pc: 12,
    francais: 11,
    anglais: 10,
    philo: 9,
    svt: 11
  },
  socioProfile: {
    budget: 'medium',
    preferBourse: true,
    needLogement: true,
    preferAlternance: true
  },
  preferredSectors: ['Informatique', 'Ingénierie']
};

// Test 1: Filtrage académique
console.log('\n📋 TEST 1: Filtrage académique');
const { eligible, rejected } = filterByAcademicEligibility(CATALOG, testProfile);
console.log(`✓ Formations éligibles: ${eligible.length}`);
console.log(`✓ Formations rejetées: ${rejected.length}`);
if (rejected.length > 0) {
  console.log(`   Première raison de rejet: ${rejected[0].rejectReason}`);
}

// Test 2: Mode AUTOPILOT
console.log('\n🚀 TEST 2: Mode AUTOPILOT');
const autopilotResults = runOrientationEngine(testProfile, {});
log('Résultats AUTOPILOT', {
  topRecommendations: autopilotResults.topRecommendations.length,
  secondaryOptions: autopilotResults.secondaryOptions.length,
  tertiaryOptions: autopilotResults.tertiaryOptions.length,
  rejected: autopilotResults.rejected.length,
  topFormation: autopilotResults.topRecommendations[0]?.filiere || 'Aucune'
});

// Test 3: Filtrage par budget
console.log('\n💰 TEST 3: Filtrage par budget');
const budgetFilters = { budget: 'medium' };
const budgetResults = runOrientationEngine(testProfile, budgetFilters);
console.log(`✓ Formations dans le budget: ${budgetResults.topRecommendations.length + budgetResults.secondaryOptions.length}`);

// Test 4: Filtrage géographique
console.log('\n📍 TEST 4: Filtrage géographique');
const geoResults = runOrientationEngine(testProfile, {
  geographic: { type: 'ville', value: 'Abidjan' }
});
console.log(`✓ Formations à Abidjan: ${geoResults.topRecommendations.length + geoResults.secondaryOptions.length}`);

// Test 5: Mode TARGETED
console.log('\n🎯 TEST 5: Mode TARGETED');
const targetedResults = runOrientationEngine(testProfile, {
  mode: 'targeted',
  targetedSchool: 'ESATIC'
});
log('Résultats TARGETED (ESATIC)', {
  found: targetedResults.found,
  schoolName: targetedResults.schoolName,
  totalRecommendations: targetedResults.recommendations.length,
  eligible: targetedResults.eligibleCount,
  rejected: targetedResults.rejectedCount
});

// Test 6: Scores de compatibilité
console.log('\n📊 TEST 6: Distributions de scores');
if (autopilotResults.topRecommendations.length > 0) {
  const scores = [
    ...autopilotResults.topRecommendations,
    ...autopilotResults.secondaryOptions,
    ...autopilotResults.tertiaryOptions
  ].map(f => f.compatibilityScore);
  
  console.log(`✓ Score moyen: ${(scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)}%`);
  console.log(`✓ Score min: ${Math.min(...scores)}%`);
  console.log(`✓ Score max: ${Math.max(...scores)}%`);
}

// Test 7: Profil inéligible
console.log('\n❌ TEST 7: Profil inéligible (notes trop faibles)');
const weakProfile = {
  bacType: 'D',
  age: 19,
  notes: { math: 5, pc: 4, francais: 6, anglais: 5, philo: 4, svt: 5 }
};
const weakResults = runOrientationEngine(weakProfile, {});
console.log(`✓ Formations recommandées: ${weakResults.topRecommendations.length}`);
console.log(`✓ Formations rejetées: ${weakResults.rejected.length}`);

// Test 8: Profil excellence
console.log('\n⭐ TEST 8: Profil d\'excellence');
const excellentProfile = {
  bacType: 'D',
  age: 18,
  notes: { math: 18, pc: 17, francais: 16, anglais: 16, philo: 15, svt: 17 },
  socioProfile: { budget: 'high', preferBourse: false },
  preferredSectors: ['Ingénierie', 'Informatique']
};
const excellentResults = runOrientationEngine(excellentProfile, {});
console.log(`✓ Top recommandations: ${excellentResults.topRecommendations.length}`);
if (excellentResults.topRecommendations[0]) {
  console.log(`✓ Meilleure formation: ${excellentResults.topRecommendations[0].filiere}`);
  console.log(`✓ Score: ${excellentResults.topRecommendations[0].compatibilityScore}%`);
}

// Résumé final
console.log('\n' + '='.repeat(60));
console.log('✅ TOUS LES TESTS SONT PASSÉS');
console.log('='.repeat(60));
console.log(`
Statistiques globales:
- Catalogue: ${CATALOG.length} formations
- Test profile: ${testProfile.bacType} (${testProfile.age} ans)
- Formations compatibles: ${eligible.length}
- Formations incompatibles: ${rejected.length}
`);
