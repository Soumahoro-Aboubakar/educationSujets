import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BookOpen, Check, CircleCheck, CloudOff, GraduationCap, Lock, RotateCcw } from 'lucide-react';
import { Breadcrumbs, Button, Card, Container, EmptyState, SkeletonRows } from '../../components/ui';
import core from '../../prep/shared/prepCore';
import { ExerciseInput } from '../../prep/Exercises';
import { LessonBlock, RichText } from '../../prep/LessonBlocks';
import { awaitResult, enqueue, flush, newKey, prepApi, shareResume } from '../../prep/client';
import usePrepAccount, { useQueueState } from '../../prep/usePrepAccount';
import useSeo from '../../hooks/useSeo';

/*
 * Préparation sur le site (lot 6) : même compte, mêmes contenus publiés, même progression que
 * l'application. Le serveur corrige ; le navigateur n'a jamais les clés des exercices notés.
 */

const SEO = { title: 'Préparation aux concours', description: 'Cours, exercices corrigés et suivi de progression pour préparer les concours, sur le site et sur l’application.', noindex: true };
const pct = (x) => `${Math.round((x || 0) * 100)} %`;

/**
 * Pastille d'état (même code que l'application) : terminé = disque vert + coche ;
 * commencé = anneau bordeaux proportionnel ; pas encore ouvert = cercle neutre.
 */
const StatusMark = ({ state, label, value = 0 }) => {
  if (state === 'done') return <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-white" aria-hidden><Check size={15} strokeWidth={2.8} /></span>;
  if (state === 'progress') {
    const deg = Math.round(Math.max(0.08, value) * 360);
    return (
      <span className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full" style={{ background: `conic-gradient(#6C2838 ${deg}deg, #E4DED2 0deg)` }} aria-hidden>
        <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-white text-xs font-semibold tabular-nums text-burgundy">{label}</span>
      </span>
    );
  }
  return <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-line-strong bg-white text-xs font-semibold tabular-nums text-ink-soft" aria-hidden>{label}</span>;
};

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

/** Accès refusé par le serveur : connexion, ou accès Premium. */
const AccessNote = ({ user }) => (
  <div className="flex flex-col items-start gap-4 rounded-2xl bg-ink p-6 text-white sm:flex-row sm:items-center sm:justify-between">
    <div>
      <p className="font-semibold">{user ? 'Accès Premium requis' : 'Connecte-toi pour étudier'}</p>
      <p className="mt-1 text-sm text-white/70">{user ? 'Ton essai est terminé. L’accès Premium débloque les cours et les exercices sur le site et l’application.' : 'Ta progression est enregistrée sur ton compte et te suit sur l’application.'}</p>
    </div>
    {user ? <Button to="/abonnement" variant="gold">Voir l’accès Premium</Button> : <Button to="/login?next=%2Fpreparation" variant="gold">Se connecter</Button>}
  </div>
);

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

/** Logo de l'organisme, ou son sigle si l'image manque ou ne se charge pas. */
const OrgMark = ({ logo, sigle }) => {
  const [failed, setFailed] = useState(false);
  if (logo && !failed) return <img src={logo} alt="" className="h-9 w-9 shrink-0 rounded-lg object-contain" loading="lazy" onError={() => setFailed(true)} />;
  return <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-paper-dim text-[11px] font-bold uppercase text-ink">{sigle.slice(0, 3)}</span>;
};

