import React, { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight, ArrowUpRight, BarChart3, BookOpen, ChevronDown, Clock, Compass, Dumbbell, FileText, Flame,
  ListChecks, Lock, Medal, PlayCircle, Repeat2, Shuffle, Target, Timer, Trophy,
} from 'lucide-react';
import { Button, Modal, cx } from '../../components/ui';
import core from '../../prep/shared/prepCore';
import { prepApi, todayKey } from '../../prep/client';
import { buildAtlas, buildPlan, dayStats, readPlacement } from '../../prep/plan';
import { LessonMark, LessonVideo, MasteryBar, OrgMark, pct } from '../../prep/ui';
import ReminderToggle from '../../prep/ReminderToggle';
import PrepSearch, { programmeEntries } from './PrepSearch';
import { useContextSearch } from '../../lib/contextSearch';
import { SIDEBAR_SHORTCUT, SidebarTip, SidebarToggleIcon, sidebarToggleLabel, useSidebar } from '../../components/site/Sidebar';

/*
 * Espace de travail d'un programme : trois vues d'un même programme.
 * - Mon plan : la plateforme décide des tâches du jour (débutant) ;
 * - Programme : l'atlas complet, pour aller droit au module voulu (avancé) ;
 * - Progrès : la semaine, les chiffres clés, la maîtrise par matière.
 * Desktop : rail de navigation à gauche (repliable, ⌘B), contexte du jour à droite. Mobile : onglets en bas.
 */

const VIEWS = [
  { id: 'plan', label: 'Mon plan', icon: ListChecks },
  { id: 'programme', label: 'Programme', icon: Compass },
  { id: 'progres', label: 'Progrès', icon: BarChart3 },
];
const VIEW_KEY = 'fatafalta.prep.vue';
const readView = () => { try { return window.localStorage.getItem(VIEW_KEY); } catch (e) { return null; } };
const writeView = (v) => { try { window.localStorage.setItem(VIEW_KEY, v); } catch (e) { /* rien */ } };

const easeOut = [0.16, 1, 0.3, 1];

// ── Classement de la semaine (place de l'élève et ses voisins) ─────────────
const rankCache = new Map();
const useMyRank = (programme, enabled) => {
  const [board, setBoard] = useState(() => rankCache.get(programme) || null);
  useEffect(() => {
    if (!enabled) return undefined;
    let alive = true;
    prepApi.declare().then(() => prepApi.ranking(programme, 'semaine'))
      .then((b) => { rankCache.set(programme, b); if (alive) setBoard(b); })
      .catch(() => {});
    return () => { alive = false; };
  }, [programme, enabled]);
  return board;
};
export const ordinal = (n) => (n === 1 ? '1ᵉʳ' : `${n}ᵉ`);

const RankCard = ({ board, programme }) => {
  if (!board?.moi) return null;
  const list = board.candidats || [];
  const i = list.findIndex((c) => c.moi);
  const above = i > 0 ? list[i - 1] : null;
  const below = i >= 0 && i < list.length - 1 ? list[i + 1] : null;
  const gap = above ? Math.max(0, Math.round((above.score - board.moi.score) * 10) / 10) : 0;
  return (
    <section className="overflow-hidden rounded-3xl border border-line bg-white">
      <div className="bg-ink p-5 text-white">
        <div className="flex items-center justify-between">
          <h3 className="text-[15px] font-semibold">Ton classement</h3>
          <Trophy size={17} className="text-gold-light" />
        </div>
        <p className="mt-3 text-[40px] font-bold leading-none tabular-nums tracking-[-0.03em]">{ordinal(board.moi.rang)}<span className="ml-1.5 text-[16px] font-semibold text-white/60">{`sur ${board.total}`}</span></p>
        <p className="mt-2 text-[13px] text-white/70">{board.variation > 0 ? `+${board.variation} place${board.variation > 1 ? 's' : ''} cette semaine` : board.variation < 0 ? `${board.variation} place${board.variation < -1 ? 's' : ''} cette semaine` : `Cette semaine · ${board.moi.pseudonyme}`}</p>
      </div>
      <ol className="divide-y divide-line text-[14px]">
        {[above, board.moi && { ...board.moi, moi: true }, below].filter(Boolean).map((c) => (
          <li key={c.identite || 'moi'} className={cx('flex items-center gap-3 px-5 py-3', c.moi && 'bg-gold-wash/50')}>
            <span className="w-8 text-[13px] font-bold tabular-nums text-ink-soft">{ordinal(c.rang)}</span>
            <span className="min-w-0 flex-1 truncate font-medium text-ink">{c.moi ? 'Toi' : c.pseudonyme}</span>
            <span className="tabular-nums text-ink-soft">{String(c.score).replace('.', ',')}</span>
          </li>
        ))}
      </ol>
      <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-3">
        <p className="text-[13px] text-ink-soft">{above ? `${String(gap).replace('.', ',')} pt${gap > 1 ? 's' : ''} pour passer ${ordinal(above.rang)}` : 'Tu mènes ce concours'}</p>
        <Link to={`/preparation/${programme}/classement`} className="shrink-0 text-[13px] font-semibold text-ink underline underline-offset-4">Tout voir</Link>
      </div>
    </section>
  );
};

// ── Rail (desktop, repliable) et onglets (mobile) ───────────────────────────
const railItem = 'group relative flex h-11 items-center rounded-xl px-[13px] text-left text-[15px] font-medium transition-colors';
const railGap = (collapsed) => (collapsed ? 'gap-0' : 'gap-3');
const RailLabel = ({ collapsed, children }) => (
  <span className={cx('relative min-w-0 flex-1 overflow-hidden whitespace-nowrap transition-opacity duration-200 motion-reduce:transition-none', collapsed && 'opacity-0')}>{children}</span>
);
const RailBadge = ({ badge, collapsed }) => {
  if (!badge) return null;
  return collapsed
    ? <span className="absolute left-[27px] top-2 h-2 w-2 rounded-full bg-ink ring-2 ring-paper" aria-label={`${badge} à revoir`} />
    : <span className="min-w-[22px] rounded-full bg-ink px-1.5 py-0.5 text-center text-[11px] font-bold tabular-nums text-white">{badge}</span>;
};

