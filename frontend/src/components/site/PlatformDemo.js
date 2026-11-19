import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, Dumbbell, Flame, PlayCircle, Repeat2 } from 'lucide-react';
import { cx } from '../ui';

/*
 * Démo animée de la préparation : la vraie interface, rejouée en boucle (plan du jour → leçon →
 * exercice corrigé → progression). Codée en HTML/CSS plutôt qu'en vidéo : nette sur tous les écrans,
 * quelques Ko, aucun texte flou. Posée sur un fond encre par le parent.
 * - La barre de l'onglet actif sert d'horloge : la scène suivante démarre à la fin de son animation,
 *   donc la démo se met en pause d'elle-même hors de l'écran ou onglet masqué.
 * - « Réduire les animations » : pas de lecture automatique, états finaux affichés, onglets manuels.
 */

const SCENES = [
  { id: 'plan', label: 'Plan du jour' },
  { id: 'lecon', label: 'Leçon' },
  { id: 'exercice', label: 'Exercice' },
  { id: 'progres', label: 'Progrès' },
];
const SCENE_MS = 4200;

const useReducedMotion = () => {
  const [reduced, setReduced] = useState(() => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mq) return undefined;
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);
  return reduced;
};

/** Étapes internes d'une scène (0 → 1 → 2), pour que chaque scène raconte une petite action. */
const usePhase = (key, reduced) => {
  const [phase, setPhase] = useState(reduced ? 2 : 0);
  useEffect(() => {
    if (reduced) { setPhase(2); return undefined; }
    setPhase(0);
    const a = setTimeout(() => setPhase(1), 900);
    const b = setTimeout(() => setPhase(2), 1900);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, [key, reduced]);
  return phase;
};

const Rise = ({ delay = 0, className, children }) => (
  <div className={cx('animate-rise-in', className)} style={{ animationDelay: `${delay}ms` }}>{children}</div>
);

const Bar = ({ value, done, className }) => (
  <div className={cx('h-1.5 overflow-hidden rounded-full bg-paper-dim', className)}>
    <div
      className={cx('h-full origin-left rounded-full transition-[transform,background-color] duration-[1300ms] ease-emphasized', done ? 'bg-gold' : 'bg-ink')}
      style={{ transform: `scaleX(${value})` }}
    />
  </div>
);

// ── Scènes ──────────────────────────────────────────────────────────────────
const PlanScene = ({ phase }) => {
  const tasks = [
    { icon: PlayCircle, title: 'Comprendre une dérivée', meta: 'Leçon · Mathématiques', min: 5 },
    { icon: Dumbbell, title: 'Logarithmes · niveau 2', meta: 'Exercices · Mathématiques', min: 8 },
    { icon: Repeat2, title: 'Revoir 3 erreurs', meta: 'Révisions espacées', min: 3 },
  ];
  return (
    <div>
      <Rise><p className="text-[15px] font-bold tracking-[-0.02em] text-ink">Ton plan du jour</p></Rise>
      <Rise delay={60}><p className="mt-0.5 text-[11.5px] text-ink-soft">Fatafalta alterne les matières pour toi.</p></Rise>
      <ul className="mt-3.5 grid gap-2">
        {tasks.map((t, i) => (
          <Rise key={t.title} delay={140 + i * 90}>
            <li
              className={cx(
                'flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-[transform,background-color,border-color] duration-300 ease-emphasized',
                i === 0 && phase >= 1 ? 'border-ink bg-paper' : 'border-line bg-white',
                i === 0 && phase === 1 && 'scale-[0.98]',
              )}
            >
              <span className={cx('flex h-8 w-8 shrink-0 items-center justify-center rounded-full border', i === 0 ? 'border-ink bg-ink text-white' : 'border-line text-ink')}><t.icon size={14} /></span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12.5px] font-semibold text-ink">{t.title}</span>
                <span className="block truncate text-[11px] text-ink-soft">{t.meta}</span>
              </span>
              <span className="text-[11px] tabular-nums text-ink-muted">{`${t.min} min`}</span>
              {i === 0 ? <ArrowRight size={13} className={cx('text-ink transition-transform duration-300', phase >= 1 && 'translate-x-0.5')} /> : null}
            </li>
          </Rise>
        ))}
      </ul>
    </div>
  );
};

