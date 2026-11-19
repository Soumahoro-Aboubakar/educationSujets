import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BookOpen, Check, CircleCheck, CloudOff, GraduationCap, RotateCcw, Search } from 'lucide-react';
import { Breadcrumbs, Button, Card, Container, EmptyState, SkeletonRows } from '../../components/ui';
import core from '../../prep/shared/prepCore';
import { ExerciseInput } from '../../prep/Exercises';
import { LessonBlock, RichText } from '../../prep/LessonBlocks';
import { awaitResult, enqueue, flush, newKey, prepApi, shareResume } from '../../prep/client';
import usePrepAccount, { useQueueState } from '../../prep/usePrepAccount';
import useSeo from '../../hooks/useSeo';
import { prepHomeSeo, prepPrivateSeo, programmeSeo } from '../../lib/prepSeo';
import PrepWorkspace, { StudyGate } from './PrepWorkspace';
import { Feedback, SessionFrame } from './sessionKit';
import useStudyTime from '../../prep/useStudyTime';
import PrepSearch, { catalogueEntries, programmeEntries } from './PrepSearch';
import { useContextSearch } from '../../lib/contextSearch';
import { LessonMark, LessonVideo, MasteryBar, OrgMark } from '../../prep/ui';
import PlatformDemo from '../../components/site/PlatformDemo';

/*
 * Préparation sur le site (lot 6) : même compte, mêmes contenus publiés, même progression que
 * l'application. Le serveur corrige ; le navigateur n'a jamais les clés des exercices notés.
 */

const SEO = prepPrivateSeo('Préparation aux concours');
const pct = (x) => `${Math.round((x || 0) * 100)} %`;

const Shell = ({ children, crumbs }) => (
  <Container className="py-8 sm:py-12">
    {crumbs ? <div className="mb-6"><Breadcrumbs crumbs={crumbs} /></div> : null}
    {children}
  </Container>
);

const Loading = () => <Shell><Card className="p-6"><SkeletonRows count={5} /></Card></Shell>;

const QueueNote = () => {
  const { pending, storageFull } = useQueueState();
  if (storageFull) return <p className="mt-4 text-sm text-burgundy">Le navigateur refuse d’enregistrer davantage : garde cette page ouverte jusqu’au retour de la connexion.</p>;
  if (!pending || navigator.onLine) return null;
  return <p className="mt-4 flex items-center gap-2 text-sm text-ink-soft"><CloudOff size={15} />{`Hors connexion · ${pending} enregistrement${pending > 1 ? 's' : ''} envoyé${pending > 1 ? 's' : ''} au retour du réseau`}</p>;
};

/** Accès refusé par le serveur : membres (connexion, 7 jours gratuits), ou fin de l'essai. */
const AccessNote = ({ user }) => <StudyGate user={user} next={window.location.pathname} />;

/** Dernière reprise, tous programmes confondus (la plus récente, d'après le serveur). */
const latestResume = (progressions) => Object.entries(progressions || {})
  .map(([programme, etat]) => ({ programme, reprise: etat?.derniereReprise }))
  .filter((x) => x.reprise?.module)
  .sort((a, b) => String(b.reprise.le).localeCompare(String(a.reprise.le)))[0] || null;

/** Programme publié (titres des modules et des leçons), mis en cache pour la session de navigation. */
const programmeCache = new Map();
const useProgrammeInfo = (code) => {
  const [info, setInfo] = useState(() => (code ? programmeCache.get(code) || null : null));
  useEffect(() => {
    if (!code || programmeCache.has(code)) { setInfo(code ? programmeCache.get(code) || null : null); return undefined; }
    let alive = true;
    prepApi.programme(code).then((data) => { programmeCache.set(code, data); if (alive) setInfo(data); }).catch(() => {});
    return () => { alive = false; };
  }, [code]);
  return info;
};

/** Libellé lisible d'une reprise : titres plutôt que codes quand le programme est chargé. */
const resumeLabel = (resume, info) => {
  const mod = info?.modules?.[resume.reprise.module];
  const lecon = mod?.lecons?.find((l) => l.code === resume.reprise.lecon);
  if (resume.reprise.type === 'lecon') return lecon ? `Leçon · ${lecon.titre}` : 'Ta dernière leçon';
  return mod ? `Exercices · ${mod.titre}` : 'Tes derniers exercices';
};

export const resumeLink = ({ programme, reprise }) => (reprise.type === 'lecon' && reprise.lecon
  ? `/preparation/${programme}/${reprise.module}/lecon/${reprise.lecon}`
  : `/preparation/${programme}#module-${reprise.module}`);