const RailLink = ({ to, icon: Icon, label, badge, collapsed, external }) => (
  <Link to={to} aria-label={collapsed ? label : undefined} className={cx(railItem, railGap(collapsed), 'text-ink-soft hover:bg-ink/[0.04] hover:text-ink')}>
    <Icon size={18} strokeWidth={2} className="shrink-0" />
    <RailLabel collapsed={collapsed}>{label}</RailLabel>
    {external && !collapsed ? <ArrowUpRight size={14} className="shrink-0" /> : null}
    <RailBadge badge={badge} collapsed={collapsed} />
    <SidebarTip show={collapsed}>{label}</SidebarTip>
  </Link>
);

const RailSection = ({ title, collapsed, children }) => (
  <div className="mt-6 border-t border-line pt-6">
    <p className={cx('h-5 overflow-hidden whitespace-nowrap px-3 text-[13px] font-semibold text-ink transition-opacity duration-200', collapsed && 'opacity-0')} aria-hidden={collapsed || undefined}>{title}</p>
    <div className="mt-2 grid grid-cols-[minmax(0,1fr)] gap-1">{children}</div>
  </div>
);

const Rail = ({ programme, view, onView, canStudy, revisions }) => {
  const { collapsed, toggle } = useSidebar();
  const label = sidebarToggleLabel(collapsed);
  return (
    <aside
      id="rail-preparation"
      className={cx(
        'sticky top-16 z-20 hidden h-[calc(100vh-4rem)] shrink-0 flex-col border-r border-line py-8 transition-[width,padding] duration-300 ease-emphasized motion-reduce:transition-none lg:flex',
        collapsed ? 'w-[64px] pr-5' : 'w-[248px] pr-6',
      )}
      aria-label="Navigation de la préparation"
    >
        <button
          type="button"
          onClick={toggle}
          aria-expanded={!collapsed}
          aria-controls="rail-preparation"
          aria-label={label}
          title={collapsed ? undefined : `${label} (${SIDEBAR_SHORTCUT})`}
          className={cx(railItem, railGap(collapsed), 'mb-6 w-full text-ink-muted hover:bg-ink/[0.04] hover:text-ink')}
        >
          <SidebarToggleIcon collapsed={collapsed} size={18} strokeWidth={1.9} className="shrink-0" />
          <RailLabel collapsed={collapsed}>Réduire le menu</RailLabel>
          {!collapsed ? <kbd className="rounded-md border border-line bg-paper px-1.5 py-0.5 font-sans text-[11px] font-semibold text-ink-muted">{SIDEBAR_SHORTCUT}</kbd> : null}
          <SidebarTip show={collapsed}>{`Ouvrir le menu · ${SIDEBAR_SHORTCUT}`}</SidebarTip>
        </button>
      <div className={cx('group relative flex items-center', railGap(collapsed))}>
        <span className="shrink-0"><OrgMark logo={programme.organismeLogo} organismeId={programme.organismeId} sigle={programme.organisme?.sigle || programme.code} size={44} /></span>
        <div className={cx('min-w-0 transition-opacity duration-200', collapsed && 'opacity-0')}>
          <p className="truncate text-[15px] font-bold leading-tight tracking-[-0.01em] text-ink">{programme.organisme?.sigle}</p>
          <p className="truncate text-[13px] text-ink-soft">{programme.titre}</p>
        </div>
        <SidebarTip show={collapsed}>{`${programme.organisme?.sigle || ''} · ${programme.titre}`}</SidebarTip>
      </div>
      <Link
        to="/preparation"
        tabIndex={collapsed ? -1 : undefined}
        aria-hidden={collapsed || undefined}
        className={cx('mt-3 inline-flex w-fit items-center gap-1.5 whitespace-nowrap rounded-lg text-[13px] font-medium text-ink-soft underline decoration-line-strong underline-offset-4 transition-[color,opacity] duration-200 hover:text-ink hover:decoration-ink', collapsed && 'pointer-events-none opacity-0')}
      >
        Changer de concours
      </Link>
      <nav className="mt-8 grid grid-cols-[minmax(0,1fr)] gap-1">
        {VIEWS.map((v) => {
          const active = view === v.id;
          return (
            <button
              key={v.id}
              type="button"
              onClick={() => onView(v.id)}
              aria-current={active ? 'page' : undefined}
              aria-label={collapsed ? v.label : undefined}
              className={cx(railItem, railGap(collapsed), active ? 'text-ink' : 'text-ink-soft hover:bg-ink/[0.04] hover:text-ink')}
            >
              {active ? <motion.span layoutId="rail-active" className="absolute inset-0 rounded-xl bg-white shadow-soft ring-1 ring-line" transition={{ duration: 0.35, ease: easeOut }} /> : null}
              <v.icon size={18} className="relative shrink-0" strokeWidth={2} />
              <RailLabel collapsed={collapsed}>{v.label}</RailLabel>
              <SidebarTip show={collapsed}>{v.label}</SidebarTip>
            </button>
          );
        })}
        <RailLink to={`/preparation/${programme.code}/revisions`} icon={Repeat2} label="Révisions" badge={revisions} collapsed={collapsed} />
        <RailLink to={`/preparation/${programme.code}/classement`} icon={Trophy} label="Classement" collapsed={collapsed} />
      </nav>
      <RailSection title="S’évaluer" collapsed={collapsed}>
        <RailLink to={`/preparation/${programme.code}/concours-blanc`} icon={Timer} label="Concours blanc" collapsed={collapsed} />
        <RailLink to={`/preparation/${programme.code}/test-de-niveau`} icon={Compass} label="Test de niveau" collapsed={collapsed} />
      </RailSection>
      <RailSection title="Ressources" collapsed={collapsed}>
        <RailLink to="/sujets" icon={FileText} label="Sujets et corrigés" collapsed={collapsed} external />
      </RailSection>
      <div className="mt-auto pt-6">
        {canStudy ? (
          <p className={cx('px-3 text-[12px] leading-relaxed text-ink-muted', collapsed && 'hidden')}>Ta progression est la même sur le site et sur l’application Android.</p>
        ) : null}
      </div>
    </aside>
  );
};