const LessonScene = ({ phase }) => (
  <div>
    <Rise>
      <div className="relative aspect-video overflow-hidden rounded-xl bg-ink">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_25%_15%,rgba(74,110,170,0.55),transparent_60%),radial-gradient(ellipse_at_85%_95%,rgba(232,208,163,0.16),transparent_55%)]" />
        {/* Courbe de la fonction et sa tangente, tracées pendant la lecture. */}
        <svg viewBox="0 0 200 110" className="absolute inset-0 h-full w-full" aria-hidden>
          <path d="M20 95 Q 100 95 180 15" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="2" strokeLinecap="round" pathLength="1"
            style={{ strokeDasharray: 1, strokeDashoffset: phase >= 1 ? 0 : 1, transition: 'stroke-dashoffset 1400ms cubic-bezier(0.16,1,0.3,1)' }} />
          <path d="M70 102 L 170 32" fill="none" stroke="#E8D0A3" strokeWidth="1.6" strokeDasharray="4 4" strokeLinecap="round"
            style={{ opacity: phase >= 2 ? 1 : 0, transition: 'opacity 500ms ease' }} />
          <circle cx="120" cy="67" r="3.5" fill="#E8D0A3" style={{ opacity: phase >= 2 ? 1 : 0, transition: 'opacity 500ms ease' }} />
        </svg>
        <span className={cx('absolute left-1/2 top-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/95 text-ink shadow-lift transition-[opacity,transform] duration-500 ease-emphasized', phase >= 1 && 'scale-75 opacity-0')}>
          <PlayCircle size={22} />
        </span>
        <div className="absolute inset-x-3 bottom-2.5 h-1 overflow-hidden rounded-full bg-white/20">
          <div className="h-full origin-left rounded-full bg-gold-light transition-transform ease-linear" style={{ transform: `scaleX(${phase >= 1 ? 0.62 : 0})`, transitionDuration: phase >= 1 ? '2600ms' : '0ms' }} />
        </div>
      </div>
    </Rise>
    <Rise delay={100}><p className="mt-3 text-[11px] text-ink-muted">Leçon 7 · 5 min · avec vidéo</p></Rise>
    <Rise delay={140}><p className="mt-0.5 text-[15px] font-bold tracking-[-0.02em] text-ink">Comprendre une dérivée</p></Rise>
    <Rise delay={200}>
      <div className="mt-2.5 grid gap-1.5">
        <div className="h-1.5 w-[92%] rounded-full bg-paper-dim" />
        <div className="h-1.5 w-[78%] rounded-full bg-paper-dim" />
      </div>
    </Rise>
  </div>
);

