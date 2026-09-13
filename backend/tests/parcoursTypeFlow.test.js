const assert = require('node:assert/strict');
const service = require('../services/dynamicCatalogService');

const parcoursTypes = [
  { _id: 'p1', nom: 'Cycle' },
  { _id: 'p2', nom: 'Concours' },
];

const tests = [
  {
    name: 'selected existing parcours when organism declares one',
    input: { hasParcoursType: true, selectedParcoursType: 'p1', existingParcoursTypes: parcoursTypes },
    expected: { shouldShowParcoursField: true, selectedParcoursType: 'p1', autoAdvance: true },
  },
  {
    name: 'directly skips parcours step when organism has no parcours type',
    input: { hasParcoursType: false, selectedParcoursType: null, existingParcoursTypes: parcoursTypes },
    expected: { shouldShowParcoursField: false, selectedParcoursType: null, autoAdvance: true },
  },
  {
    name: 'creates a parcours type when user chooses a new value',
    input: { hasParcoursType: true, selectedParcoursType: 'p3', existingParcoursTypes: parcoursTypes },
    expected: { shouldShowParcoursField: true, selectedParcoursType: 'p3', autoAdvance: true },
  },
];

for (const test of tests) {
  const result = service.computeParcoursFlow(test.input);
  assert.deepEqual(result, test.expected, `${test.name} failed`);
}

console.log(`✅ ${tests.length} parcours flow checks passed`);
