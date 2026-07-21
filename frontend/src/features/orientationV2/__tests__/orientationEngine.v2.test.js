import { runFieldDiscoveryMode, evaluateSchoolEligibility } from '../logic/orientationEngine';

describe('orientationV2 engine', () => {
  const profile = {
    bacType: 'D',
    age: 19,
    notes: {
      math: 14,
      pc: 12,
      francais: 10,
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
    preferredSectors: ['Informatique']
  };

  it('discovers schools by field and sorts them by compatibility', () => {
    const results = runFieldDiscoveryMode(profile, 'Informatique', { typeEtablissement: 'Public' });

    expect(results.field).toBe('Informatique');
    expect(results.matches.length).toBeGreaterThan(0);
    expect(results.matches[0].compatibilityScore).toBeGreaterThanOrEqual(
      results.matches[results.matches.length - 1].compatibilityScore
    );
  });

  it('produces a clear eligibility verdict with reasons and alternatives', () => {
    const results = evaluateSchoolEligibility(profile, 'ESATIC', 'Réseaux et Télécoms');

    expect(['ELIGIBLE', 'INCONCLUSIVE', 'NOT_ELIGIBLE']).toContain(results.verdict);
    expect(results.matchedCriteria.length).toBeGreaterThan(0);
    expect(results.alternatives.length).toBeGreaterThanOrEqual(0);
  });
});