const TabBar = ({ view, onView, programme, revisions }) => (
  <nav className="fixed inset-x-0 bottom-0 z-40 touch-manipulation select-none border-t border-line bg-paper/95 pb-[max(env(safe-area-inset-bottom),8px)] backdrop-blur-xl lg:hidden" aria-label="Navigation de la préparation">
    <div className="mx-auto grid h-16 max-w-lg grid-cols-5">
      {VIEWS.slice(0, 2).map((v) => {
        const active = view === v.id;
        return (
          <button key={v.id} type="button" onClick={() => onView(v.id)} aria-current={active ? 'page' : undefined} className="relative flex flex-col items-center justify-center gap-1 text-[11px] font-semibold">
            {active ? <motion.span layoutId="tab-active" className="absolute inset-x-0 top-0 mx-auto h-0.5 w-8 rounded-full bg-gold" transition={{ duration: 0.3, ease: easeOut }} /> : null}
            <v.icon size={21} strokeWidth={active ? 2.3 : 1.9} className={active ? 'text-ink' : 'text-ink-muted'} />
            <span className={active ? 'text-ink' : 'text-ink-muted'}>{v.label}</span>
          </button>
        );
      })}
      <NavLink to={`/preparation/${programme}/revisions`} className="relative flex flex-col items-center justify-center gap-1 text-[11px] font-semibold text-ink-muted">
        <Repeat2 size={21} strokeWidth={1.9} />
        {revisions ? <span className="absolute left-1/2 top-2 ml-1.5 min-w-[18px] rounded-full bg-ink px-1 text-center text-[10px] font-bold leading-[18px] text-white">{revisions}</span> : null}
        <span>Révisions</span>
      </NavLink>
      {VIEWS.slice(2).map((v) => {
        const active = view === v.id;
        return (
          <button key={v.id} type="button" onClick={() => onView(v.id)} aria-current={active ? 'page' : undefined} className="relative flex flex-col items-center justify-center gap-1 text-[11px] font-semibold">
            {active ? <motion.span layoutId="tab-active" className="absolute inset-x-0 top-0 mx-auto h-0.5 w-8 rounded-full bg-gold" transition={{ duration: 0.3, ease: easeOut }} /> : null}
            <v.icon size={21} strokeWidth={active ? 2.3 : 1.9} className={active ? 'text-ink' : 'text-ink-muted'} />
            <span className={active ? 'text-ink' : 'text-ink-muted'}>{v.label}</span>
          </button>
        );
      })}
      <NavLink to="/sujets" className="flex flex-col items-center justify-center gap-1 text-[11px] font-semibold text-ink-muted">
        <FileText size={21} strokeWidth={1.9} />
        <span>Sujets</span>
      </NavLink>
    </div>
  </nav>
);

// ── Bande du jour ───────────────────────────────────────────────────────────
/** Essai gratuit en cours (7 jours d'étude) : discret, l'abonnement n'est proposé qu'à la fin. */
export const TrialPill = ({ essai, abonne }) => {
  if (abonne || !essai?.actif) return null;
  const n = essai.joursRestants;
  return (
    <span className={cx('inline-flex items-center gap-2 rounded-full px-3 py-1 text-[13px] font-semibold', essai.alerte ? 'bg-burgundy-wash text-burgundy' : 'bg-white text-ink ring-1 ring-line')}>
      <span className={cx('h-1.5 w-1.5 rounded-full', essai.alerte ? 'bg-burgundy' : 'bg-gold')} aria-hidden />
      {`Essai gratuit · ${n} jour${n > 1 ? 's' : ''} restant${n > 1 ? 's' : ''}`}
    </span>
  );
};

const TodayStrip = ({ day, board, programme }) => (
  <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-4 rounded-2xl border border-line bg-white px-5 py-4">
    <div className="flex min-w-[min(220px,100%)] flex-1 items-center gap-4">
      <Target size={18} className={day.atteint ? 'text-gold' : 'text-ink'} aria-hidden />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3 text-[14px]">
          <span className="font-semibold text-ink">{day.atteint ? 'Objectif du jour atteint' : 'Objectif du jour'}</span>
          <span className="tabular-nums text-ink-soft">{`${day.minutes} / ${day.objectif} min`}</span>
        </div>
        <MasteryBar className="mt-2" value={Math.min(1, day.minutes / day.objectif)} done={day.atteint} label="Minutes étudiées aujourd’hui" />
      </div>
    </div>
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-[14px]">
      <span className="flex items-center gap-2 text-ink">
        <Flame size={17} className={day.serie ? 'text-gold' : 'text-ink-muted'} aria-hidden />
        <span className="font-semibold tabular-nums">{day.serie}</span>
        <span className="text-ink-soft">{day.serie > 1 ? 'jours de suite' : 'jour de suite'}</span>
      </span>
      <span className="flex items-center gap-2 text-ink">
        <Repeat2 size={17} className="text-ink-muted" aria-hidden />
        <span className="font-semibold tabular-nums">{day.revisions.total}</span>
        <span className="text-ink-soft">{day.revisions.total > 1 ? 'erreurs à revoir' : 'erreur à revoir'}</span>
      </span>
      {board?.moi ? (
        <Link to={`/preparation/${programme}/classement`} className="flex items-center gap-2 rounded-full bg-gold-wash px-3 py-1 text-ink transition-colors hover:bg-gold-light/60">
          <Trophy size={16} className="text-gold-ink" aria-hidden />
          <span className="font-semibold tabular-nums">{ordinal(board.moi.rang)}</span>
          <span className="text-ink-soft">{`sur ${board.total}`}</span>
        </Link>
      ) : null}
    </div>
  </div>
);

// ── Vue « Mon plan » ────────────────────────────────────────────────────────
const KIND = {
  lecon: { icon: BookOpen, verb: 'Lire la leçon' },
  session: { icon: Dumbbell, verb: 'S’entraîner' },
  revision: { icon: Repeat2, verb: 'Réviser' },
};

const reasonIcon = (reason) => (reason === 'Change de matière' ? Shuffle : reason?.startsWith('Reprendre') ? PlayCircle : reason === 'Fixer tes acquis' ? Repeat2 : Target);