// ── /preparation ───────────────────────────────────────────────────────────
export const PrepHomePage = () => {
  useSeo(SEO);
  const prep = usePrepAccount();
  const [catalogue, setCatalogue] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => { prepApi.catalogue().then(setCatalogue).catch(setError); }, []);
  const resume = latestResume(prep.progressions);
  const resumeInfo = useProgrammeInfo(resume?.programme);

  return (
    <Shell>
      <header className="max-w-2xl">
        <h1 className="text-title-lg font-bold text-ink">Préparation aux concours</h1>
        <p className="mt-3 text-[17px] leading-relaxed text-ink-soft">Des cours courts, des exercices corrigés et ta progression, la même sur le site et sur l’application.</p>
      </header>

      {!prep.loading && !prep.user ? <div className="mt-8"><AccessNote user={null} /></div> : null}

      {resume ? (
        <Link to={resumeLink(resume)} className="group mt-8 flex items-center justify-between gap-4 rounded-2xl bg-ink p-6 text-white shadow-soft transition-transform [@media(hover:hover)]:hover:-translate-y-0.5">
          <div className="min-w-0">
            <p className="text-sm text-white/70">Reprendre où tu t’es arrêté</p>
            <p className="mt-1 truncate text-lg font-semibold">{resumeLabel(resume, resumeInfo)}</p>
            <p className="mt-0.5 truncate text-sm text-white/70">{`${resumeInfo?.programme?.titre || resume.programme}${resume.reprise.position != null ? ` · lu à ${pct(resume.reprise.position)}` : ''}`}</p>
          </div>
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gold-light text-ink transition-transform group-hover:translate-x-0.5"><ArrowRight size={18} /></span>
        </Link>
      ) : null}

      <section className="mt-10" aria-labelledby="prep-programmes">
        <h2 id="prep-programmes" className="text-xl font-bold tracking-[-0.02em] text-ink">Choisis ton concours</h2>
        {error ? <Card className="mt-4"><EmptyState title="Connexion impossible" description="La liste des concours n’a pas pu être chargée." onRetry={() => { setError(null); prepApi.catalogue().then(setCatalogue).catch(setError); }} /></Card> : null}
        {!catalogue && !error ? <Card className="mt-4 p-6"><SkeletonRows count={4} /></Card> : null}
        <div className="mt-4 divide-y divide-line overflow-hidden rounded-2xl border border-line bg-white">
          {(catalogue || []).map((org) => (
            <div key={org.sigle} className="grid gap-3 p-5 sm:grid-cols-[200px_1fr]">
              <div className="flex items-center gap-3">
                <OrgMark logo={org.logo} sigle={org.sigle} />
                <p className="font-semibold text-ink">{org.nom || org.sigle}</p>
              </div>
              <ul className="grid gap-1.5">
                {org.cycles.map((c) => {
                  const etat = prep.progressions[c.programme];
                  const started = etat && Object.keys(etat.lecons || {}).length;
                  return (
                    <li key={c.programme}>
                      <Link to={`/preparation/${c.programme}`} className="group flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-paper">
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-ink">{c.nom}</span>
                          <span className="text-sm text-ink-muted">{`${c.modulesPublies} module${c.modulesPublies > 1 ? 's' : ''}${started ? ' · commencé' : ''}`}</span>
                        </span>
                        <ArrowRight size={16} className="shrink-0 text-burgundy transition-transform group-hover:translate-x-0.5" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </section>
      <QueueNote />
    </Shell>
  );
};

// ── /preparation/:programme ───────────────────────────────────────────────
export const PrepProgrammePage = () => {
  const { programme: code } = useParams();
  const prep = usePrepAccount();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => { setData(null); prepApi.programme(code).then(setData).catch(setError); }, [code]);
  useSeo({ ...SEO, title: data?.programme?.titre ? `Préparation · ${data.programme.titre}` : SEO.title });

  if (error) return <Shell><Card><EmptyState title={error?.response?.status === 404 ? 'Programme introuvable' : 'Connexion impossible'} description="Ce programme n’est pas disponible pour le moment." action={<Button to="/preparation" variant="secondary">Tous les concours</Button>} /></Card></Shell>;
  if (!data) return <Loading />;
  const { programme, modules } = data;
  const etat = prep.progressions[code] || core.emptyProgress();
  const canStudy = prep.droits?.accesPreparation;
  const seen = new Set();

  return (
    <Shell crumbs={[{ label: 'Préparation', to: '/preparation' }, { label: programme.titre, to: `/preparation/${code}` }]}>
      <header className="max-w-3xl">
        <h1 className="text-title-lg font-bold text-ink">{programme.titre}</h1>
        <p className="mt-2 text-ink-soft">{`${programme.organisme?.sigle || ''} · ${programme.parcoursType || ''}`}</p>
      </header>
      {!prep.loading && !canStudy ? <div className="mt-8"><AccessNote user={prep.user} /></div> : null}

      <div className="mt-10 grid gap-10">
        {programme.matieres.map((matiere) => (
          <section key={matiere.nom} aria-labelledby={`m-${matiere.nom}`}>
            <h2 id={`m-${matiere.nom}`} className="text-xl font-bold tracking-[-0.02em] text-ink">{matiere.nom}</h2>
            <div className="mt-4 grid gap-4">
              {matiere.modules.filter((ref) => modules[ref.code] && !seen.has(ref.code) && seen.add(ref.code)).map((ref) => {
                const mod = modules[ref.code];
                const done = mod.lecons.filter((l) => etat.lecons?.[l.code]?.terminee).length;
                const valide = (etat.modulesValides || []).includes(ref.code);
                return (
                  <article key={ref.code} id={`module-${ref.code}`} className="scroll-mt-24 rounded-2xl border border-line bg-white p-5 sm:p-6">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="text-lg font-semibold text-ink">{mod.titre}</h3>
                        <p className="mt-1 text-sm text-ink-muted">{`${done} / ${mod.lecons.length} leçons terminées${valide ? ' · module validé' : ''}`}</p>
                      </div>
                      {valide ? <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-800"><CircleCheck size={15} />Module validé</span>
                        : done || mod.lecons.some((l) => etat.lecons?.[l.code]) ? <span className="inline-flex items-center gap-1.5 rounded-full bg-burgundy-wash px-3 py-1 text-sm font-semibold text-burgundy">En cours</span> : null}
                    </div>
                    <ol className="mt-4 grid gap-1 sm:grid-cols-2">
                      {mod.lecons.map((l, i) => {
                        const p = etat.lecons?.[l.code];
                        const lu = p ? Math.max(p.derniere ?? 0, p.position ?? 0) : 0;
                        const state = p?.terminee ? 'done' : p ? 'progress' : 'todo';
                        const content = (
                          <>
                            <StatusMark state={state} label={i + 1} value={lu} />
                            <span className="min-w-0 flex-1 truncate">{l.titre}</span>
                            <span className="sr-only">{state === 'done' ? 'terminée' : state === 'progress' ? `commencée, ${pct(lu)}` : 'pas encore ouverte'}</span>
                            <span className={`shrink-0 text-xs ${state === 'done' ? 'font-semibold text-emerald-800' : state === 'progress' ? 'font-semibold text-burgundy' : 'text-ink-muted'}`}>{state === 'done' ? 'Terminée' : state === 'progress' ? pct(lu) : `${l.duree} min`}</span>
                          </>
                        );
                        return (
                          <li key={l.code}>
                            {canStudy
                              ? <Link to={`/preparation/${code}/${ref.code}/lecon/${l.code}`} className="flex items-center gap-3 rounded-xl px-2 py-2 text-[15px] text-ink transition-colors hover:bg-paper">{content}</Link>
                              : <span className="flex items-center gap-3 px-2 py-2 text-[15px] text-ink-soft">{content}</span>}
                          </li>
                        );
                      })}
                    </ol>
                    <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
                      {[1, 2, 3].map((n) => (
                        <Button key={n} size="sm" variant={n === 1 ? 'primary' : 'secondary'} to={canStudy ? `/preparation/${code}/${ref.code}/niveau/${n}` : undefined} disabled={!canStudy} icon={canStudy ? undefined : Lock}>
                          {`Exercices · niveau ${n}`}
                        </Button>
                      ))}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </div>
      <QueueNote />
    </Shell>
  );
};

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
  const index = mod ? mod.lecons.findIndex((l) => l.code === leconCode) : -1;
  const lecon = index >= 0 ? mod.lecons[index] : null;
  useSeo({ ...SEO, title: lecon ? `${lecon.titre} · Préparation` : SEO.title });

  const etat = prep.progressions[programme];
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

  const finish = () => {
    position.current = 1;
    save(true);
    setFinished(true);
  };

  return (
    <Shell crumbs={[{ label: 'Préparation', to: '/preparation' }, { label: programmeInfo?.programme?.titre || programme, to: `/preparation/${programme}` }, { label: mod.titre, to: `/preparation/${programme}#module-${moduleCode}` }]}>
      <article className="mx-auto max-w-[68ch]">
        <header>
          <p className="text-sm text-ink-muted">{`Leçon ${index + 1} sur ${mod.lecons.length} · ${lecon.duree} min`}</p>
          <h1 className="mt-2 text-title font-bold text-ink">{lecon.titre}</h1>
        </header>
        <div className="mt-8 grid gap-6">
          {lecon.blocs.map((bloc, i) => <LessonBlock key={`${bloc.type}-${i}`} bloc={bloc} index={i} />)} {/* eslint-disable-line react/no-array-index-key */}
        </div>
        <footer className="mt-12 border-t border-line pt-6">
          {finished || etat?.lecons?.[leconCode]?.terminee ? (
            <div className="flex flex-wrap items-center gap-3">
              <p className="mr-auto flex items-center gap-2 font-semibold text-ink"><CircleCheck size={18} className="text-gold-ink" />Leçon terminée</p>
              {next ? <Button onClick={() => navigate(`/preparation/${programme}/${moduleCode}/lecon/${next.code}`)} icon={ArrowRight} iconPosition="end">Leçon suivante</Button>
                : <Button to={`/preparation/${programme}/${moduleCode}/niveau/1`} icon={ArrowRight} iconPosition="end">S’entraîner</Button>}
            </div>
          ) : (
            <Button onClick={finish} icon={Check}>J’ai terminé cette leçon</Button>
          )}
          <QueueNote />
        </footer>
      </article>
    </Shell>
  );
};

// ── /preparation/:programme/:module/niveau/:niveau ────────────────────────
const SESSION_SIZE = 15;

export const PrepSessionPage = () => {
  const { programme, module: moduleCode, niveau: niveauParam } = useParams();
  const niveau = Number(niveauParam) || 1;
  const prep = usePrepAccount();
  const { mod, error } = useModule(moduleCode, prep.user, prep.authLoading);
  const programmeInfo = useProgrammeInfo(programme);
  useSeo({ ...SEO, title: mod ? `${mod.titre} · Exercices` : SEO.title });
  const [sessionId] = useState(() => `web-${programme}-${moduleCode}-${niveau}-${Date.now().toString(36)}`);
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
      <Shell crumbs={[{ label: 'Préparation', to: '/preparation' }, { label: programmeInfo?.programme?.titre || programme, to: `/preparation/${programme}` }, { label: mod.titre, to: `/preparation/${programme}#module-${moduleCode}` }]}>
        <div className="mx-auto max-w-xl text-center">
          <GraduationCap size={36} className="mx-auto text-gold-ink" />
          <h1 className="mt-4 text-title font-bold text-ink">Session terminée</h1>
          <p className="mt-3 text-5xl font-bold tabular-nums tracking-[-0.03em] text-ink">{`${Math.round(pts * 10) / 10} / ${codes.length}`}</p>
          <p className="mt-2 text-ink-soft">{pending ? `Score provisoire · ${pending} réponse${pending > 1 ? 's' : ''} corrigée${pending > 1 ? 's' : ''} au retour de la connexion` : 'Ta progression est enregistrée sur ton compte.'}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button to={`/preparation/${programme}#module-${moduleCode}`} variant="secondary" icon={ArrowLeft}>Retour au module</Button>
            <Button onClick={() => window.location.reload()} icon={RotateCcw}>Nouvelle session</Button>
          </div>
        </div>
      </Shell>
    );
  }

  const r = item.result;
  const corrected = Boolean(r);
  const complete = core.isComplete(exercice, item.value);
  return (
    <Shell crumbs={[{ label: 'Préparation', to: '/preparation' }, { label: programmeInfo?.programme?.titre || programme, to: `/preparation/${programme}` }, { label: mod.titre, to: `/preparation/${programme}#module-${moduleCode}` }]}>
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between text-sm text-ink-muted">
          <span>{`Niveau ${niveau} · question ${i + 1} sur ${codes.length}`}</span>
          {item.essai === 2 && !item.final ? <span className="rounded-full bg-gold-wash px-3 py-1 font-medium text-gold-ink">Seconde chance</span> : null}
        </div>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-line" aria-hidden><div className="h-full origin-left bg-ink transition-transform duration-300 ease-out" style={{ transform: `scaleX(${(i + (item.final ? 1 : 0)) / codes.length})` }} /></div>
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
    </Shell>
  );
};

const Feedback = ({ tone, title, body, children }) => {
  const tones = { good: 'bg-emerald-50 text-emerald-950', bad: 'bg-burgundy-wash text-burgundy', wait: 'bg-gold-wash text-gold-ink' };
  return (
    <div className={`rounded-2xl p-5 ${tones[tone]}`} role="status">
      <p className="font-semibold">{title}</p>
      {body ? <div className="mt-1.5 text-[15px] leading-relaxed text-ink-soft">{typeof body === 'string' ? <RichText md={body} /> : body}</div> : null}
      {children}
    </div>
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

