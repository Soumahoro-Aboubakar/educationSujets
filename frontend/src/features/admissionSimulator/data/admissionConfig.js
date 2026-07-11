export const SUBJECTS = [
  { key: 'math', label: 'Mathematiques', shortLabel: 'Maths' },
  { key: 'physics', label: 'Physique-Chimie', shortLabel: 'PC' },
  { key: 'english', label: 'Anglais', shortLabel: 'Anglais' },
  { key: 'french', label: 'Francais', shortLabel: 'Francais' },
];

export const LEVELS = [
  { key: 'seconde', label: 'Seconde', helper: 'Moyenne annuelle generale' },
  { key: 'premiere', label: 'Premiere', helper: 'Moyenne annuelle' },
  { key: 'terminale', label: 'Terminale', helper: 'Moyenne annuelle' },
  { key: 'bac', label: 'BAC', helper: 'Note obtenue au Baccalaureat' },
];

export const EMPTY_NOTES = SUBJECTS.reduce((acc, subject) => {
  acc[subject.key] = LEVELS.reduce((levelAcc, level) => {
    levelAcc[level.key] = '';
    return levelAcc;
  }, {});
  return acc;
}, {});

export const BAC_SERIES = ['C', 'D', 'E', 'F', 'BT', 'G2', 'BTcpt', 'A1', 'A2'];

export const INPHB_CYCLES = [
  { key: 'cycle_long', label: 'Cycle Long' },
  { key: 'cycle_court', label: 'Cycle Court' },
];

export const INPHB_PROGRAMS = [
  {
    key: 'mpsi_c',
    label: 'MPSI',
    school: 'EPGE',
    cycle: 'cycle_long',
    bacSeries: ['C'],
    selectionCoefficient: 0.52,
    subjectCoefficients: { math: 6, physics: 5, english: 2, french: 2 },
  },
  {
    key: 'pcsi_c',
    label: 'PCSI',
    school: 'EPGE',
    cycle: 'cycle_long',
    bacSeries: ['C'],
    selectionCoefficient: 0.5,
    subjectCoefficients: { math: 5, physics: 6, english: 2, french: 2 },
  },
  {
    key: 'mpsi_e',
    label: 'MPSI',
    school: 'EPGE',
    cycle: 'cycle_long',
    bacSeries: ['E'],
    selectionCoefficient: 0.43,
    subjectCoefficients: { math: 6, physics: 5, english: 2, french: 2 },
  },
  {
    key: 'pcsi_e',
    label: 'PCSI',
    school: 'EPGE',
    cycle: 'cycle_long',
    bacSeries: ['E'],
    selectionCoefficient: 0.43,
    subjectCoefficients: { math: 5, physics: 6, english: 2, french: 2 },
  },
  {
    key: 'dts_industrie',
    label: 'DTS',
    school: 'ESI',
    cycle: 'cycle_court',
    bacSeries: ['C', 'D', 'E', 'F', 'BT'],
    selectionCoefficient: 0.29,
    subjectCoefficients: { math: 4, physics: 4, english: 2, french: 2 },
  },
  {
    key: 'gae',
    label: 'GAE',
    school: 'ESCAE',
    cycle: 'cycle_court',
    bacSeries: ['A1', 'A2', 'D', 'G2', 'BTcpt'],
    selectionCoefficient: 0.31,
    subjectCoefficients: { math: 3, physics: 1, english: 4, french: 4 },
  },
  {
    key: 'fca',
    label: 'FCA',
    school: 'ESCAE',
    cycle: 'cycle_court',
    bacSeries: ['G2', 'BTcpt', 'A1', 'A2', 'D'],
    selectionCoefficient: 0.32,
    subjectCoefficients: { math: 3, physics: 1, english: 3, french: 5 },
  },
  {
    key: 'ecg',
    label: 'ECG',
    school: 'EPGE',
    cycle: 'cycle_long',
    bacSeries: ['A1', 'A2', 'D', 'G2'],
    selectionCoefficient: 0.38,
    subjectCoefficients: { math: 4, physics: 1, english: 4, french: 4 },
  },
];

export const INPHB_CLASS_WEIGHTS = {
  seconde: 1,
  premiere: 2,
  terminale: 3,
};

export const INPHB_MGM_WEIGHTS = {
  classAverage: 1,
  bac: 2,
};

export const DEFAULT_FORM_STATE = {
  institution: '',
  bacSerie: '',
  cycle: '',
  programKey: '',
  notes: EMPTY_NOTES,
};