const LeadTask = ({ task, locked }) => {
  const Kind = KIND[task.kind];
  const Reason = reasonIcon(task.reason);
  return (
    <article className="overflow-hidden rounded-3xl border border-line bg-white">
      <div className={cx('grid gap-0', task.video ? 'md:grid-cols-[1fr_minmax(240px,40%)]' : '')}>
        <div className="flex flex-col p-6 sm:p-8">
          <h3 className="text-[26px] font-bold leading-[1.15] tracking-[-0.025em] text-ink sm:text-[30px]">{task.title}</h3>
          <p className="mt-2 text-[15px] text-ink-soft">{`${task.matiere} · ${task.subtitle}`}</p>
          <p className="mt-4 inline-flex w-fit items-center gap-2 rounded-full bg-gold-wash px-3 py-1 text-[13px] font-semibold text-gold-ink">
            <Reason size={14} aria-hidden />
            {task.reason}
          </p>
          <div className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-3 pt-6">
            {locked ? (
              <Button to={locked} icon={Lock}>Débloquer l’étude</Button>
            ) : (
              <Button to={task.to} size="lg" icon={ArrowRight} iconPosition="end">{task.progress > 0.02 ? 'Reprendre' : Kind.verb}</Button>
            )}
            <span className="flex items-center gap-1.5 text-[14px] text-ink-soft"><Clock size={15} aria-hidden />{`${task.minutes} min`}</span>
            {task.progress > 0.02 ? <span className="text-[14px] tabular-nums text-ink-soft">{`Lue à ${pct(task.progress)}`}</span> : null}
          </div>
        </div>
        {task.video ? (
          <div className="border-t border-line bg-paper p-4 md:border-l md:border-t-0">
            <LessonVideo video={task.video} compact />
          </div>
        ) : null}
      </div>
    </article>
  );
};

const TaskRow = ({ task, number, locked }) => {
  const KindIcon = KIND[task.kind].icon;
  return (
    <li>
      <Link
        to={locked || task.to}
        className="group grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 rounded-2xl px-4 py-4 transition-colors hover:bg-white sm:px-5"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white text-ink transition-colors group-hover:border-ink" aria-hidden>
          <KindIcon size={17} />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[16px] font-semibold text-ink">{task.title}</span>
          <span className="mt-0.5 block truncate text-[14px] text-ink-soft">{`${task.reason} · ${task.matiere} · ${task.subtitle}`}</span>
        </span>
        <span className="flex items-center gap-3">
          <span className="hidden text-[13px] tabular-nums text-ink-muted sm:inline">{`${task.minutes} min`}</span>
          <ArrowRight size={17} className="text-ink-muted transition-[transform,color] duration-200 group-hover:translate-x-0.5 group-hover:text-ink" aria-hidden />
          <span className="sr-only">{`Tâche ${number}`}</span>
        </span>
      </Link>
    </li>
  );
};

const PlanView = ({ plan, locked, onView, programmeCode }) => {
  if (!plan.tasks.length) {
    return (
      <div className="rounded-3xl border border-line bg-white p-8">
        <h3 className="text-[22px] font-bold tracking-[-0.02em] text-ink">Tout le programme est validé</h3>
        <p className="mt-2 max-w-prose text-ink-soft">Tu as terminé chaque module. Révise tes erreurs, refais un niveau 3, ou parcours le programme pour revoir une leçon.</p>
        <Button className="mt-6" variant="secondary" onClick={() => onView('programme')}>Parcourir le programme</Button>
      </div>
    );
  }
  const [lead, ...rest] = plan.tasks;
  return (
    <div>
      <LeadTask task={lead} locked={locked} />
      {rest.length ? (
        <section className="mt-8" aria-labelledby="plan-ensuite">
          <h3 id="plan-ensuite" className="px-1 text-[15px] font-semibold text-ink">Ensuite aujourd’hui</h3>
          <ol className="mt-2 divide-y divide-line">
            {rest.map((t, i) => <TaskRow key={t.key} task={t} number={i + 2} locked={locked} />)}
          </ol>
        </section>
      ) : null}
      <section className="mt-10 grid gap-3 sm:grid-cols-2" aria-label="S’évaluer">
        <Link to={`/preparation/${programmeCode}/concours-blanc`} className="group flex items-center gap-4 rounded-2xl border border-line bg-white p-4 transition-colors hover:border-ink">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-paper text-ink"><Medal size={19} /></span>
          <span className="min-w-0 flex-1"><span className="block text-[15px] font-semibold text-ink">Concours blanc</span><span className="block text-[13px] text-ink-soft">Les conditions de l’épreuve, noté sur 20</span></span>
          <ArrowRight size={16} className="text-ink-muted transition-transform group-hover:translate-x-0.5 group-hover:text-ink" />
        </Link>
        <Link to={`/preparation/${programmeCode}/test-de-niveau`} className="group flex items-center gap-4 rounded-2xl border border-line bg-white p-4 transition-colors hover:border-ink">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-paper text-ink"><Compass size={19} /></span>
          <span className="min-w-0 flex-1"><span className="block text-[15px] font-semibold text-ink">Test de niveau</span><span className="block text-[13px] text-ink-soft">Saute ce que tu maîtrises déjà</span></span>
          <ArrowRight size={16} className="text-ink-muted transition-transform group-hover:translate-x-0.5 group-hover:text-ink" />
        </Link>
      </section>
      <p className="mt-8 flex flex-wrap items-center gap-x-2 gap-y-1 px-1 text-[14px] text-ink-soft">
        Tu sais déjà ce que tu veux travailler ?
        <button type="button" onClick={() => onView('programme')} className="font-semibold text-ink underline decoration-line-strong underline-offset-4 transition-colors hover:decoration-ink">
          Choisis directement dans le programme
        </button>
      </p>
    </div>
  );
};

// ── Vue « Programme » (atlas) ───────────────────────────────────────────────
const statusText = (st) => (st.valide ? 'Validé' : st.statut === 'enCours' ? pct(st.pourcentage) : 'À commencer');

