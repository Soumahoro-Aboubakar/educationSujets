import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  FileCheck2,
  FileStack,
  Landmark,
  RefreshCw,
  ShieldCheck,
  Stamp,
  Building2,
} from 'lucide-react';
import {
  BAC_SERIES,
  INPHB_CYCLES,
  INPHB_PROGRAMS,
  LEVELS,
  SUBJECTS,
} from '../data/admissionConfig';
import { useAdmissionDraft } from '../hooks/useAdmissionDraft';
import {
  calculateAdmissionResult,
  isValidNote,
} from '../logic/admissionCalculations';
import simulatorBg from '../../../assets/images/simulator.jpeg';

// ---------------------------------------------------------------------------
// Design system — "Dossier d'admission"
// ---------------------------------------------------------------------------
const C = {
  ink: '#0E1A2B',
  inkSoft: '#5C6A7D',
  inkFaint: '#8B96A6',
  paper: '#F6F4EF',
  paperDim: '#EFECE3',
  navy: '#16273F',
  navyDeep: '#0A1524',
  gold: '#B98A3B',
  goldSoft: '#F3E7D2',
  line: '#DCD5C6',
  lineSoft: '#E8E3D6',
  success: '#1F7A54',
  successSoft: '#E4F1EA',
  danger: '#B3392C',
  dangerSoft: '#F7E6E2',
};

const useFonts = () => {
  useEffect(() => {
    if (document.getElementById('edu-ci-fonts')) return;
    const link = document.createElement('link');
    link.id = 'edu-ci-fonts';
    link.rel = 'stylesheet';
    link.href =
      'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600;700&display=swap';
    document.head.appendChild(link);
  }, []);
};

const fDisplay = { fontFamily: "'Fraunces', ui-serif, Georgia, serif" };
const fMono = { fontFamily: "'IBM Plex Mono', ui-monospace, monospace" };

// Text-shadow réutilisable pour tout texte hors panneau blanc
const tsOuter = '0 1px 6px rgba(234,230,220,0.95), 0 0 12px rgba(234,230,220,0.8)';
const tsOuterStrong = '0 1px 4px rgba(234,230,220,0.98), 0 0 16px rgba(234,230,220,0.9)';

const institutions = [
  {
    key: 'ESATIC',
    title: 'ESATIC',
    subtitle: 'Télécoms & numérique',
    ref: 'Dossier 01',
    icon: Building2,
  },
  {
    key: 'INPHB',
    title: 'INPHB',
    subtitle: 'Cycle court, cycle long, filières ciblées',
    ref: 'Dossier 02',
    icon: Landmark,
  },
];

const wizardSteps = [
  { key: 'institution', label: 'Établissement', tab: '01', type: 'institution' },
  ...LEVELS.map((level, i) => ({
    key: `notes-${level.key}`,
    label: level.label,
    tab: String(i + 2).padStart(2, '0'),
    type: 'level',
    level,
  })),
  { key: 'result', label: 'Verdict', tab: String(LEVELS.length + 2).padStart(2, '0'), type: 'result' },
];

const isLevelComplete = (notes, levelKey) =>
  SUBJECTS.every((subject) => isValidNote(notes?.[subject.key]?.[levelKey]));

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------
const SelectField = ({ label, value, onChange, options, placeholder }) => (
  <label className="block">
    <span
      className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.14em]"
      style={{ color: C.inkFaint }}
    >
      {label}
    </span>
    <div className="relative">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full appearance-none rounded-md border bg-white px-4 py-3 pr-10 text-sm font-medium outline-none transition"
        style={{ borderColor: C.line, color: C.ink }}
        onFocus={(e) => {
          e.target.style.borderColor = C.navy;
        }}
        onBlur={(e) => {
          e.target.style.borderColor = C.line;
        }}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.key || option} value={option.key || option}>
            {option.label || option}
          </option>
        ))}
      </select>
      <ChevronDown
        size={16}
        className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2"
        style={{ color: C.inkFaint }}
      />
    </div>
  </label>
);