// ── /preparation ───────────────────────────────────────────────────────────
export const PrepHomePage = () => {
  const prep = usePrepAccount();
  const [catalogue, setCatalogue] = useState(null);
  const [error, setError] = useState(null);
  // Métadonnées indexables dès que le catalogue est là (identiques au pré-rendu) ; en erreur, titre seul.
  // Erreur réseau : métadonnées du pré-rendu conservées (jamais de noindex sur une panne passagère).
  useSeo(catalogue ? prepHomeSeo(catalogue) : null);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState(null);
  const load = () => { setError(null); prepApi.catalogue().then(setCatalogue).catch(setError); };
  useEffect(load, []);
  const resume = latestResume(prep.progressions);
  const resumeInfo = useProgrammeInfo(resume?.programme);
  const entries = useMemo(() => catalogueEntries(catalogue), [catalogue]);
  useContextSearch({ label: 'Rechercher un concours', open: () => setSearching(true) });

  const orgs = catalogue || [];
  const started = (code) => Object.keys(prep.progressions[code]?.lecons || {}).length;
  const startedCycles = orgs.flatMap((o) => o.cycles.map((c) => ({ ...c, org: o }))).filter((c) => started(c.programme));
  const current = orgs.find((o) => o.sigle === selected) || orgs.find((o) => o.cycles.some((c) => started(c.programme))) || orgs[0];
  const totals = { concours: orgs.reduce((a, o) => a + o.cycles.length, 0), modules: orgs.reduce((a, o) => a + o.cycles.reduce((b, c) => b + (c.modulesPublies || 0), 0), 0) };

  return (
    <div className="mx-auto w-full max-w-site px-4 pb-20 pt-8 sm:px-6 sm:pt-12 lg:px-8">
      {/* En-tête : promesse, recherche, reprise ou accès */}
      <section className="grid grid-cols-[minmax(0,1fr)] items-stretch gap-6 lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-10">
        <div className="flex flex-col justify-center">
          <h1 className="text-display font-bold text-ink">Prépare ton concours, une leçon à la fois.</h1>
          <p className="mt-4 max-w-xl text-[17px] leading-relaxed text-ink-soft">Des cours courts avec leur vidéo, des exercices corrigés, des concours blancs et ta progression, la même sur le site et sur l’application Android.</p>
          <button
            type="button"
            onClick={() => setSearching(true)}
            className="group mt-8 flex h-14 w-full max-w-xl items-center gap-3 rounded-2xl border border-line bg-white px-5 text-left text-[16px] text-ink-muted shadow-soft transition-[border-color,box-shadow] hover:border-line-strong hover:shadow-lift"
          >
            <Search size={19} className="shrink-0 text-ink" />
            <span className="flex-1">Rechercher un concours, un organisme…</span>
            <kbd className="hidden rounded-md border border-line bg-paper px-1.5 py-0.5 text-[12px] font-semibold text-ink-soft sm:block">⌘K</kbd>
          </button>
          {catalogue ? (
            <p className="mt-5 text-[14px] text-ink-soft">
              <span className="font-semibold tabular-nums text-ink">{totals.concours}</span>{' concours · '}
              <span className="font-semibold tabular-nums text-ink">{orgs.length}</span>{' organismes · '}
              <span className="font-semibold tabular-nums text-ink">{totals.modules}</span>{' modules publiés'}
            </p>
          ) : null}
        </div>
        {resume ? (
          <Link to={resumeLink(resume)} className="group relative flex flex-col justify-between overflow-hidden rounded-3xl bg-ink p-7 text-white shadow-lift">
            <span aria-hidden className="absolute -right-12 -top-12 h-48 w-48 rounded-full border border-white/10" />
            <span aria-hidden className="absolute -right-4 -top-4 h-32 w-32 rounded-full border border-white/10" />
            <div className="relative">
              <p className="text-[14px] text-white/65">Reprendre où tu t’es arrêté</p>
              <p className="mt-3 text-[24px] font-bold leading-tight tracking-[-0.02em]">{resumeLabel(resume, resumeInfo).replace(/^Leçon · /, '').replace(/^Exercices · /, 'Exercices · ')}</p>
              <p className="mt-2 text-[14px] text-white/65">{resumeInfo?.programme?.titre || resume.programme}</p>
            </div>
            <div className="relative mt-8 flex items-center justify-between">
              {resume.reprise.position > 0.02 ? <span className="text-[14px] tabular-nums text-white/70">{`Lue à ${pct(resume.reprise.position)}`}</span> : <span className="text-[14px] text-white/70">Ton plan du jour t’attend</span>}
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gold-light text-ink transition-transform duration-300 ease-emphasized group-hover:translate-x-1"><ArrowRight size={19} /></span>
            </div>
          </Link>
        ) : !prep.loading && !prep.user ? (
          <div className="relative overflow-hidden rounded-3xl bg-ink bg-[radial-gradient(ellipse_80%_60%_at_100%_0%,rgba(58,90,148,0.55),transparent_70%),radial-gradient(ellipse_70%_50%_at_0%_100%,rgba(180,138,72,0.14),transparent_70%)] p-5 text-white shadow-lift sm:p-6">
            <PlatformDemo className="relative" />
            <div className="relative mt-5 flex flex-wrap items-center gap-3">
              <Button to={`/register?next=${encodeURIComponent('/preparation')}`} variant="gold">Créer un compte</Button>
              <Button to={`/login?next=${encodeURIComponent('/preparation')}`} variant="ghost" className="text-white hover:bg-white/10">Se connecter</Button>
            </div>
            <p className="relative mt-3 text-[13px] text-white/60">7 jours gratuits, sans abonnement.</p>
          </div>
        ) : (
          <div className="flex flex-col justify-center rounded-3xl border border-line bg-white p-7">
            <GraduationCap size={26} className="text-gold" />
            <p className="mt-4 text-[20px] font-bold tracking-[-0.02em] text-ink">Choisis ton concours</p>
            <p className="mt-2 text-[15px] text-ink-soft">Ton plan du jour se construit dès ta première leçon. Pas sûr de ton niveau ? Le test de niveau saute ce que tu maîtrises déjà.</p>
          </div>
        )}
      </section>

      {/* Concours en cours */}
      {startedCycles.length ? (
        <section className="mt-14" aria-labelledby="prep-encours">
          <h2 id="prep-encours" className="text-[20px] font-bold tracking-[-0.02em] text-ink">Tes préparations</h2>
          <ul className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {startedCycles.map((c) => (
              <li key={c.programme}>
                <Link to={`/preparation/${c.programme}`} className="group flex items-center gap-4 rounded-2xl border border-line bg-white p-4 transition-colors hover:border-ink">
                  <OrgMark logo={c.org.logo} organismeId={c.org.organismeId} sigle={c.org.sigle} size={44} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-semibold text-ink">{c.nom}</span>
                    <span className="block text-[13px] text-ink-soft">{`${c.org.sigle} · ${started(c.programme)} leçon${started(c.programme) > 1 ? 's' : ''} ouverte${started(c.programme) > 1 ? 's' : ''}`}</span>
                  </span>
                  <ArrowRight size={17} className="shrink-0 text-ink-muted transition-transform group-hover:translate-x-0.5 group-hover:text-ink" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Répertoire : organismes à gauche, leurs préparations à droite */}
      <section className="mt-14" aria-labelledby="prep-catalogue">
        <div className="flex items-end justify-between gap-4">
          <h2 id="prep-catalogue" className="text-[20px] font-bold tracking-[-0.02em] text-ink">Tous les concours</h2>
          {catalogue ? <p className="text-[14px] text-ink-soft">{`${orgs.length} organismes`}</p> : null}
        </div>
        {error ? <Card className="mt-4"><EmptyState title="Connexion impossible" description="La liste des concours n’a pas pu être chargée." onRetry={load} /></Card> : null}
        {!catalogue && !error ? <Card className="mt-4 p-6"><SkeletonRows count={5} /></Card> : null}
        {catalogue && current ? (
          <div className="mt-5 grid grid-cols-[minmax(0,1fr)] overflow-hidden rounded-3xl border border-line bg-white lg:grid-cols-[300px_minmax(0,1fr)]">
            <nav className="min-w-0 border-b border-line p-2 lg:border-b-0 lg:border-r" aria-label="Organismes">
              <ul className="flex gap-1 overflow-x-auto lg:block lg:space-y-0.5">
                {orgs.map((o) => {
                  const on = o.sigle === current.sigle;
                  return (
                    <li key={o.sigle} className="shrink-0">
                      <button type="button" onClick={() => setSelected(o.sigle)} aria-current={on ? 'true' : undefined} className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors ${on ? 'bg-paper' : 'hover:bg-paper/70'}`}>
                        <OrgMark logo={o.logo} organismeId={o.organismeId} sigle={o.sigle} size={36} />
                        <span className="min-w-0 flex-1">
                          <span className={`block truncate text-[15px] ${on ? 'font-bold text-ink' : 'font-semibold text-ink'}`}>{o.sigle}</span>
                          <span className="hidden truncate text-[13px] text-ink-soft lg:block">{`${o.cycles.length} préparation${o.cycles.length > 1 ? 's' : ''}`}</span>
                        </span>
                        {on ? <span className="hidden h-1.5 w-1.5 shrink-0 rounded-full bg-gold lg:block" aria-hidden /> : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </nav>
            <div className="p-5 sm:p-8">
              <div className="flex items-center gap-4">
                <OrgMark logo={current.logo} organismeId={current.organismeId} sigle={current.sigle} size={48} />
                <div className="min-w-0">
                  <p className="text-[22px] font-bold tracking-[-0.02em] text-ink">{current.sigle}</p>
                  <p className="truncate text-[14px] text-ink-soft">{current.nom && current.nom !== current.sigle ? current.nom : `${current.cycles.length} préparation${current.cycles.length > 1 ? 's' : ''}`}</p>
                </div>
              </div>
              <ul className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-3">
                {current.cycles.map((c) => {
                  const n = started(c.programme);
                  const ratio = c.modulesTotal ? c.modulesPublies / c.modulesTotal : 1;
                  return (
                    <li key={c.programme}>
                      <Link to={`/preparation/${c.programme}`} className="group grid grid-cols-[minmax(0,1fr)] gap-4 rounded-2xl border border-line p-5 transition-[border-color,box-shadow] hover:border-ink hover:shadow-soft sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                        <span className="min-w-0">
                          <span className="block text-[17px] font-semibold text-ink">{c.nom}</span>
                          <span className="mt-1 block text-[14px] text-ink-soft">{[c.parcoursType, `${c.matieres} matière${c.matieres > 1 ? 's' : ''}`, `${c.modulesPublies} module${c.modulesPublies > 1 ? 's' : ''} publié${c.modulesPublies > 1 ? 's' : ''}`].filter(Boolean).join(' · ')}</span>
                          <span className="mt-3 flex max-w-sm items-center gap-3">
                            <MasteryBar className="flex-1" value={ratio} done={ratio >= 1} label={`Programme publié à ${pct(ratio)}`} />
                            <span className="shrink-0 text-[12px] tabular-nums text-ink-muted">{ratio >= 1 ? 'Programme complet' : `${c.modulesPublies}/${c.modulesTotal} modules`}</span>
                          </span>
                        </span>
                        <span className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-ink px-5 text-[15px] font-semibold text-white transition-transform group-hover:-translate-y-px">
                          {n ? 'Continuer' : 'Commencer'}
                          <ArrowRight size={16} />
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        ) : null}
      </section>
      <QueueNote />
      <PrepSearch open={searching} onClose={() => setSearching(false)} entries={entries} placeholder="Rechercher un concours" />
    </div>
  );
};

// ── /preparation/:programme ───────────────────────────────────────────────
export const PrepProgrammePage = () => {
  const { programme: code } = useParams();
  const prep = usePrepAccount();
  const [data, setData] = useState(() => programmeCache.get(code) || null);
  const [error, setError] = useState(null);
  useEffect(() => {
    let alive = true;
    setError(null);
    if (!programmeCache.has(code)) setData(null);
    prepApi.programme(code).then((d) => { programmeCache.set(code, d); if (alive) setData(d); }).catch((e) => { if (alive) setError(e); });
    return () => { alive = false; };
  }, [code]);
  // Programme inconnu (404) : noindex ; panne passagère : métadonnées du pré-rendu conservées.
  useSeo(data ? programmeSeo(data) : error?.response?.status === 404 ? SEO : null);

  if (error) return <Shell><Card><EmptyState title={error?.response?.status === 404 ? 'Programme introuvable' : 'Connexion impossible'} description="Ce programme n’est pas disponible pour le moment." action={<Button to="/preparation" variant="secondary">Tous les concours</Button>} /></Card></Shell>;
  if (!data) return <WorkspaceSkeleton />;
  return <PrepWorkspace data={data} prep={prep} logo={data.programme.organismeLogo || null} />;
};

/** Squelette de l'espace de travail : même géométrie que la page chargée, sans saut. */
const WorkspaceSkeleton = () => (
  <div className="mx-auto flex w-full max-w-[1400px] gap-10 px-4 sm:px-6 lg:px-8" aria-busy="true" aria-label="Chargement du programme">
    <div className="hidden w-[248px] shrink-0 border-r border-line py-8 pr-6 lg:block"><SkeletonRows count={5} /></div>
    <div className="min-w-0 flex-1 py-10">
      <div className="skeleton h-10 w-2/3 rounded-xl" />
      <div className="skeleton mt-4 h-5 w-1/2 rounded-lg" />
      <div className="skeleton mt-8 h-56 w-full rounded-3xl" />
      <div className="mt-8"><SkeletonRows count={3} /></div>
    </div>
  </div>
);

/**
 * Module servi par l'API (droits vérifiés par le serveur). Sans compte connecté, aucun appel :
 * le site ne crée jamais d'identité de préparation pour un visiteur anonyme.
 */
const useModule = (code, user, authLoading) => {
  const [state, setState] = useState({ mod: null, error: null });
  useEffect(() => {
    let alive = true;
    setState({ mod: null, error: null });
    if (authLoading) return undefined;
    if (!user) { setState({ mod: null, error: { response: { status: 401 } } }); return undefined; }
    // L'identité doit exister avant la lecture protégée : la déclaration est idempotente.
    prepApi.declare().then(() => prepApi.module(code)).then((mod) => { if (alive) setState({ mod, error: null }); })
      .catch((error) => { if (alive) setState({ mod: null, error }); });
    return () => { alive = false; };
  }, [code, user, authLoading]);
  return state;
};

const ModuleError = ({ error, user }) => (
  <Shell>
    {error?.response?.status === 403 || error?.response?.status === 401
      ? <AccessNote user={user} />
      : <Card><EmptyState title="Connexion impossible" description="Ce contenu n’a pas pu être chargé. Vérifie ta connexion puis réessaie." onRetry={() => window.location.reload()} /></Card>}
  </Shell>
);

// ── /preparation/:programme/:module/lecon/:lecon ──────────────────────────
export const PrepLessonPage = () => {
  const { programme, module: moduleCode, lecon: leconCode } = useParams();
  const navigate = useNavigate();
  const prep = usePrepAccount();
  const { mod, error } = useModule(moduleCode, prep.user, prep.authLoading);
  const programmeInfo = useProgrammeInfo(programme);
  const [searching, setSearching] = useState(false);
  const searchEntries = useMemo(() => programmeEntries(programmeInfo), [programmeInfo]);
  useContextSearch({ label: 'Rechercher une leçon ou un module', open: () => setSearching(true) });
  const index = mod ? mod.lecons.findIndex((l) => l.code === leconCode) : -1;
  const lecon = index >= 0 ? mod.lecons[index] : null;
  useSeo(prepPrivateSeo(lecon ? `${lecon.titre} · Préparation` : SEO.title));

  const etat = prep.progressions[programme];
  useStudyTime(programme, Boolean(lecon));
  const position = useRef(0);
  const saved = useRef(0);
  const restored = useRef(false);
  const [finished, setFinished] = useState(false);

  const save = useCallback((terminee = false) => {
    if (!lecon) return;
    saved.current = position.current;
    enqueue({ type: 'lecon', programme, lecon: leconCode, position: Math.round(position.current * 1000) / 1000, terminee });
    if (!terminee) shareResume(programme, { type: 'lecon', module: moduleCode, lecon: leconCode, position: position.current }, etat?.derniereReprise?.version || 0);
    flush();
  }, [lecon, programme, leconCode, moduleCode, etat]);

  // Ouverture (sans terminer), reprise à la dernière position connue, suivi du défilement.
  useEffect(() => {
    if (!lecon || prep.loading || restored.current) return undefined;
    restored.current = true;
    const target = etat?.lecons?.[leconCode]?.derniere ?? etat?.lecons?.[leconCode]?.position ?? 0;
    position.current = target;
    save(false);
    if (target > 0.04 && target < 0.98) {
      requestAnimationFrame(() => {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        window.scrollTo({ top: target * max, behavior: 'auto' });
      });
    }
    return undefined;
  }, [lecon, prep.loading]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!lecon) return undefined;
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      position.current = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 1;
    };
    const timer = setInterval(() => { if (Math.abs(position.current - saved.current) >= 0.05) save(false); }, 5000);
    const onHide = () => { if (document.visibilityState === 'hidden') save(false); };
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('visibilitychange', onHide);
    return () => {
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('visibilitychange', onHide);
      clearInterval(timer);
      if (Math.abs(position.current - saved.current) >= 0.01) save(false);
    };
  }, [lecon, save]);

  if (error) return <ModuleError error={error} user={prep.user} />;
  if (!mod) return <Loading />;
  if (!lecon) return <Shell><Card><EmptyState title="Leçon introuvable" description="Cette leçon a peut-être été déplacée." action={<Button to={`/preparation/${programme}`} variant="secondary">Retour au programme</Button>} /></Card></Shell>;
  const next = mod.lecons[index + 1];
  const done = finished || etat?.lecons?.[leconCode]?.terminee;
  const outline = programmeInfo?.modules?.[moduleCode]?.lecons || mod.lecons;
  const video = outline.find((l) => l.code === leconCode)?.video || null;
  const back = `/preparation/${programme}?vue=programme#module-${moduleCode}`;

  const finish = () => {
    position.current = 1;
    save(true);
    setFinished(true);
  };

  const nextAction = done ? (
    next
      ? <Button className="w-full" onClick={() => navigate(`/preparation/${programme}/${moduleCode}/lecon/${next.code}`)} icon={ArrowRight} iconPosition="end">Leçon suivante</Button>
      : <Button className="w-full" to={`/preparation/${programme}/${moduleCode}/niveau/1`} icon={ArrowRight} iconPosition="end">S’entraîner sur le module</Button>
  ) : <Button className="w-full" onClick={finish} icon={Check}>J’ai terminé cette leçon</Button>;

  return (
    <div className="mx-auto flex w-full max-w-[1400px] gap-10 px-4 sm:px-6 lg:px-8">
      {/* Sommaire du module : se situer, sauter à une autre leçon. */}
      <nav className="sticky top-16 hidden h-[calc(100vh-4rem)] w-[248px] shrink-0 overflow-y-auto border-r border-line py-8 pr-4 lg:block" aria-label="Leçons du module">
        <Link to={back} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-soft transition-colors hover:text-ink"><ArrowLeft size={14} />{programmeInfo?.programme?.titre || 'Programme'}</Link>
        <p className="mt-4 text-[15px] font-bold leading-snug tracking-[-0.01em] text-ink">{mod.titre}</p>
        <ol className="mt-4 grid gap-0.5">
          {outline.map((l, i) => {
            const p = etat?.lecons?.[l.code];
            const current = l.code === leconCode;
            const state = (current && done) || p?.terminee ? 'done' : p ? 'progress' : 'todo';
            return (
              <li key={l.code}>
                <Link
                  to={`/preparation/${programme}/${moduleCode}/lecon/${l.code}`}
                  aria-current={current ? 'page' : undefined}
                  className={`flex items-center gap-2.5 rounded-xl px-2 py-2 text-[14px] leading-snug transition-colors ${current ? 'bg-white font-semibold text-ink shadow-soft ring-1 ring-line' : 'text-ink-soft hover:bg-ink/[0.04] hover:text-ink'}`}
                >
                  <LessonMark state={state} number={i + 1} value={p ? Math.max(p.derniere ?? 0, p.position ?? 0) : 0} size={24} />
                  <span className="min-w-0 flex-1">{l.titre}</span>
                </Link>
              </li>
            );
          })}
        </ol>
      </nav>

      <article className="min-w-0 flex-1 pb-32 pt-8 lg:pb-20 lg:pt-12">
        <div className="mx-auto max-w-[68ch]">
          <Link to={back} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-soft lg:hidden"><ArrowLeft size={14} />{mod.titre}</Link>
          <header className="mt-3 lg:mt-0">
            <p className="text-[14px] tabular-nums text-ink-soft">{`Leçon ${index + 1} sur ${mod.lecons.length} · ${lecon.duree} min de lecture`}</p>
            <h1 className="mt-2 text-title-lg font-bold text-ink">{lecon.titre}</h1>
          </header>
          {video ? <div className="mt-8 xl:hidden"><LessonVideo video={video} /></div> : null}
          <div className="mt-10 grid gap-7 text-[17px] leading-[1.7]">
            {lecon.blocs.map((bloc, i) => <LessonBlock key={`${bloc.type}-${i}`} bloc={bloc} index={i} />)} {/* eslint-disable-line react/no-array-index-key */}
          </div>
          <footer className="mt-14 border-t border-line pt-8">
            {done ? <p className="mb-4 flex items-center gap-2 font-semibold text-ink"><CircleCheck size={18} className="text-gold" />Leçon terminée</p> : null}
            <div className="max-w-sm">{nextAction}</div>
            <QueueNote />
          </footer>
        </div>
      </article>

      {/* Compagnon : vidéo, avancement, action suivante (grands écrans). */}
      <aside className="hidden w-[340px] shrink-0 xl:block" aria-label="Vidéo et suite">
        <div className="sticky top-24 grid gap-5 pt-12">
          {video ? <LessonVideo video={video} compact /> : null}
          <div className="rounded-3xl border border-line bg-white p-5">
            <ReadingMeter position={position} done={done} />
            <div className="mt-5">{nextAction}</div>
            {next && !done ? <p className="mt-3 text-[13px] leading-snug text-ink-soft">{`Ensuite : ${next.titre}`}</p> : null}
          </div>
        </div>
      </aside>

      <PrepSearch open={searching} onClose={() => setSearching(false)} entries={searchEntries} placeholder="Rechercher une leçon ou un module" />
      {/* Mobile : l'action reste à portée de pouce. */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/95 px-4 pb-[calc(12px+env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl xl:hidden">
        <div className="mx-auto max-w-[68ch]">{nextAction}</div>
      </div>
    </div>
  );
};

/** Avancement de lecture, suivi au défilement (même mesure que la reprise). */
const ReadingMeter = ({ position, done }) => {
  const [value, setValue] = useState(position.current);
  useEffect(() => {
    const tick = () => setValue(position.current);
    window.addEventListener('scroll', tick, { passive: true });
    return () => window.removeEventListener('scroll', tick);
  }, [position]);
  const v = done ? 1 : value;
  return (
    <div>
      <div className="flex items-baseline justify-between text-[14px]">
        <span className="font-semibold text-ink">{done ? 'Leçon terminée' : 'Ta lecture'}</span>
        <span className="tabular-nums text-ink-soft">{`${Math.round(v * 100)} %`}</span>
      </div>
      <MasteryBar className="mt-2" value={v} done={done} label="Avancement de la lecture" />
    </div>
  );
};

// ── /preparation/:programme/:module/niveau/:niveau ────────────────────────
const SESSION_SIZE = 15;

export const PrepSessionPage = () => {
  const { programme, module: moduleCode, niveau: niveauParam } = useParams();
  const niveau = Number(niveauParam) || 1;
  const prep = usePrepAccount();
  const { mod, error } = useModule(moduleCode, prep.user, prep.authLoading);
  useSeo(prepPrivateSeo(mod ? `${mod.titre} · Exercices` : SEO.title));
  const [sessionId] = useState(() => `web-${programme}-${moduleCode}-${niveau}-${Date.now().toString(36)}`);
  useStudyTime(programme, Boolean(mod));
  const codes = useMemo(() => (mod ? core.seededShuffle(mod.exercices.filter((ex) => ex.niveau === niveau).map((ex) => ex.code), sessionId).slice(0, SESSION_SIZE) : []), [mod, niveau, sessionId]);
  const [i, setI] = useState(0);
  const [items, setItems] = useState({});
  const [checking, setChecking] = useState(false);
  const [ended, setEnded] = useState(false);
  const heading = useRef(null);

  useEffect(() => {
    if (!mod || !codes.length) return;
    shareResume(programme, { type: 'session', module: moduleCode, session: sessionId, mode: 'niveau', niveau, index: i, total: codes.length }, prep.progressions[programme]?.derniereReprise?.version || 0);
    flush();
  }, [mod, i]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { heading.current?.focus(); }, [i]);

  if (error) return <ModuleError error={error} user={prep.user} />;
  if (!mod) return <Loading />;
  if (!codes.length) return <Shell><Card><EmptyState title="Aucun exercice à ce niveau" description="Choisis un autre niveau." action={<Button to={`/preparation/${programme}#module-${moduleCode}`} variant="secondary">Retour au module</Button>} /></Card></Shell>;

  const exercice = mod.exercices.find((ex) => ex.code === codes[i]);
  const item = items[exercice.code] || { value: null, essai: 1, result: null, final: false };
  const update = (patch) => setItems((all) => ({ ...all, [exercice.code]: { ...item, ...patch } }));

  const verify = async () => {
    setChecking(true);
    const cle = enqueue({ cle: newKey(), type: 'tentative', programme, exercice: exercice.code, reponse: item.value, essai: item.essai, indices: 0, contexte: 'niveau', session: sessionId });
    const r = await awaitResult(cle);
    setChecking(false);
    if (!r) { update({ result: { pending: true }, final: true, points: 0 }); return; }
    if (r.ok === false) { update({ result: { refus: r.message || 'Réponse refusée' }, final: true, points: 0 }); return; }
    const final = r.correct || item.essai === 2;
    update({ result: r, final, points: final ? r.points || 0 : 0 });
  };

  const finish = () => {
    enqueue({ type: 'session', programme, module: moduleCode, niveau, session: sessionId, nbQuestions: codes.length });
    flush().then(() => prep.reload());
    setEnded(true);
  };

  if (ended) {
    const list = codes.map((c) => items[c]).filter(Boolean);
    const pending = list.filter((it) => it.result?.pending).length;
    const pts = list.reduce((a, it) => a + (it.points || 0), 0);
    return (
      <SessionFrame back={`/preparation/${programme}?vue=programme#module-${moduleCode}`} title={mod.titre} done={codes.length} total={codes.length}>
        <div className="mx-auto max-w-xl pt-6 text-center">
          <GraduationCap size={36} className="mx-auto text-gold-ink" />
          <h1 className="mt-4 text-title font-bold text-ink">Session terminée</h1>
          <p className="mt-3 text-5xl font-bold tabular-nums tracking-[-0.03em] text-ink">{`${Math.round(pts * 10) / 10} / ${codes.length}`}</p>
          <p className="mt-2 text-ink-soft">{pending ? `Score provisoire · ${pending} réponse${pending > 1 ? 's' : ''} corrigée${pending > 1 ? 's' : ''} au retour de la connexion` : 'Ta progression est enregistrée sur ton compte.'}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button to={`/preparation/${programme}?vue=programme#module-${moduleCode}`} variant="secondary" icon={ArrowLeft}>Retour au module</Button>
            <Button onClick={() => window.location.reload()} icon={RotateCcw}>Nouvelle session</Button>
          </div>
        </div>
      </SessionFrame>
    );
  }

  const r = item.result;
  const corrected = Boolean(r);
  const complete = core.isComplete(exercice, item.value);
  return (
    <SessionFrame back={`/preparation/${programme}?vue=programme#module-${moduleCode}`} title={`${mod.titre} · niveau ${niveau}`} done={i + (item.final ? 1 : 0)} total={codes.length} items={codes.map((c) => items[c])}>
      <div className="rounded-3xl border border-line bg-white p-6 sm:p-10">
        <div className="flex items-center justify-between gap-3 text-[14px] text-ink-soft">
          <span className="tabular-nums">{`Question ${i + 1} sur ${codes.length}`}</span>
          {item.essai === 2 && !item.final ? <span className="rounded-full bg-gold-wash px-3 py-1 text-[13px] font-semibold text-gold-ink">Seconde chance</span> : null}
        </div>
        <h1 ref={heading} tabIndex={-1} className="mt-6 text-[22px] font-semibold leading-snug text-ink focus:outline-none">{exercice.consigne}</h1>
        <div className="mt-6">
          <ExerciseInput
            exercice={exercice}
            value={item.value}
            onChange={(value) => update({ value })}
            disabled={checking || item.final || (corrected && !r.pending && !r.refus && !item.final)}
            correction={item.final && r?.correction ? r.correction : null}
            seed={`${sessionId}:${exercice.code}:${item.essai}`}
          />
        </div>

        <div className="mt-8" aria-live="polite">
          {!corrected ? (
            <Button onClick={verify} loading={checking} disabled={!complete || checking} size="lg">Vérifier</Button>
          ) : r.pending ? (
            <Feedback tone="wait" title="Réponse enregistrée" body="Pas de connexion pour la corriger maintenant. Elle sera corrigée dès le retour du réseau et comptera dans ta progression." />
          ) : r.refus ? (
            <Feedback tone="bad" title="Réponse non prise en compte" body={r.refus} />
          ) : r.correct ? (
            <Feedback tone="good" title={item.essai === 1 ? 'Bien joué' : 'Bien rattrapé'} body={r.correction?.explication} />
          ) : item.final ? (
            <Feedback tone="bad" title="La bonne réponse" body={r.correction?.explication} />
          ) : (
            <Feedback tone="bad" title="Pas tout à fait" body={r.miniCours ? <><strong className="font-semibold text-ink">{r.miniCours.titre}</strong> — <RichText md={r.miniCours.corps} />{r.miniCours.aRetenir ? <span className="mt-1 block">{r.miniCours.aRetenir}</span> : null}</> : 'Relis la consigne, puis tente ta seconde chance.'}>
              <Button size="sm" className="mt-4" onClick={() => update({ essai: 2, value: null, result: null })}>Réessayer</Button>
            </Feedback>
          )}
          {corrected && item.final ? (
            <Button className="mt-4" icon={ArrowRight} iconPosition="end" onClick={() => (i + 1 >= codes.length ? finish() : setI(i + 1))}>{i + 1 >= codes.length ? 'Voir mon bilan' : 'Question suivante'}</Button>
          ) : null}
        </div>
        <QueueNote />
      </div>
    </SessionFrame>
  );
};

/** Carte « Reprendre » du compte (/compte) : même reprise que l'application. */
export const AccountPrepResume = () => {
  const prep = usePrepAccount();
  const resume = latestResume(prep.progressions);
  const info = useProgrammeInfo(resume?.programme);
  if (prep.loading) return null;
  return (
    <Card className="mt-4 flex flex-col items-start justify-between gap-4 p-5 sm:flex-row sm:items-center">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-paper-dim"><BookOpen size={17} className="text-ink" /></span>
        <div>
          <p className="font-semibold text-ink">Préparation aux concours</p>
          <p className="text-sm text-ink-soft">{resume ? `Reprendre · ${resumeLabel(resume, info).replace(/^Leçon · /, '').replace(/^Exercices · /, 'exercices de ')}` : 'Cours et exercices, la même progression sur le site et l’application.'}</p>
        </div>
      </div>
      <Button to={resume ? resumeLink(resume) : '/preparation'} variant="secondary" size="sm" icon={ArrowRight} iconPosition="end">{resume ? 'Reprendre' : 'Commencer'}</Button>
    </Card>
  );
};