const ModuleEntry = ({ programme, mod, number, open, onToggle, canStudy, locked, onLocked }) => {
  const reduce = useReducedMotion();
  const st = mod.state;
  const hasVideo = mod.lecons.some((l) => l.video);
  const panelId = `module-${mod.code}`;
  return (
    <li id={`m-${mod.code}`} className={cx('scroll-mt-24 rounded-2xl transition-[background-color,box-shadow] duration-300', open && 'bg-white shadow-soft ring-1 ring-line')}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        className={cx('group grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 rounded-2xl px-4 py-4 text-left transition-colors sm:px-5', !open && 'hover:bg-white')}
      >
        <span className={cx('flex h-10 w-10 items-center justify-center rounded-full text-[13px] font-bold tabular-nums', st.valide ? 'bg-gold text-white' : 'border border-line bg-white text-ink')}>{number}</span>
        <span className="min-w-0">
          <span className="flex items-center gap-2">
            <span className="line-clamp-2 text-[16px] font-semibold leading-snug text-ink">{mod.titre}</span>
            {hasVideo ? <PlayCircle size={15} className="shrink-0 text-ink-muted" aria-label="Avec vidéos" /> : null}
          </span>
          <span className="mt-2 flex items-center gap-3">
            <MasteryBar className="max-w-[220px] flex-1" value={st.pourcentage} done={st.valide} label={`Maîtrise du module ${mod.titre}`} />
            <span className={cx('shrink-0 text-[13px] tabular-nums', st.valide ? 'font-semibold text-gold-ink' : 'text-ink-soft')}>{statusText(st)}</span>
          </span>
        </span>
        <span className="flex items-center gap-3">
          <span className="hidden text-[13px] tabular-nums text-ink-muted sm:inline">{`${st.leconsFaites}/${st.leconsTotal} leçons`}</span>
          <ChevronDown size={18} className={cx('text-ink-muted transition-transform duration-300 ease-emphasized', open && 'rotate-180 text-ink')} aria-hidden />
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            id={panelId}
            key="panel"
            initial={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            animate={reduce ? { opacity: 1 } : { height: 'auto', opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: reduce ? 0.15 : 0.38, ease: easeOut }}
            className="overflow-hidden"
          >
            <div className="grid min-w-0 gap-6 px-4 pb-6 pt-2 sm:px-5 md:grid-cols-[minmax(0,1fr)_240px]">
              <ol className="grid grid-cols-[minmax(0,1fr)] gap-0.5">
                {st.lessons.map((l) => {
                  const inner = (
                    <>
                      <LessonMark state={l.state} number={l.index + 1} value={l.lu} />
                      <span className="min-w-0 flex-1 text-[15px] leading-snug text-ink line-clamp-2">{l.titre}</span>
                      {l.video ? <PlayCircle size={14} className="shrink-0 text-ink-muted" aria-label="Vidéo" /> : null}
                      <span className="shrink-0 text-[12px] tabular-nums text-ink-muted">{l.state === 'progress' ? pct(l.lu) : `${l.duree} min`}</span>
                    </>
                  );
                  return (
                    <li key={l.code}>
                      {canStudy
                        ? <Link to={`/preparation/${programme}/${mod.code}/lecon/${l.code}`} className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-paper">{inner}</Link>
                        : (
                          <button
                            type="button"
                            aria-haspopup="dialog"
                            onClick={() => onLocked?.({ kind: 'lecon', titre: l.titre, to: `/preparation/${programme}/${mod.code}/lecon/${l.code}` })}
                            className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-paper"
                          >
                            {inner}
                            <Lock size={13} className="shrink-0 text-ink-muted" aria-hidden />
                          </button>
                        )}
                    </li>
                  );
                })}
              </ol>
              <div className="self-start rounded-2xl bg-paper p-4">
                <p className="text-[13px] font-semibold text-ink">S’entraîner</p>
                <div className="mt-3 grid gap-2">
                  {st.niveaux.filter((n) => n.exercices).map((n) => {
                    const to = `/preparation/${programme}/${mod.code}/niveau/${n.niveau}`;
                    const body = (
                      <>
                        <span className="flex flex-col">
                          <span className="text-[14px] font-semibold">{`Niveau ${n.niveau}`}</span>
                          <span className="text-[12px] opacity-75">{n.verrouille ? 'Réussis le niveau 2 d’abord' : `${n.exercices} exercices${n.score ? ` · meilleur ${pct(n.score)}` : ''}`}</span>
                        </span>
                        {n.reussi ? <span className="h-2 w-2 shrink-0 rounded-full bg-gold" aria-label="Réussi" /> : n.verrouille || !canStudy ? <Lock size={14} aria-hidden /> : <ArrowRight size={15} aria-hidden />}
                      </>
                    );
                    if (!canStudy) {
                      return (
                        <button key={n.niveau} type="button" aria-haspopup="dialog" onClick={() => onLocked?.({ kind: 'niveau', titre: `Niveau ${n.niveau} · ${mod.titre}`, to })} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-white px-3 py-2.5 text-left text-ink transition-colors hover:border-ink">
                          {body}
                        </button>
                      );
                    }
                    return n.verrouille
                      ? <span key={n.niveau} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-white/60 px-3 py-2.5 text-ink-muted">{body}</span>
                      : <Link key={n.niveau} to={to} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-white px-3 py-2.5 text-ink transition-colors hover:border-ink">{body}</Link>;
                  })}
                </div>
                {locked ? <Link to={locked} className="mt-3 block text-[13px] font-semibold text-ink underline underline-offset-4">Débloquer l’étude</Link> : null}
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </li>
  );
};

const AtlasView = ({ programme, atlas, canStudy, locked, focusCode, onLocked }) => {
  const [open, setOpen] = useState(() => new Set(focusCode ? [focusCode] : []));
  const { hash } = useLocation();
  useEffect(() => {
    const code = hash.startsWith('#module-') ? hash.slice(8) : null;
    if (!code) return;
    setOpen((s) => new Set([...s, code]));
    requestAnimationFrame(() => document.getElementById(`m-${code}`)?.scrollIntoView({ block: 'start', behavior: 'smooth' }));
  }, [hash]);
  let n = 0;
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-10">
      {atlas.map((matiere) => (
        <section key={matiere.nom} aria-labelledby={`atlas-${matiere.nom}`}>
          <div className="flex flex-wrap items-end justify-between gap-3 px-1">
            <h3 id={`atlas-${matiere.nom}`} className="text-[20px] font-bold tracking-[-0.02em] text-ink">{matiere.nom}</h3>
            <p className="text-[13px] tabular-nums text-ink-soft">{`${matiere.valides}/${matiere.modules.length} modules validés · maîtrise ${pct(matiere.maitrise)}`}</p>
          </div>
          <ol className="mt-3 grid grid-cols-[minmax(0,1fr)] gap-1">
            {matiere.modules.map((mod) => {
              n += 1;
              return (
                <ModuleEntry
                  key={mod.code}
                  programme={programme}
                  mod={mod}
                  number={n}
                  open={open.has(mod.code)}
                  onToggle={() => setOpen((s) => { const next = new Set(s); if (next.has(mod.code)) next.delete(mod.code); else next.add(mod.code); return next; })}
                  canStudy={canStudy}
                  locked={locked}
                  onLocked={onLocked}
                />
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
};

// ── Vue « Progrès » ─────────────────────────────────────────────────────────
const WEEKDAYS = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
const WeekChart = ({ week, objectif }) => {
  if (!week.some((d) => d.minutes)) {
    return (
      <div className="flex h-40 flex-col items-center justify-center rounded-2xl border border-dashed border-line-strong px-4 text-center">
        <p className="text-[14px] font-semibold text-ink">Ta première séance apparaîtra ici</p>
        <p className="mt-1 text-[13px] text-ink-soft">{`Chaque jour, vise ${objectif} minutes.`}</p>
      </div>
    );
  }
  const max = Math.max(objectif, ...week.map((d) => d.minutes), 1);
  return (
    <div className="grid h-40 grid-cols-7 items-end gap-2" role="img" aria-label={`Minutes d’étude des 7 derniers jours : ${week.map((d) => d.minutes).join(', ')}`}>
      {week.map((d) => {
        const h = Math.round((d.minutes / max) * 100);
        const reached = d.minutes >= objectif;
        return (
          <div key={d.day} className="flex h-full flex-col items-center justify-end gap-2">
            <span className="text-[11px] tabular-nums text-ink-muted">{d.minutes || ''}</span>
            <span className={cx('w-full max-w-[34px] rounded-md transition-[height] duration-700 ease-emphasized', reached ? 'bg-gold' : d.minutes ? 'bg-ink' : 'bg-line')} style={{ height: `${Math.max(d.minutes ? 6 : 3, h)}%` }} />
            <span className="text-[11px] text-ink-soft">{WEEKDAYS[new Date(`${d.day}T12:00:00`).getDay()]}</span>
          </div>
        );
      })}
    </div>
  );
};

const ProgressView = ({ day, atlas, programmeCode, board }) => {
  const s = day.stats;
  const facts = [
    { label: 'Questions répondues', value: s.questions },
    { label: 'Réussite au 1ᵉʳ essai', value: pct(s.reussite) },
    { label: 'Modules validés', value: s.modulesValides },
    { label: 'Record de série', value: `${s.serieRecord} j` },
  ];
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-8">
      <section className="rounded-3xl border border-line bg-white p-6 sm:p-8" aria-labelledby="pr-semaine">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 id="pr-semaine" className="text-[20px] font-bold tracking-[-0.02em] text-ink">Tes 7 derniers jours</h3>
          <p className="text-[13px] tabular-nums text-ink-soft">{`${day.week.reduce((a, d) => a + d.minutes, 0)} min · objectif ${day.objectif} min par jour`}</p>
        </div>
        <div className="mt-6"><WeekChart week={day.week} objectif={day.objectif} /></div>
      </section>
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-line bg-line md:grid-cols-4">
        {facts.map((f) => (
          <div key={f.label} className="bg-white px-5 py-5">
            <dt className="text-[13px] text-ink-soft">{f.label}</dt>
            <dd className="mt-1 text-[26px] font-bold tabular-nums tracking-[-0.02em] text-ink">{f.value}</dd>
          </div>
        ))}
      </dl>
      <ReminderToggle programme={programmeCode} />
      <Link to={`/preparation/${programmeCode}/classement`} className="group flex items-center gap-4 rounded-3xl border border-line bg-white p-5 transition-colors hover:border-ink">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gold-wash text-gold-ink"><Trophy size={19} /></span>
        <span className="min-w-0 flex-1"><span className="block text-[16px] font-semibold text-ink">Classement du concours</span><span className="block text-[13px] text-ink-soft">{board?.moi ? `Tu es ${ordinal(board.moi.rang)} sur ${board.total} cette semaine` : 'Ta place parmi les candidats, cette semaine et depuis le début'}</span></span>
        <ArrowRight size={16} className="text-ink-muted transition-transform group-hover:translate-x-0.5 group-hover:text-ink" />
      </Link>
      <section aria-labelledby="pr-matieres">
        <h3 id="pr-matieres" className="px-1 text-[20px] font-bold tracking-[-0.02em] text-ink">Maîtrise par matière</h3>
        <ul className="mt-3 divide-y divide-line">
          {atlas.map((m) => (
            <li key={m.nom} className="grid grid-cols-[1fr_auto] items-center gap-x-6 gap-y-2 px-1 py-4 sm:grid-cols-[200px_1fr_auto]">
              <span className="text-[15px] font-semibold text-ink">{m.nom}</span>
              <MasteryBar className="col-span-2 row-start-2 sm:col-span-1 sm:row-start-auto" value={m.maitrise} done={m.maitrise >= 1} label={`Maîtrise en ${m.nom}`} />
              <span className="text-[13px] tabular-nums text-ink-soft">{`${pct(m.maitrise)} · ${m.valides}/${m.modules.length}`}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
};

// ── Le concours : épreuves officielles et sources (public, aussi lu par les moteurs) ─────
const ConcoursFacts = ({ programme }) => {
  const epreuves = programme.epreuves || [];
  // Sources publiques seulement (avec un lien) : les notes internes de rédaction ne sont pas affichées.
  const sources = (programme.sources || []).filter((source) => source.titre && source.url);
  if (!epreuves.length && !sources.length) return null;
  return (
    <section className="mb-10" aria-labelledby="concours-epreuves">
      <h2 id="concours-epreuves" className="text-[20px] font-bold tracking-[-0.02em] text-ink">Les épreuves du concours</h2>
      {programme.description ? <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-soft">{programme.description}</p> : null}
      {epreuves.length ? (
        <ul className="mt-4 divide-y divide-line border-y border-line">
          {epreuves.map((epreuve) => (
            <li key={epreuve.nom} className="grid grid-cols-[1fr_auto] items-baseline gap-x-6 gap-y-1 py-3.5 sm:grid-cols-[1fr_80px_110px]">
              <div className="min-w-0">
                <p className="text-[15px] font-semibold text-ink">{epreuve.nom}</p>
                {epreuve.note ? <p className="mt-0.5 text-[13px] leading-relaxed text-ink-soft">{epreuve.note}</p> : null}
              </div>
              <span className="text-[14px] tabular-nums text-ink-soft">{epreuve.duree || '—'}</span>
              <span className="col-span-2 text-[13px] tabular-nums text-ink-muted sm:col-span-1 sm:text-right sm:text-[14px] sm:text-ink-soft">{epreuve.coefficient != null ? `coefficient ${epreuve.coefficient}` : ''}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {sources.length ? (
        <p className="mt-3 text-[13px] leading-relaxed text-ink-muted">
          {'Sources : '}
          {sources.map((source, index) => (
            <React.Fragment key={source.titre}>
              {index ? ' · ' : ''}
              <a href={source.url} target="_blank" rel="noopener noreferrer" className="underline decoration-line-strong underline-offset-4 hover:text-ink">{source.titre}</a>
            </React.Fragment>
          ))}
        </p>
      ) : null}
    </section>
  );
};

// ── Colonne de contexte (desktop large) ─────────────────────────────────────
const ContextColumn = ({ day, atlas, onView, board, programme }) => (
  <aside className="hidden w-[300px] shrink-0 xl:block" aria-label="Ta journée">
    <div className="sticky top-24 grid gap-6">
      <RankCard board={board} programme={programme} />
      <section className="rounded-3xl border border-line bg-white p-5">
        <h3 className="text-[15px] font-semibold text-ink">Ta semaine</h3>
        <div className="mt-4"><WeekChart week={day.week} objectif={day.objectif} /></div>
      </section>
      <section className="rounded-3xl border border-line bg-white p-5">
        <div className="flex items-baseline justify-between">
          <h3 className="text-[15px] font-semibold text-ink">Matières</h3>
          <button type="button" onClick={() => onView('programme')} className="text-[13px] font-medium text-ink-soft underline underline-offset-4 hover:text-ink">Tout voir</button>
        </div>
        <ul className="mt-4 grid gap-4">
          {atlas.map((m) => (
            <li key={m.nom}>
              <div className="flex items-baseline justify-between gap-3 text-[14px]">
                <span className="truncate font-medium text-ink">{m.nom}</span>
                <span className="tabular-nums text-ink-soft">{pct(m.maitrise)}</span>
              </div>
              <MasteryBar className="mt-2" value={m.maitrise} done={m.maitrise >= 1} label={`Maîtrise en ${m.nom}`} />
            </li>
          ))}
        </ul>
      </section>
    </div>
  </aside>
);

// ── Accès : compte obligatoire pour étudier ────────────────────────────────
export const StudyGate = ({ user, next }) => (
  <div className="flex flex-col gap-5 rounded-3xl bg-ink p-6 text-white sm:flex-row sm:items-center sm:justify-between sm:p-8">
    <div className="max-w-xl">
      <p className="text-[20px] font-bold tracking-[-0.02em]">{user ? 'Tes 7 jours d’essai sont terminés' : 'Réservé aux membres · 7 jours gratuits'}</p>
      <p className="mt-2 text-[15px] leading-relaxed text-white/75">
        {user
          ? 'L’accès complet garde toutes les leçons, les vidéos, les exercices et ta progression, sur le site et sur l’application.'
          : 'Crée ton compte gratuit ou connecte-toi : tu étudies 7 jours sans abonnement, avec les leçons, les vidéos, les exercices et ta progression sur tous tes appareils.'}
      </p>
    </div>
    <div className="flex shrink-0 flex-wrap gap-3">
      {user ? <Button to="/abonnement" variant="gold">Voir l’accès complet</Button> : (
        <>
          <Button to={`/register?next=${encodeURIComponent(next)}`} variant="gold">Créer un compte</Button>
          <Button to={`/login?next=${encodeURIComponent(next)}`} variant="ghost" className="text-white hover:bg-white/10">Se connecter</Button>
        </>
      )}
    </div>
  </div>
);

/**
 * Clic sur une leçon ou un exercice sans droit d'étude : on dit pourquoi et comment y accéder,
 * au lieu d'un clic qui ne fait rien. Après connexion, l'élève arrive directement sur ce qu'il visait.
 */
const AccessSheet = ({ request, user, onClose }) => {
  const [shown, setShown] = useState(request);
  useEffect(() => { if (request) setShown(request); }, [request]);
  const what = shown?.kind === 'niveau' ? 'ces exercices' : 'cette leçon';
  const next = shown?.to || window.location.pathname;
  return (
    <Modal open={Boolean(request)} onClose={onClose} title={user ? 'Essai terminé' : 'Compte nécessaire'}>
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink text-gold-light" aria-hidden><Lock size={20} /></span>
      <p className="mt-5 text-[22px] font-bold leading-tight tracking-[-0.02em] text-ink">
        {user ? 'Ton essai gratuit est terminé' : `Connecte-toi pour ouvrir ${what}`}
      </p>
      {shown?.titre ? <p className="mt-2 line-clamp-2 text-[15px] font-medium text-ink">{shown.titre}</p> : null}
      <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
        {user
          ? 'L’accès complet rouvre toutes les leçons, les vidéos, les exercices corrigés et ta progression, sur le site et sur l’application.'
          : 'Les leçons et les exercices sont réservés aux membres. Crée ton compte gratuit : tu étudies 7 jours sans abonnement, et ta progression te suit sur tous tes appareils.'}
      </p>
      <div className="mt-6 grid gap-2.5">
        {user ? <Button to="/abonnement" size="lg" className="w-full">Voir l’accès complet</Button> : (
          <>
            <Button to={`/register?next=${encodeURIComponent(next)}`} size="lg" className="w-full">Créer un compte gratuit</Button>
            <Button to={`/login?next=${encodeURIComponent(next)}`} variant="secondary" size="lg" className="w-full">J’ai déjà un compte</Button>
          </>
        )}
      </div>
      {user ? null : <p className="mt-4 text-center text-[13px] text-ink-muted">Les sujets et corrigés PDF restent consultables sans compte.</p>}
    </Modal>
  );
};

// ── Page ────────────────────────────────────────────────────────────────────
const PrepWorkspace = ({ data, prep, logo }) => {
  const programme = data.programme;
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const etat = prep.progressions[programme.code] || core.emptyProgress();
  const canStudy = Boolean(prep.user && prep.droits?.accesPreparation);
  const locked = prep.loading || canStudy ? null : prep.user ? '/abonnement' : `/register?next=${encodeURIComponent(pathname)}`;
  const today = todayKey();
  const atlas = useMemo(() => buildAtlas(data, etat), [data, etat]);
  const day = useMemo(() => dayStats(etat, today), [etat, today]);
  const plan = useMemo(() => {
    const base = buildPlan(data, etat, { placement: readPlacement(programme.code) });
    if (!day.revisions.total) return base;
    // Les erreurs dues passent juste après la reprise : courtes, et elles fixent ce qui a été appris.
    const n = Math.min(20, day.revisions.total);
    const revision = { kind: 'revision', key: 'revision', title: `Revoir ${n} erreur${n > 1 ? 's' : ''}`, subtitle: 'révisions espacées', matiere: 'Toutes matières', minutes: Math.max(2, Math.round(n * 0.7)), reason: 'Fixer tes acquis', to: `/preparation/${programme.code}/revisions` };
    const tasks = [...base.tasks];
    tasks.splice(tasks[0]?.reason?.startsWith('Reprendre') ? 1 : 0, 0, revision);
    return { ...base, tasks: tasks.slice(0, 4) };
  }, [data, etat, day, programme.code]);

  // Vue : celle de l'adresse, sinon la dernière choisie ; un visiteur découvre d'abord le programme.
  const fallback = prep.user ? (readView() || 'plan') : 'programme';
  const view = VIEWS.some((v) => v.id === params.get('vue')) ? params.get('vue') : fallback;
  const onView = (id) => {
    writeView(id);
    setParams(id === 'plan' ? {} : { vue: id }, { replace: false });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  useEffect(() => { if (window.location.hash.startsWith('#module-') && view !== 'programme') navigate(`?vue=programme${window.location.hash}`, { replace: true }); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const board = useMyRank(programme.code, canStudy);
  const [gate, setGate] = useState(null);
  const onLocked = (request) => { if (!prep.loading) setGate(request); };
  const [searching, setSearching] = useState(false);
  const entries = useMemo(() => programmeEntries(data), [data]);
  useContextSearch({ label: 'Rechercher une leçon ou un module', open: () => setSearching(true) });

  const titles = { plan: 'Ton plan du jour', programme: 'Tout le programme', progres: 'Ta progression' };
  const sub = {
    plan: 'Fatafalta choisit pour toi la suite la plus utile, et alterne les matières pour avancer partout.',
    programme: 'Va droit au module qui t’intéresse : chaque leçon et chaque niveau sont accessibles.',
    progres: 'Tes efforts de la semaine et ta maîtrise de chaque matière.',
  };

  return (
    <div className="mx-auto flex w-full max-w-[1400px] gap-10 px-4 sm:px-6 lg:px-8">
      <Rail programme={{ ...programme, organismeLogo: logo }} view={view} onView={onView} canStudy={canStudy} revisions={canStudy ? day.revisions.total : 0} />
      <div className="min-w-0 flex-1 pb-28 pt-6 lg:pb-16 lg:pt-10">
        <header>
          <div className={cx('flex items-center gap-3 lg:hidden', !prep.user && 'hidden')}>
            <OrgMark logo={logo} organismeId={programme.organismeId} sigle={programme.organisme?.sigle || ''} size={32} />
            <p className="min-w-0 truncate text-[14px] font-semibold text-ink-soft">{`${programme.organisme?.sigle || ''} · ${programme.titre}`}</p>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 lg:mt-0">
            {/* Visiteur : le nom du concours (comme la page pré-rendue) ; élève connecté : la vue. */}
            <h1 className="text-title-lg font-bold text-ink">{prep.user ? titles[view] : `${programme.organisme?.sigle ? `${programme.organisme.sigle} · ` : ''}${programme.titre}`}</h1>
            <TrialPill essai={prep.droits?.essai} abonne={prep.droits?.abonne} />
          </div>
          <p className="mt-2 max-w-2xl text-[16px] leading-relaxed text-ink-soft">{sub[view]}</p>
        </header>
        {!prep.loading && !canStudy ? <div className="mt-6"><StudyGate user={prep.user} next={pathname} /></div> : null}
        {canStudy && view !== 'progres' ? <TodayStrip day={day} board={board} programme={programme.code} /> : null}
        <div className="mt-8">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={view} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.22, ease: easeOut }}>
              {view === 'plan' && canStudy ? <PlanView plan={plan} locked={locked} onView={onView} programmeCode={programme.code} /> : null}
              {view === 'plan' && !canStudy ? <AtlasView programme={programme.code} atlas={atlas} canStudy={false} locked={locked} onLocked={onLocked} /> : null}
              {view === 'programme' ? <ConcoursFacts programme={programme} /> : null}
              {view === 'programme' ? <AtlasView programme={programme.code} atlas={atlas} canStudy={canStudy} locked={locked} focusCode={plan.focus?.code} onLocked={onLocked} /> : null}
              {view === 'progres' ? <ProgressView day={day} atlas={atlas} programmeCode={programme.code} board={board} /> : null}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
      {canStudy && view === 'plan' ? <ContextColumn day={day} atlas={atlas} onView={onView} board={board} programme={programme.code} /> : null}
      <TabBar view={view} onView={onView} programme={programme.code} revisions={canStudy ? day.revisions.total : 0} />
      <AccessSheet request={gate} user={prep.user} onClose={() => setGate(null)} />
      <PrepSearch open={searching} onClose={() => setSearching(false)} entries={entries} placeholder="Rechercher une leçon ou un module" />
    </div>
  );
};

export default PrepWorkspace;