const ExerciseScene = ({ phase }) => {
  const options = ['3', '6', '9'];
  return (
    <div>
      <Rise>
        <div className="flex items-center gap-1">
          {Array.from({ length: 10 }).map((_, i) => <span key={i} className={cx('h-1 flex-1 rounded-full', i < 2 ? 'bg-gold' : i === 2 ? 'bg-ink' : 'bg-paper-dim')} />)}
        </div>
      </Rise>
      <Rise delay={60}><p className="mt-3 text-[11px] text-ink-muted">Niveau 1 · question 3 sur 10</p></Rise>
      <Rise delay={100}><p className="mt-1 text-[15px] font-bold leading-snug tracking-[-0.02em] text-ink">Si f(x) = x², que vaut f′(3) ?</p></Rise>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {options.map((o, i) => {
          const chosen = o === '6' && phase >= 1;
          const right = chosen && phase >= 2;
          return (
            <Rise key={o} delay={160 + i * 70}>
              <div className={cx(
                'flex h-11 items-center justify-center gap-1.5 rounded-xl border text-[15px] font-semibold tabular-nums transition-[background-color,border-color,color,transform] duration-300 ease-emphasized',
                right ? 'border-gold bg-gold-wash text-gold-ink' : chosen ? 'scale-[0.97] border-ink bg-paper text-ink' : 'border-line bg-white text-ink',
              )}
              >
                {right ? <Check size={15} strokeWidth={3} /> : null}
                {o}
              </div>
            </Rise>
          );
        })}
      </div>
      <div className={cx('mt-3 rounded-xl bg-gold-wash px-3 py-2 text-[11.5px] text-gold-ink transition-[opacity,transform] duration-500 ease-emphasized', phase >= 2 ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0')}>
        <span className="font-semibold">Juste.</span>{' f′(x) = 2x, donc f′(3) = 6.'}
      </div>
    </div>
  );
};

const ProgressScene = ({ phase }) => {
  const subjects = [
    { name: 'Mathématiques', value: 1 },
    { name: 'Statistiques', value: 0.64 },
    { name: 'Anglais', value: 0.41 },
  ];
  const week = [0.35, 0.6, 0.45, 0.8, 0.55, 0.9, 0.7];
  const grown = phase >= 1;
  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <Rise>
          <p className="text-[15px] font-bold tracking-[-0.02em] text-ink">Ta progression</p>
          <p className="mt-0.5 text-[11.5px] text-ink-soft">La même sur le site et sur l’application.</p>
        </Rise>
        <Rise delay={80}>
          <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-ink ring-1 ring-line"><Flame size={12} className="text-gold" />5 jours</span>
        </Rise>
      </div>
      <Rise delay={120}>
        <div className="mt-3 flex h-14 items-end gap-1.5">
          {week.map((h, i) => (
            <div key={i} className="flex-1 overflow-hidden rounded-md" style={{ height: '100%' }}>
              <div
                className={cx('w-full origin-bottom rounded-md transition-transform duration-[900ms] ease-emphasized', i === week.length - 2 ? 'bg-gold' : 'bg-ink')}
                style={{ height: '100%', transform: `scaleY(${grown ? h : 0.04})`, transitionDelay: `${i * 60}ms` }}
              />
            </div>
          ))}
        </div>
      </Rise>
      <ul className="mt-3.5 grid gap-2.5">
        {subjects.map((s, i) => (
          <Rise key={s.name} delay={180 + i * 70}>
            <li>
              <div className="flex items-baseline justify-between text-[11.5px]">
                <span className="font-medium text-ink">{s.name}</span>
                <span className={cx('tabular-nums transition-opacity duration-300', phase >= 2 ? 'opacity-100' : 'opacity-0', s.value >= 1 ? 'font-semibold text-gold-ink' : 'text-ink-soft')}>{s.value >= 1 ? 'Validé' : `${Math.round(s.value * 100)} %`}</span>
              </div>
              <Bar className="mt-1" value={grown ? s.value : 0} done={s.value >= 1 && phase >= 2} />
            </li>
          </Rise>
        ))}
      </ul>
    </div>
  );
};

const SCENE_VIEWS = { plan: PlanScene, lecon: LessonScene, exercice: ExerciseScene, progres: ProgressScene };

// ── Démo ────────────────────────────────────────────────────────────────────
const PlatformDemo = ({ className }) => {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const rootRef = useRef(null);
  const scene = SCENES[index];
  const phase = usePhase(`${scene.id}-${visible}`, reduced || !visible);
  const View = SCENE_VIEWS[scene.id];

  useEffect(() => {
    const node = rootRef.current;
    if (!node || !('IntersectionObserver' in window)) return undefined;
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.25 });
    io.observe(node);
    return () => io.disconnect();
  }, []);

  const next = () => setIndex((i) => (i + 1) % SCENES.length);
  const playing = !reduced && visible;

  return (
    <div ref={rootRef} className={cx('select-none', className)}>
      {/* Écran de l'application */}
      <div className="overflow-hidden rounded-2xl bg-paper shadow-[0_24px_60px_-20px_rgba(0,0,0,0.55)] ring-1 ring-white/10">
        <div className="flex items-center gap-2 border-b border-line bg-white px-3.5 py-2.5">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#2E6B3A] text-[9px] font-bold text-white">EN</span>
          <span className="min-w-0 flex-1 truncate text-[11.5px] font-semibold text-ink-soft">ENSEA · Analystes statisticiens</span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-paper px-2 py-0.5 text-[10.5px] font-semibold text-ink ring-1 ring-line">
            <span className="h-1.5 w-1.5 rounded-full bg-gold" aria-hidden />
            Essai · 7 j
          </span>
        </div>
        <div className="h-[262px] overflow-hidden p-4" aria-hidden>
          <View key={`${scene.id}-${index}`} phase={phase} />
        </div>
      </div>

      {/* Onglets façon « stories » : la barre active mesure le temps de la scène. */}
      <div className="mt-4 grid grid-cols-4 gap-2" role="tablist" aria-label="Démonstration de la préparation">
        {SCENES.map((s, i) => {
          const active = i === index;
          return (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setIndex(i)}
              className="group flex flex-col gap-1.5 rounded-md pt-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-light"
            >
              <span className="h-[3px] w-full overflow-hidden rounded-full bg-white/15">
                {active ? (
                  playing ? (
                    <span
                      key={`bar-${index}`}
                      className="block h-full origin-left rounded-full bg-gold-light"
                      style={{ animation: `demo-progress ${SCENE_MS}ms linear forwards` }}
                      onAnimationEnd={next}
                    />
                  ) : <span className="block h-full rounded-full bg-gold-light" />
                ) : <span className={cx('block h-full rounded-full', i < index ? 'bg-white/45' : 'bg-transparent')} />}
              </span>
              <span className={cx('truncate text-[11.5px] font-semibold transition-colors', active ? 'text-white' : 'text-white/50 group-hover:text-white/80')}>{s.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default PlatformDemo;
