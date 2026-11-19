import core from './shared/prepCore';
import { buildAtlas, buildPlan, dayStats, orderedModules } from './plan';

const lecons = (prefix, n) => Array.from({ length: n }, (_, i) => ({ code: `${prefix}-L${i + 1}`, titre: `${prefix} leçon ${i + 1}`, duree: 4 }));
const data = {
  programme: {
    code: 'P',
    matieres: [
      { nom: 'Maths', modules: [{ code: 'M1' }, { code: 'M2' }] },
      { nom: 'Français', modules: [{ code: 'F1' }, { code: 'M1' }] },
    ],
  },
  modules: {
    M1: { titre: 'Module 1', lecons: lecons('M1', 3), stats: { parNiveau: { 1: 5, 2: 5, 3: 2 } } },
    M2: { titre: 'Module 2', lecons: lecons('M2', 2), stats: { parNiveau: { 1: 4 } } },
    F1: { titre: 'Résumé', lecons: lecons('F1', 2), stats: { parNiveau: { 1: 3 } } },
  },
};

test('ordre du programme, sans doublon entre matières', () => {
  expect(orderedModules(data).map((m) => m.code)).toEqual(['M1', 'M2', 'F1']);
});

test('débutant : point de départ puis changement de matière', () => {
  const { tasks } = buildPlan(data, core.emptyProgress());
  expect(tasks[0]).toMatchObject({ kind: 'lecon', key: 'lecon:M1-L1', reason: 'Ton point de départ' });
  expect(tasks.some((t) => t.matiere === 'Français' && t.reason === 'Change de matière')).toBe(true);
});

test('après une leçon : suite conseillée, puis consolidation au niveau 1', () => {
  const etat = core.emptyProgress();
  etat.lecons['M1-L1'] = { position: 1, derniere: 1, terminee: true, le: '2026-11-17' };
  const { tasks } = buildPlan(data, etat);
  expect(tasks[0].key).toBe('lecon:M1-L2');
  expect(tasks.find((t) => t.kind === 'session')).toMatchObject({ key: 'session:M1:1', reason: 'Consolider ce que tu viens de lire' });
});

test('reprise prioritaire', () => {
  const etat = core.emptyProgress();
  etat.lecons['M2-L1'] = { position: 0.4, derniere: 0.4, terminee: false, le: '2026-11-17' };
  etat.derniereReprise = { type: 'lecon', module: 'M2', lecon: 'M2-L1' };
  const { tasks } = buildPlan(data, etat);
  expect(tasks[0]).toMatchObject({ key: 'lecon:M2-L1', reason: 'Reprendre là où tu t’es arrêté', progress: 0.4 });
});

test('atlas par matière et journée', () => {
  const atlas = buildAtlas(data, core.emptyProgress());
  expect(atlas.map((g) => g.nom)).toEqual(['Maths', 'Français']);
  expect(atlas[0].modules[0].state.niveaux[2]).toMatchObject({ niveau: 3, verrouille: true });
  const day = dayStats(core.emptyProgress(), '2026-11-17');
  expect(day).toMatchObject({ minutes: 0, objectif: 10, atteint: false, serie: 0 });
  expect(day.week).toHaveLength(7);
});