// Rail d'onglets vertical
const TabRail = ({ currentStep }) => (
  <nav
    className="flex shrink-0 flex-row gap-1 overflow-x-auto px-4 pb-3 pt-4 lg:w-[168px] lg:flex-col lg:gap-0.5 lg:overflow-visible lg:px-3 lg:py-6"
    style={{ backgroundColor: C.navyDeep }}
    aria-label="Progression du dossier"
  >
    {wizardSteps.map((step, index) => {
      const active = index === currentStep;
      const done = index < currentStep;
      return (
        <div
          key={step.key}
          className="flex shrink-0 items-center gap-2.5 rounded-md px-3 py-2.5 transition-colors lg:shrink"
          style={{
            backgroundColor: active ? 'rgba(185,138,59,0.14)' : 'transparent',
            borderLeft: active ? `2px solid ${C.gold}` : '2px solid transparent',
          }}
        >
          <span
            className="text-[11px] font-semibold tabular-nums"
            style={{ ...fMono, color: active ? C.gold : done ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.28)' }}
          >
            {step.tab}
          </span>
          <span
            className="whitespace-nowrap text-[12.5px] font-medium"
            style={{ color: active ? '#FFFFFF' : done ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.32)' }}
          >
            {step.label}
          </span>
        </div>
      );
    })}
  </nav>
);

// ---------------------------------------------------------------------------
// Steps
// ---------------------------------------------------------------------------
const InstitutionStep = ({ draft, setDraft }) => {
  const availablePrograms = useMemo(
    () =>
      INPHB_PROGRAMS.filter((program) => {
        const matchSerie = draft.bacSerie ? program.bacSeries.includes(draft.bacSerie) : true;
        const matchCycle = draft.cycle ? program.cycle === draft.cycle : true;
        return matchSerie && matchCycle;
      }),
    [draft.bacSerie, draft.cycle]
  );

  const updateInstitution = (institution) => {
    setDraft((prev) => ({
      ...prev,
      institution,
      bacSerie: institution === 'INPHB' ? prev.bacSerie : '',
      cycle: institution === 'INPHB' ? prev.cycle : '',
      programKey: institution === 'INPHB' ? prev.programKey : '',
    }));
  };

  const updateInphbField = (key, value) => {
    setDraft((prev) => ({ ...prev, [key]: value, programKey: key === 'programKey' ? value : '' }));
  };

  return (
    <div className="space-y-8">
      <div>
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: C.inkFaint }}>
          Choisir l'établissement
        </p>
        <div className="grid gap-px overflow-hidden rounded-md border sm:grid-cols-2" style={{ borderColor: C.line, backgroundColor: C.line }}>
          {institutions.map((institution) => {
            const Icon = institution.icon;
            const selected = draft.institution === institution.key;
            return (
              <button
                key={institution.key}
                type="button"
                onClick={() => updateInstitution(institution.key)}
                className="relative flex items-start gap-4 bg-white p-5 text-left transition-colors"
                style={{ backgroundColor: selected ? C.navy : '#FFFFFF' }}
              >
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md"
                  style={{
                    backgroundColor: selected ? 'rgba(185,138,59,0.16)' : C.paperDim,
                    color: selected ? C.gold : C.inkSoft,
                  }}
                >
                  <Icon size={18} />
                </span>
                <span className="min-w-0">
                  <span
                    className="mb-0.5 block text-[10px] font-semibold uppercase tracking-[0.12em]"
                    style={{ color: selected ? 'rgba(255,255,255,0.45)' : C.inkFaint }}
                  >
                    {institution.ref}
                  </span>
                  <span
                    className="block text-lg font-semibold"
                    style={{ ...fDisplay, color: selected ? '#FFFFFF' : C.ink }}
                  >
                    {institution.title}
                  </span>
                  <span className="mt-0.5 block text-[13px]" style={{ color: selected ? 'rgba(255,255,255,0.62)' : C.inkSoft }}>
                    {institution.subtitle}
                  </span>
                </span>
                {selected && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.6 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute right-4 top-4 flex h-5 w-5 items-center justify-center rounded-full"
                    style={{ backgroundColor: C.gold }}
                  >
                    <FileCheck2 size={12} color={C.navyDeep} />
                  </motion.span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {draft.institution === 'INPHB' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: C.inkFaint }}>
              Détails de la filière
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              <SelectField
                label="Série du Bac"
                value={draft.bacSerie}
                onChange={(value) => updateInphbField('bacSerie', value)}
                options={BAC_SERIES}
                placeholder="Choisir"
              />
              <SelectField
                label="Type de cycle"
                value={draft.cycle}
                onChange={(value) => updateInphbField('cycle', value)}
                options={INPHB_CYCLES}
                placeholder="Choisir"
              />
              <SelectField
                label="École / Filière"
                value={draft.programKey}
                onChange={(value) => updateInphbField('programKey', value)}
                options={availablePrograms.map((program) => ({
                  key: program.key,
                  label: `${program.label} — ${program.school}`,
                }))}
                placeholder="Choisir"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const LevelNotesStep = ({ draft, setDraft, level }) => {
  const updateNote = (subjectKey, levelKey, value) => {
    const normalized = value.replace(',', '.');
    if (normalized !== '' && !/^\d{0,2}(\.\d{0,2})?$/.test(normalized)) return;
    setDraft((prev) => ({
      ...prev,
      notes: { ...prev.notes, [subjectKey]: { ...prev.notes[subjectKey], [levelKey]: normalized } },
    }));
  };

  const completedSubjects = SUBJECTS.filter((s) => isValidNote(draft.notes?.[s.key]?.[level.key])).length;
  const complete = completedSubjects === SUBJECTS.length;

  const liveAverage = useMemo(() => {
    const values = SUBJECTS.map((s) => draft.notes?.[s.key]?.[level.key]).filter(isValidNote).map(Number);
    if (!values.length) return null;
    return (values.reduce((sum, n) => sum + n, 0) / values.length).toFixed(2);
  }, [draft.notes, level.key]);

  return (
    <div>
      <div className="mb-6 flex items-end justify-between gap-4 border-b pb-4" style={{ borderColor: C.lineSoft }}>
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: C.inkFaint }}>
            {level.helper}
          </p>
          <h2 className="text-2xl font-semibold" style={{ ...fDisplay, color: C.ink }}>
            {level.label}
          </h2>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: C.inkFaint }}>
            Moyenne
          </p>
          <p className="text-2xl font-semibold tabular-nums" style={{ ...fMono, color: liveAverage ? C.navy : C.inkFaint }}>
            {liveAverage ?? '—'}
            <span className="text-sm" style={{ color: C.inkFaint }}>/20</span>
          </p>
        </div>
      </div>

      <div className="divide-y" style={{ borderColor: C.lineSoft }}>
        {SUBJECTS.map((subject, i) => {
          const value = draft.notes?.[subject.key]?.[level.key] || '';
          const invalid = value !== '' && !isValidNote(value);
          const valid = isValidNote(value);
          return (
            <div key={subject.key} className="flex items-center gap-4 py-3.5" style={{ borderColor: C.lineSoft }}>
              <span
                className="w-6 shrink-0 text-[11px] font-semibold tabular-nums"
                style={{ ...fMono, color: C.inkFaint }}
              >
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="min-w-[140px] flex-1 text-sm font-medium" style={{ color: C.ink }}>
                {subject.label}
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  value={value}
                  onChange={(e) => updateNote(subject.key, level.key, e.target.value)}
                  placeholder="—"
                  className="w-20 rounded-md border px-3 py-2 text-right text-sm font-semibold tabular-nums outline-none transition"
                  style={{ ...fMono, borderColor: invalid ? C.danger : C.line, color: C.ink }}
                  onFocus={(e) => { if (!invalid) e.target.style.borderColor = C.navy; }}
                  onBlur={(e) => { e.target.style.borderColor = invalid ? C.danger : C.line; }}
                />
                <span className="text-xs font-medium" style={{ color: C.inkFaint }}>/20</span>
                <span
                  className="flex h-6 w-6 items-center justify-center rounded-full"
                  style={{ backgroundColor: valid ? C.successSoft : 'transparent' }}
                >
                  {valid && <FileCheck2 size={13} style={{ color: C.success }} />}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {complete && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-4 text-[13px] font-medium"
          style={{ color: C.success }}
        >
          Niveau complet — vous pouvez continuer.
        </motion.p>
      )}
    </div>
  );
};

const ResultStep = ({ result, draft }) => {
  const [displayed, setDisplayed] = useState('0.00');

  useEffect(() => {
    if (!result) { setDisplayed('0.00'); return undefined; }
    const target = parseFloat(result.displayScore);
    if (Number.isNaN(target)) { setDisplayed(result.displayScore); return undefined; }
    let raf;
    const start = performance.now();
    const step = (now) => {
      const progress = Math.min(1, (now - start) / 700);
      setDisplayed((target * progress).toFixed(2));
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [result]);

  if (!result) {
    return (
      <div className="rounded-md border px-5 py-4 text-sm font-medium" style={{ borderColor: C.line, color: C.inkSoft, backgroundColor: C.paperDim }}>
        Complétez toutes les notes (0 à 20) pour faire apparaître le verdict.
      </div>
    );
  }

  const admis = result.finalScore ? Number(result.finalScore) >= 10 : Number(result.displayScore) >= 10;

  return (
    <div className="space-y-8">
      <div className="flex flex-col items-center gap-5 border-b pb-8 text-center sm:flex-row sm:justify-between sm:text-left" style={{ borderColor: C.lineSoft }}>
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: C.inkFaint }}>
            Score simulé
          </p>
          <p className="text-5xl font-semibold tabular-nums" style={{ ...fMono, color: C.ink }}>
            {displayed}<span className="text-xl" style={{ color: C.inkFaint }}>/20</span>
          </p>
          <p className="mt-2 max-w-sm text-sm" style={{ color: C.inkSoft }}>{result.verdict.message}</p>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.7, rotate: -8 }}
          animate={{ opacity: 1, scale: 1, rotate: -8 }}
          transition={{ type: 'spring', stiffness: 200, damping: 14, delay: 0.3 }}
          className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-[3px]"
          style={{ borderColor: admis ? C.success : C.danger, color: admis ? C.success : C.danger }}
        >
          <div className="text-center leading-tight">
            <Stamp size={16} className="mx-auto mb-1" />
            <p className="text-[11px] font-bold uppercase tracking-wide">{admis ? 'Admis' : 'Insuffisant'}</p>
            <p className="text-[9px] font-semibold uppercase" style={{ color: C.inkFaint }}>{result.verdict.title}</p>
          </div>
        </motion.div>
      </div>

      {result.institution === 'INPHB' && (
        <div className="flex flex-wrap items-center gap-x-8 gap-y-2 text-sm">
          <span style={{ color: C.inkFaint }}>Filière : <b style={{ color: C.ink }}>{result.program.label} — {result.program.school}</b></span>
          <span style={{ color: C.inkFaint }}>Coefficient : <b style={{ color: C.ink }}>{result.selectionCoefficient}</b></span>
          <span style={{ color: C.inkFaint }}>MG appliquée : <b style={{ color: C.ink }}>{result.finalScore}</b></span>
        </div>
      )}

      <div>
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: C.inkFaint }}>
          Détail par matière
        </p>
        <div className="divide-y" style={{ borderColor: C.lineSoft }}>
          {result.subjects.map((subject, i) => (
            <div key={subject.key} className="flex items-center gap-4 py-3">
              <span className="w-6 text-[11px] font-semibold tabular-nums" style={{ ...fMono, color: C.inkFaint }}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="flex-1 text-sm font-medium" style={{ color: C.ink }}>{subject.label}</span>
              {result.institution === 'INPHB' && (
                <span className="hidden text-xs sm:block" style={{ color: C.inkFaint }}>
                  MC {subject.classAverage} · Coef. {subject.coefficient}
                </span>
              )}
              <span className="w-16 text-right text-sm font-semibold tabular-nums" style={{ ...fMono, color: C.navy }}>
                {(result.institution === 'INPHB' ? subject.mgm : subject.score)}/20
              </span>
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs" style={{ color: C.inkFaint }}>
        Simulation calculée localement dans votre navigateur. Elle ne remplace pas les résultats
        officiels publiés par {draft.institution || "l'institution"}.
      </p>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
const AdmissionSimulator = () => {
  useFonts();
  const { draft, setDraft, resetDraft } = useAdmissionDraft();
  const [currentStep, setCurrentStep] = useState(0);
  const [shake, setShake] = useState(0);
  const result = useMemo(() => calculateAdmissionResult(draft), [draft]);
  const currentWizardStep = wizardSteps[currentStep];

  const institutionReady =
    draft.institution === 'ESATIC' ||
    (draft.institution === 'INPHB' && draft.bacSerie && draft.cycle && draft.programKey);
  const levelReady = currentWizardStep.type === 'level' && isLevelComplete(draft.notes, currentWizardStep.level.key);
  const canGoNext =
    (currentStep === 0 && institutionReady) ||
    (currentWizardStep.type === 'level' && levelReady) ||
    currentWizardStep.type === 'result';
  const isLastStep = currentStep === wizardSteps.length - 1;

  const goNext = () => setCurrentStep((s) => Math.min(s + 1, wizardSteps.length - 1));
  const goBack = () => setCurrentStep((s) => Math.max(s - 1, 0));

  const handleNextClick = () => {
    if (isLastStep) return;
    if (!canGoNext) { setShake((s) => s + 1); return; }
    goNext();
  };
  const handleReset = () => { resetDraft(); setCurrentStep(0); };

  const touchStart = useRef(null);
  const handleTouchStart = (e) => {
    if (e.target.closest && e.target.closest('input, select, textarea, button, a')) { touchStart.current = null; return; }
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  };
  const handleTouchEnd = (e) => {
    if (!touchStart.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.current.x;
    const dy = t.clientY - touchStart.current.y;
    touchStart.current = null;
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.4) return;
    if (dx < 0) handleNextClick(); else if (currentStep > 0) goBack();
  };

  return (
    <main
      className="relative min-h-screen bg-cover bg-fixed bg-center px-4 pb-16 pt-[100px] sm:px-6 lg:px-10"
      style={{ backgroundImage: `url(${simulatorBg})` }}
    >
      {/* ── Couche 1 : fond couleur opaque à 93 % ── */}
      <div
        className="absolute inset-0 z-0 backdrop-blur-md"
        style={{ backgroundColor: 'rgba(236, 232, 224, 0.93)' }}
      />

      {/* ── Couche 2 : vignette subtile (plus sombre en haut/bas) ── */}
      <div
        className="absolute inset-0 z-[1] pointer-events-none"
        style={{
          background:
            'linear-gradient(to bottom, rgba(10,21,36,0.06) 0%, transparent 30%, transparent 70%, rgba(10,21,36,0.04) 100%)',
        }}
      />

      {/* ── Couche 3 : liseré doré ultra-fin en haut (accent premium) ── */}
      <div
        className="absolute inset-x-0 top-0 z-[2] h-px pointer-events-none"
        style={{
          background: `linear-gradient(90deg, transparent 5%, ${C.gold}60 30%, ${C.gold} 50%, ${C.gold}60 70%, transparent 95%)`,
        }}
      />

      {/* ── Contenu ── */}
      <div className="relative z-10 mx-auto max-w-5xl">
        {/* Barre supérieure : retour + auto-save */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-medium transition hover:opacity-70"
            style={{ color: C.inkSoft, textShadow: tsOuterStrong }}
          >
            <ArrowLeft size={15} />
            Accueil
          </Link>
          <div
            className="inline-flex items-center gap-1.5 text-[11px] font-medium"
            style={{ color: C.inkFaint, textShadow: tsOuter }}
          >
            <FileStack size={13} />
            Sauvegarde automatique locale
          </div>
        </div>

        {/* En-tête éditorial */}
        <header className="mb-8">
          <p
            className="mb-2 inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em]"
            style={{ color: C.gold, textShadow: tsOuterStrong }}
          >
            <Stamp size={12} />
            Simulateur d'admission
          </p>
          <h1
            className="text-3xl font-semibold leading-[1.08] sm:text-[2.5rem]"
            style={{ ...fDisplay, color: C.ink, textShadow: tsOuterStrong }}
          >
            ESATIC et INPHB, votre dossier en quelques étapes.
          </h1>
          <p
            className="mt-2 max-w-xl text-[15px] leading-relaxed"
            style={{ color: C.inkSoft, textShadow: tsOuter }}
          >
            Choisissez l'établissement, puis renseignez chaque niveau de la Seconde à la
            Terminale avant la note du BAC.
          </p>
        </header>

        {/* ── Dossier : panneau principal ── */}
        <section
          className="overflow-hidden rounded-lg border shadow-[0_8px_32px_rgba(14,26,43,0.09),0_1px_3px_rgba(14,26,43,0.04)] ring-1 ring-black/[0.03] lg:flex"
          style={{ borderColor: C.line, backgroundColor: '#FFFFFF' }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Liseré doré en haut du panneau (accent "chemise cartonnée") */}
          <div
            className="h-[3px] w-full lg:h-full lg:w-[3px] lg:shrink-0"
            style={{
              background: `linear-gradient(${C.gold}80, ${C.goldSoft}, ${C.gold}80)`,
            }}
          />

          <TabRail currentStep={currentStep} />

          <div className="flex-1 p-6 sm:p-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentWizardStep.key}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                {currentWizardStep.type === 'institution' && <InstitutionStep draft={draft} setDraft={setDraft} />}
                {currentWizardStep.type === 'level' && (
                  <LevelNotesStep draft={draft} setDraft={setDraft} level={currentWizardStep.level} />
                )}
                {currentWizardStep.type === 'result' && <ResultStep result={result} draft={draft} />}
              </motion.div>
            </AnimatePresence>

            <p className="mt-4 text-center text-[11px] font-medium sm:hidden" style={{ color: C.inkFaint }}>
              Balayez l'écran ← → pour naviguer
            </p>

            <div className="mt-8 flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between" style={{ borderColor: C.lineSoft }}>
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center justify-center gap-2 text-sm font-medium transition hover:opacity-70"
                style={{ color: C.inkFaint }}
              >
                <RefreshCw size={14} />
                Réinitialiser
              </button>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={goBack}
                  disabled={currentStep === 0}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-md border px-4 py-2.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-35 sm:flex-none"
                  style={{ borderColor: C.line, color: C.ink }}
                >
                  <ArrowLeft size={15} />
                  Retour
                </button>
                <motion.button
                  key={`next-${shake}`}
                  type="button"
                  onClick={handleNextClick}
                  animate={shake ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }}
                  transition={{ duration: 0.35 }}
                  aria-disabled={!canGoNext || isLastStep}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-md px-5 py-2.5 text-sm font-semibold text-white transition sm:flex-none"
                  style={{
                    backgroundColor: C.navy,
                    opacity: !canGoNext || isLastStep ? 0.4 : 1,
                    cursor: !canGoNext || isLastStep ? 'not-allowed' : 'pointer',
                  }}
                >
                  {currentStep === wizardSteps.length - 2 ? 'Voir le verdict' : 'Continuer'}
                  <ArrowRight size={15} />
                </motion.button>
              </div>
            </div>
          </div>
        </section>

        {/* Pied de page : features */}
        <div className="mt-6 flex flex-wrap gap-x-8 gap-y-3">
          {[
            ['Assistant par niveau', FileStack],
            ['Données conservées sur cet appareil', ShieldCheck],
            ['Matières clés : Maths, PC, Anglais, Français', FileCheck2],
          ].map(([label, Icon]) => (
            <div
              key={label}
              className="inline-flex items-center gap-2 text-[13px] font-medium"
              style={{ color: C.inkFaint, textShadow: tsOuter }}
            >
              <Icon size={14} style={{ color: C.inkSoft }} />
              {label}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
};

export default AdmissionSimulator;