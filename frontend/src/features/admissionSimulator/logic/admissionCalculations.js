import {
  INPHB_CLASS_WEIGHTS,
  INPHB_MGM_WEIGHTS,
  INPHB_PROGRAMS,
  SUBJECTS,
} from '../data/admissionConfig';

const round = (value, digits = 2) => {
  if (!Number.isFinite(value)) return 0;
  return Number(value.toFixed(digits));
};

const toNumber = (value) => {
  const normalized = String(value ?? '').replace(',', '.').trim();
  if (normalized === '') return NaN;
  return Number(normalized);
};

export const isValidNote = (value) => {
  const numeric = toNumber(value);
  return Number.isFinite(numeric) && numeric >= 0 && numeric <= 20;
};

export const hasCompleteNotes = (notes) =>
  SUBJECTS.every((subject) =>
    ['seconde', 'premiere', 'terminale', 'bac'].every((level) =>
      isValidNote(notes?.[subject.key]?.[level])
    )
  );

export const calculateEsaticSubjectAverage = (subjectNotes) => {
  const seconde = toNumber(subjectNotes?.seconde);
  const premiere = toNumber(subjectNotes?.premiere);
  const terminale = toNumber(subjectNotes?.terminale);
  const bac = toNumber(subjectNotes?.bac);

  const annualWeightedAverage = (seconde + 2 * premiere + 3 * terminale) / 6;
  return round((annualWeightedAverage + 2 * bac) / 3);
};

export const calculateEsaticResult = (notes) => {
  if (!hasCompleteNotes(notes)) return null;

  const subjects = SUBJECTS.map((subject) => ({
    ...subject,
    score: calculateEsaticSubjectAverage(notes[subject.key]),
  }));

  const finalScore =
    subjects.reduce((sum, subject) => sum + subject.score, 0) / subjects.length;

  return {
    institution: 'ESATIC',
    finalScore: round(finalScore),
    displayScore: round(finalScore),
    subjects,
    verdict: getVerdict(finalScore),
  };
};

export const calculateInphbClassAverage = (subjectNotes) => {
  const seconde = toNumber(subjectNotes?.seconde);
  const premiere = toNumber(subjectNotes?.premiere);
  const terminale = toNumber(subjectNotes?.terminale);
  const weightTotal =
    INPHB_CLASS_WEIGHTS.seconde +
    INPHB_CLASS_WEIGHTS.premiere +
    INPHB_CLASS_WEIGHTS.terminale;

  return round(
    (INPHB_CLASS_WEIGHTS.seconde * seconde +
      INPHB_CLASS_WEIGHTS.premiere * premiere +
      INPHB_CLASS_WEIGHTS.terminale * terminale) /
      weightTotal
  );
};

export const calculateInphbSubjectMgm = (subjectNotes) => {
  const classAverage = calculateInphbClassAverage(subjectNotes);
  const bac = toNumber(subjectNotes?.bac);
  const weightTotal = INPHB_MGM_WEIGHTS.classAverage + INPHB_MGM_WEIGHTS.bac;

  return {
    classAverage,
    mgm: round(
      (INPHB_MGM_WEIGHTS.classAverage * classAverage +
        INPHB_MGM_WEIGHTS.bac * bac) /
        weightTotal
    ),
  };
};

export const getInphbProgram = (programKey) =>
  INPHB_PROGRAMS.find((program) => program.key === programKey) || null;

export const calculateInphbResult = ({ notes, programKey }) => {
  const program = getInphbProgram(programKey);
  if (!program || !hasCompleteNotes(notes)) return null;

  const subjects = SUBJECTS.map((subject) => {
    const metrics = calculateInphbSubjectMgm(notes[subject.key]);
    const coefficient = program.subjectCoefficients[subject.key] || 0;
    return {
      ...subject,
      coefficient,
      classAverage: metrics.classAverage,
      mgm: metrics.mgm,
      weightedPoints: metrics.mgm * coefficient,
    };
  });

  const coefficientTotal = subjects.reduce(
    (sum, subject) => sum + subject.coefficient,
    0
  );
  const weightedAverage =
    subjects.reduce((sum, subject) => sum + subject.weightedPoints, 0) /
    coefficientTotal;
  const finalScore = weightedAverage * program.selectionCoefficient;

  return {
    institution: 'INPHB',
    program,
    weightedAverage: round(weightedAverage),
    finalScore: round(finalScore),
    displayScore: round(weightedAverage),
    selectionCoefficient: program.selectionCoefficient,
    subjects: subjects.map((subject) => ({
      ...subject,
      weightedPoints: round(subject.weightedPoints),
    })),
    verdict: getVerdict(weightedAverage),
  };
};

export const calculateAdmissionResult = (formState) => {
  if (formState.institution === 'ESATIC') {
    return calculateEsaticResult(formState.notes);
  }

  if (formState.institution === 'INPHB') {
    return calculateInphbResult({
      notes: formState.notes,
      programKey: formState.programKey,
    });
  }

  return null;
};

export const getVerdict = (score) => {
  if (score >= 15) {
    return {
      tone: 'excellent',
      title: 'Profil tres competitif',
      message: 'Votre dossier simule une position solide pour viser ce concours.',
    };
  }

  if (score >= 12) {
    return {
      tone: 'good',
      title: 'Profil encourageant',
      message: 'Votre score est interessant. Travaillez les matieres les plus coefficientees.',
    };
  }

  return {
    tone: 'watch',
    title: 'Marge de progression',
    message: 'La simulation suggere de renforcer les fondamentaux avant le depot du dossier.',
  };
};
