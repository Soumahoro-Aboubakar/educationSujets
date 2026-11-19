import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Award, Check, Clock, Compass, Medal, RotateCcw, Timer, Trophy, X } from 'lucide-react';
import { Button, Card, EmptyState, SkeletonRows, cx } from '../../components/ui';
import core from '../../prep/shared/prepCore';
import { ExerciseInput } from '../../prep/Exercises';
import { RichText } from '../../prep/LessonBlocks';
import { awaitResult, enqueue, flush, newKey, prepApi, todayKey } from '../../prep/client';
import usePrepAccount from '../../prep/usePrepAccount';
import { orderedModules, savePlacement } from '../../prep/plan';
import { MasteryBar, pct } from '../../prep/ui';
import useSeo from '../../hooks/useSeo';
import { prepPrivateSeo } from '../../lib/prepSeo';
import useStudyTime from '../../prep/useStudyTime';
import { StudyGate } from './PrepWorkspace';
import { Feedback, SessionFrame } from './sessionKit';

/*
 * Sessions transversales d'un programme : révisions, concours blanc, test de niveau, et classement.
 * Mêmes règles que l'application : le serveur corrige (contextes « revision », « blanc », « test »),
 * le concours blanc n'est corrigé qu'à la remise et noté par le serveur.
 */

const programmeCache = new Map();
const moduleCache = new Map();

/** Programme publié et modules servis (droits vérifiés par le serveur), chargés à la demande. */
const useProgramme = (code) => {
  const [data, setData] = useState(() => programmeCache.get(code) || null);
  const [error, setError] = useState(null);
  useEffect(() => {
    let alive = true;
    prepApi.programme(code).then((d) => { programmeCache.set(code, d); if (alive) setData(d); }).catch((e) => { if (alive) setError(e); });
    return () => { alive = false; };
  }, [code]);
  return { data, error };
};

const useModules = (codes, enabled) => {
  const key = codes.join(',');
  const [state, setState] = useState({ modules: null, error: null });
  useEffect(() => {
    if (!enabled || !codes.length) return undefined;
    let alive = true;
    setState({ modules: null, error: null });
    (async () => {
      await prepApi.declare();
      const list = await Promise.all(codes.map(async (c) => {
        if (!moduleCache.has(c)) moduleCache.set(c, await prepApi.module(c));
        return moduleCache.get(c);
      }));
      return new Map(list.map((m) => [m.code, m]));
    })().then((modules) => { if (alive) setState({ modules, error: null }); })
      .catch((error) => { if (alive) setState({ modules: null, error }); });
    return () => { alive = false; };
  }, [key, enabled]); // eslint-disable-line react-hooks/exhaustive-deps
  return state;
};

/** Module d'un exercice : son code commence par celui du module (MATH-LNEXP-E01 → MATH-LNEXP). */
const moduleOf = (exercice, moduleCodes) => moduleCodes.filter((c) => exercice.startsWith(`${c}-`)).sort((a, b) => b.length - a.length)[0] || null;
const findExercise = (modules, code) => {
  for (const mod of modules.values()) {
    const ex = (mod.exercices || []).find((e) => e.code === code);
    if (ex) return { exercice: ex, module: mod };
  }
  return null;
};

/** Sélection répartie sur tout le programme, déterministe (même règle que l'application). */
const pickAcross = (modules, { nombre, mode, graine }) => {
  const pools = [...modules.values()].map((m) => core.seededShuffle((m.exercices || []).filter((ex) => (mode === 'blanc' ? ex.niveau >= 2 : true)), `${graine}:${m.code}`));
  // Tour par tour : une question par module, puis une deuxième, etc.
  const picked = [];
  const longest = Math.max(0, ...pools.map((p) => p.length));
  for (let round = 0; round < longest && picked.length < nombre; round += 1) {
    for (const pool of pools) {
      if (picked.length < nombre && pool[round]) picked.push(pool[round].code);
    }
  }
  return core.seededShuffle(picked, `${graine}:ordre`);
};

const Centered = ({ children }) => <div className="mx-auto w-full max-w-[760px] px-4 py-10 sm:px-6 sm:py-14">{children}</div>;
const Loading = () => <Centered><Card className="p-6"><SkeletonRows count={4} /></Card></Centered>;

/** Garde : compte obligatoire et droits d'étude (le serveur reste seul juge). */
const useGate = (prep, next) => {
  if (prep.loading) return <Loading />;
  if (!prep.user || !prep.droits?.accesPreparation) return <Centered><StudyGate user={prep.user} next={next} /></Centered>;
  return null;
};

// ── Moteur de session ───────────────────────────────────────────────────────
const emptyItem = () => ({ value: null, essai: 1, result: null, final: false, points: 0 });

const Countdown = ({ endsAt, onEnd }) => {
  const [now, setNow] = useState(Date.now());
  const ended = useRef(false);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const left = Math.max(0, endsAt - now);
  useEffect(() => { if (!left && !ended.current) { ended.current = true; onEnd(); } }, [left, onEnd]);
  const m = Math.floor(left / 60000);
  const s = Math.floor((left % 60000) / 1000);
  return (
    <span className={cx('flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[14px] font-semibold tabular-nums', left < 120000 ? 'bg-burgundy-wash text-burgundy' : 'bg-white text-ink ring-1 ring-line')} aria-live={left < 60000 ? 'polite' : 'off'}>
      <Timer size={15} aria-hidden />
      {`${m}:${String(s).padStart(2, '0')}`}
    </span>
  );
};

/**
 * Déroulé d'une session sur une liste d'exercices de plusieurs modules.
 * - revision : deux essais, correction immédiate (comme un niveau) ;
 * - test : un essai par question, pas de correction pendant le test ;
 * - blanc : réponses libres, navigation entre questions, chronomètre, correction à la remise.
 */
const SessionRunner = ({ programme, mode, codes, modules, back, title, dureeMinutes, onFinish }) => {
  const [sessionId] = useState(() => `web-${mode}-${programme}-${Date.now().toString(36)}`);
  useStudyTime(programme);
  const [i, setI] = useState(0);
  const [items, setItems] = useState({});
  const [checking, setChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [endsAt] = useState(() => (mode === 'blanc' ? Date.now() + dureeMinutes * 60000 : null));
  const startedAt = useRef(Date.now());
  const heading = useRef(null);
  useEffect(() => { heading.current?.focus(); }, [i]);

  const code = codes[i];
  const found = findExercise(modules, code);
  const item = items[code] || emptyItem();
  const update = (patch) => setItems((all) => ({ ...all, [code]: { ...(all[code] || emptyItem()), ...patch } }));

  const submitMock = async (all = items) => {
    if (submitting) return;
    setSubmitting(true);
    const keys = codes.map((c) => {
      const it = all[c];
      const f = findExercise(modules, c);
      if (!it?.value || !f) return [c, null];
      return [c, enqueue({ cle: newKey(), type: 'tentative', programme, exercice: c, module: f.module.code, reponse: it.value, essai: 1, indices: 0, contexte: 'blanc', session: sessionId })];
    });
    const duree = Math.round((Date.now() - startedAt.current) / 60000);
    const blancKey = enqueue({ cle: newKey(), type: 'blanc', programme, session: sessionId, nbQuestions: codes.length, duree });
    // Attentes enregistrées avant l'envoi : réponses et note arrivent dans le même lot.
    const pendingResults = Promise.all(keys.map(([c, k]) => (k ? awaitResult(k, 15000).then((r) => [c, r]) : [c, null])));
    const pendingNote = awaitResult(blancKey, 15000);
    flush();
    const [results, blanc] = await Promise.all([pendingResults, pendingNote]);
    const final = Object.fromEntries(results.map(([c, r]) => [c, { ...(all[c] || emptyItem()), result: r ? (r.ok === false ? { refus: true } : r) : (all[c]?.value ? { pending: true } : null), final: true }]));
    onFinish({ items: final, codes, note: blanc?.note ?? null, pending: results.some(([c, r]) => !r && all[c]?.value) });
  };

  const verify = async () => {
    setChecking(true);
    const contexte = mode === 'test' ? 'test' : 'revision';
    const cle = enqueue({ cle: newKey(), type: 'tentative', programme, exercice: code, module: found.module.code, reponse: item.value, essai: item.essai, indices: 0, contexte, session: sessionId });
    const r = await awaitResult(cle);
    setChecking(false);
    if (!r) { update({ result: { pending: true }, final: true }); return; }
    if (r.ok === false) { update({ result: { refus: r.message || 'Réponse refusée' }, final: true }); return; }
    const final = mode === 'test' || r.correct || item.essai === 2;
    update({ result: r, final, points: final ? r.points || 0 : 0 });
  };

  const next = () => {
    if (i + 1 < codes.length) { setI(i + 1); return; }
    onFinish({ items, codes });
  };

  if (!found) return <SessionFrame back={back} title={title} done={i} total={codes.length}><Card><EmptyState title="Exercice indisponible" description="Il a peut-être été retiré du programme." action={<Button onClick={next}>Question suivante</Button>} /></Card></SessionFrame>;
  const { exercice } = found;
  const r = item.result;
  const complete = core.isComplete(exercice, item.value);
  const answered = codes.filter((c) => items[c]?.value).length;

  return (
    <SessionFrame
      back={back}
      title={title}
      done={mode === 'blanc' ? answered : i + (item.final ? 1 : 0)}
      total={codes.length}
      items={mode === 'blanc' ? codes.map((c) => (items[c]?.value ? { final: true, result: { pending: true } } : null)) : codes.map((c) => items[c])}
      right={mode === 'blanc' ? <Countdown endsAt={endsAt} onEnd={() => submitMock()} /> : null}
    >
      <div className="rounded-3xl border border-line bg-white p-6 sm:p-10">
        <div className="flex items-center justify-between gap-3 text-[14px] text-ink-soft">
          <span className="tabular-nums">{`Question ${i + 1} sur ${codes.length}`}</span>
          <span className="truncate">{found.module.titre}</span>
        </div>
        <h1 ref={heading} tabIndex={-1} className="mt-6 text-[22px] font-semibold leading-snug text-ink focus:outline-none">{exercice.consigne}</h1>
        <div className="mt-6">
          <ExerciseInput
            exercice={exercice}
            value={item.value}
            onChange={(value) => update({ value })}
            disabled={checking || submitting || (mode !== 'blanc' && (item.final || Boolean(r)))}
            correction={mode === 'revision' && item.final && r?.correction ? r.correction : null}
            seed={`${sessionId}:${code}:${item.essai}`}
          />
        </div>

        <div className="mt-8" aria-live="polite">
          {mode === 'blanc' ? (
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="secondary" icon={ArrowLeft} disabled={i === 0} onClick={() => setI(i - 1)}>Précédente</Button>
              {i + 1 < codes.length
                ? <Button icon={ArrowRight} iconPosition="end" onClick={() => setI(i + 1)}>{item.value ? 'Suivante' : 'Passer'}</Button>
                : <Button icon={Check} loading={submitting} onClick={() => submitMock()}>Remettre ma copie</Button>}
              <span className="text-[13px] tabular-nums text-ink-soft">{`${answered}/${codes.length} répondues`}</span>
            </div>
          ) : !r ? (
            <Button onClick={verify} loading={checking} disabled={!complete || checking} size="lg">{mode === 'test' ? 'Valider' : 'Vérifier'}</Button>
          ) : mode === 'test' ? (
            <Feedback tone="wait" title="Réponse enregistrée" body="Le bilan te dira par où commencer dans chaque matière." />
          ) : r.pending ? (
            <Feedback tone="wait" title="Réponse enregistrée" body="Pas de connexion pour la corriger maintenant. Elle sera corrigée dès le retour du réseau." />
          ) : r.refus ? (
            <Feedback tone="bad" title="Réponse non prise en compte" body={r.refus} />
          ) : r.correct ? (
            <Feedback tone="good" title={item.essai === 1 ? 'Bien joué, erreur corrigée' : 'Bien rattrapé'} body={r.correction?.explication} />
          ) : item.final ? (
            <Feedback tone="bad" title="La bonne réponse" body={r.correction?.explication} />
          ) : (
            <Feedback tone="bad" title="Pas tout à fait" body={r.miniCours ? <><strong className="font-semibold text-ink">{r.miniCours.titre}</strong> — <RichText md={r.miniCours.corps} /></> : 'Relis la consigne, puis tente ta seconde chance.'}>
              <Button size="sm" className="mt-4" onClick={() => update({ essai: 2, value: null, result: null })}>Réessayer</Button>
            </Feedback>
          )}
          {mode !== 'blanc' && r && item.final ? (
            <Button className="mt-4" icon={ArrowRight} iconPosition="end" onClick={next}>{i + 1 >= codes.length ? 'Voir mon bilan' : 'Question suivante'}</Button>
          ) : null}
        </div>
      </div>
    </SessionFrame>
  );
};

// ── Révisions et cahier d'erreurs ───────────────────────────────────────────
export const PrepReviewsPage = () => {
  const { programme } = useParams();
  useSeo(prepPrivateSeo('Révisions · Préparation'));
  const prep = usePrepAccount();
  const { data } = useProgramme(programme);
  const [tab, setTab] = useState('jour');
  const [matiere, setMatiere] = useState('Toutes');
  const [run, setRun] = useState(null);
  const [done, setDone] = useState(null);
  const back = `/preparation/${programme}`;
  const etat = prep.progressions[programme] || core.emptyProgress();
  const today = todayKey();
  const moduleCodes = useMemo(() => orderedModules(data).map((m) => m.code), [data]);
  const matiereOf = useMemo(() => new Map(orderedModules(data).map((m) => [m.code, m])), [data]);
  const due = core.dueReviews(etat, today, 20);
  const erreurs = Object.entries(etat.erreurs || {}).map(([code, e]) => ({ code, ...e, module: e.module || moduleOf(code, moduleCodes) }));
  const matieres = ['Toutes', ...new Set(erreurs.map((e) => matiereOf.get(e.module)?.matiere).filter(Boolean))];
  const filtered = erreurs.filter((e) => matiere === 'Toutes' || matiereOf.get(e.module)?.matiere === matiere);
  const runModules = useMemo(() => (run ? [...new Set(run.map((c) => moduleOf(c, moduleCodes)).filter(Boolean))] : []), [run, moduleCodes]);
  const { modules, error } = useModules(runModules, Boolean(run));

  const gate = useGate(prep, `/preparation/${programme}/revisions`);
  if (gate) return gate;
  if (!data) return <Loading />;

  if (done) {
    const list = done.codes.map((c) => done.items[c]).filter(Boolean);
    const corrigees = list.filter((it) => it.result?.correct).length;
    return (
      <Centered>
        <div className="text-center">
          <Award size={34} className="mx-auto text-gold" />
          <h1 className="mt-4 text-title font-bold text-ink">Révisions terminées</h1>
          <p className="mt-3 text-[17px] text-ink-soft">{`${corrigees} erreur${corrigees > 1 ? 's' : ''} corrigée${corrigees > 1 ? 's' : ''} sur ${list.length}. Une erreur réussie deux jours de suite quitte le cahier.`}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button to={back} variant="secondary" icon={ArrowLeft}>Mon plan</Button>
            <Button onClick={() => { setDone(null); setRun(null); prep.reload(); }} icon={RotateCcw}>Revenir aux révisions</Button>
          </div>
        </div>
      </Centered>
    );
  }
  if (run) {
    if (error) return <Centered><Card><EmptyState title="Connexion impossible" description="Les exercices n’ont pas pu être chargés." onRetry={() => window.location.reload()} /></Card></Centered>;
    if (!modules) return <Loading />;
    return <SessionRunner programme={programme} mode="revision" codes={run} modules={modules} back={back} title="Révisions" onFinish={(res) => { setDone(res); flush().then(() => prep.reload()); }} />;
  }

  const start = (codes) => setRun(core.seededShuffle(codes, `${today}:${codes.length}`));
  return (
    <Centered>
      <Link to={back} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-soft hover:text-ink"><ArrowLeft size={14} />{data.programme.titre}</Link>
      <h1 className="mt-4 text-title-lg font-bold text-ink">Révisions</h1>
      <p className="mt-2 max-w-prose text-[16px] leading-relaxed text-ink-soft">Tes erreurs reviennent au bon moment : d’abord le lendemain, puis de plus en plus espacées, jusqu’à ce qu’elles soient acquises.</p>
      <div className="mt-8 inline-flex rounded-full border border-line bg-white p-1" role="tablist">
        {[['jour', `Aujourd’hui · ${due.total}`], ['cahier', `Cahier d’erreurs · ${erreurs.length}`]].map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={cx('h-10 rounded-full px-4 text-[14px] font-semibold transition-colors', tab === id ? 'bg-ink text-white' : 'text-ink-soft hover:text-ink')}>{label}</button>
        ))}
      </div>

      {tab === 'jour' ? (
        <section className="mt-6 rounded-3xl border border-line bg-white p-6 sm:p-8">
          {due.total ? (
            <>
              <p className="text-[22px] font-bold tracking-[-0.02em] text-ink">{`${due.codes.length} question${due.codes.length > 1 ? 's' : ''} à revoir aujourd’hui`}</p>
              <p className="mt-2 text-[15px] text-ink-soft">{[
                due.revisionsDues ? `${due.revisionsDues} révision${due.revisionsDues > 1 ? 's' : ''} programmée${due.revisionsDues > 1 ? 's' : ''}` : null,
                due.erreurs ? `${due.erreurs} erreur${due.erreurs > 1 ? 's' : ''} dans ton cahier` : null,
                `environ ${Math.max(2, Math.round(due.codes.length * 0.7))} min`,
              ].filter(Boolean).join(' · ')}</p>
              <Button className="mt-6" size="lg" icon={RotateCcw} onClick={() => start(due.codes)}>Commencer les révisions</Button>
            </>
          ) : (
            <>
              <p className="text-[22px] font-bold tracking-[-0.02em] text-ink">Rien à revoir aujourd’hui</p>
              <p className="mt-2 text-[15px] text-ink-soft">Tes erreurs reviendront ici au bon moment. En attendant, avance dans ton plan.</p>
              <Button className="mt-6" variant="secondary" to={back} icon={ArrowRight} iconPosition="end">Mon plan du jour</Button>
            </>
          )}
        </section>
      ) : (
        <section className="mt-6">
          {erreurs.length ? (
            <>
              <div className="flex flex-wrap gap-2">
                {matieres.map((m) => (
                  <button key={m} type="button" onClick={() => setMatiere(m)} aria-pressed={matiere === m} className={cx('h-9 rounded-full border px-3.5 text-[13px] font-semibold transition-colors', matiere === m ? 'border-ink bg-ink text-white' : 'border-line bg-white text-ink-soft hover:border-ink hover:text-ink')}>{m}</button>
                ))}
              </div>
              <ul className="mt-4 divide-y divide-line rounded-3xl border border-line bg-white">
                {filtered.map((e) => {
                  const mod = matiereOf.get(e.module);
                  return (
                    <li key={e.code} className="flex items-center gap-4 px-5 py-4">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-burgundy-wash text-[13px] font-bold tabular-nums text-burgundy" aria-label={`${e.rates || 1} échec${(e.rates || 1) > 1 ? 's' : ''}`}>{e.rates || 1}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-semibold text-ink">{mod?.titre || e.module || 'Exercice'}</span>
                        <span className="block text-[13px] text-ink-soft">{`${mod?.matiere || ''}${e.derniereTentative ? ` · dernière tentative le ${new Date(`${e.derniereTentative}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}` : ''}`}</span>
                      </span>
                      {e.reussites ? <span className="text-[12px] font-semibold text-gold-ink">{`${e.reussites}/2 réussites`}</span> : null}
                    </li>
                  );
                })}
              </ul>
              <Button className="mt-6" icon={RotateCcw} onClick={() => start(filtered.map((e) => e.code).slice(0, 20))}>{`Réviser ${Math.min(20, filtered.length)} erreur${filtered.length > 1 ? 's' : ''}`}</Button>
            </>
          ) : (
            <div className="rounded-3xl border border-line bg-white p-8">
              <p className="text-[20px] font-bold tracking-[-0.02em] text-ink">Ton cahier d’erreurs est vide</p>
              <p className="mt-2 text-[15px] text-ink-soft">Chaque exercice raté y est rangé automatiquement, avec sa matière, pour que tu le revoies au bon moment.</p>
            </div>
          )}
        </section>
      )}
    </Centered>
  );
};

// ── Concours blanc ──────────────────────────────────────────────────────────
export const PrepMockPage = () => {
  const { programme } = useParams();
  useSeo(prepPrivateSeo('Concours blanc · Préparation'));
  const prep = usePrepAccount();
  const { data } = useProgramme(programme);
  const [started, setStarted] = useState(false);
  const [result, setResult] = useState(null);
  const back = `/preparation/${programme}`;
  const moduleCodes = useMemo(() => orderedModules(data).map((m) => m.code), [data]);
  const { modules, error } = useModules(moduleCodes, started);
  const [graine] = useState(() => `blanc:${programme}:${Date.now().toString(36)}`);
  const conf = data?.programme?.concoursBlanc || { nbQuestions: 20, dureeMinutes: 30 };
  const codes = useMemo(() => (modules ? pickAcross(modules, { nombre: conf.nbQuestions, mode: 'blanc', graine }) : []), [modules, conf.nbQuestions, graine]);
  const etat = prep.progressions[programme] || core.emptyProgress();

  const gate = useGate(prep, `/preparation/${programme}/concours-blanc`);
  if (gate) return gate;
  if (!data) return <Loading />;

  if (result) {
    const list = result.codes.map((c) => result.items[c]);
    const justes = list.filter((it) => it?.result?.correct).length;
    const note = result.note ?? Math.round((20 * justes) / Math.max(1, list.length) * 10) / 10;
    return (
      <Centered>
        <div className="rounded-3xl bg-ink p-8 text-center text-white sm:p-12">
          <Medal size={34} className="mx-auto text-gold-light" />
          <p className="mt-4 text-[15px] text-white/70">Copie remise · concours blanc</p>
          <p className="mt-2 text-[64px] font-bold leading-none tabular-nums tracking-[-0.04em]">{String(note).replace('.', ',')}<span className="text-[28px] text-white/60"> / 20</span></p>
          <p className="mt-3 text-[15px] text-white/75">{`${justes} bonne${justes > 1 ? 's' : ''} réponse${justes > 1 ? 's' : ''} sur ${list.length}${result.note == null ? ' · note provisoire, corrigée au retour du réseau' : ''}`}</p>
        </div>
        <h2 className="mt-10 text-[20px] font-bold tracking-[-0.02em] text-ink">Ta copie corrigée</h2>
        <ol className="mt-3 divide-y divide-line rounded-3xl border border-line bg-white">
          {result.codes.map((c, k) => {
            const it = result.items[c];
            const f = findExercise(modules, c);
            const ok = it?.result?.correct;
            return (
              <li key={c} className="flex items-start gap-4 px-5 py-4">
                <span className={cx('mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full', ok ? 'bg-gold text-white' : 'bg-burgundy-wash text-burgundy')} aria-label={ok ? 'Juste' : 'À revoir'}>{ok ? <Check size={14} strokeWidth={3} /> : <X size={14} strokeWidth={3} />}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] tabular-nums text-ink-muted">{`Question ${k + 1} · ${f?.module.titre || ''}`}</span>
                  <span className="mt-0.5 block text-[15px] text-ink">{f?.exercice.consigne}</span>
                  {!ok && it?.result?.correction?.explication ? <span className="mt-2 block text-[14px] leading-relaxed text-ink-soft"><RichText md={it.result.correction.explication} /></span> : null}
                  {!it?.value ? <span className="mt-1 block text-[13px] text-ink-muted">Sans réponse</span> : null}
                </span>
              </li>
            );
          })}
        </ol>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button to={back} variant="secondary" icon={ArrowLeft}>Mon plan</Button>
          <Button to={`/preparation/${programme}/revisions`} icon={RotateCcw}>Revoir mes erreurs</Button>
        </div>
      </Centered>
    );
  }

  if (started) {
    if (error) return <Centered><Card><EmptyState title="Connexion impossible" description="Les sujets n’ont pas pu être chargés." onRetry={() => window.location.reload()} /></Card></Centered>;
    if (!modules || !codes.length) return <Loading />;
    return <SessionRunner programme={programme} mode="blanc" codes={codes} modules={modules} back={back} title="Concours blanc" dureeMinutes={conf.dureeMinutes} onFinish={(r) => { setResult(r); prep.reload(); }} />;
  }

  const blancs = (etat.blancs || []).slice(-5).reverse();
  return (
    <Centered>
      <Link to={back} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-soft hover:text-ink"><ArrowLeft size={14} />{data.programme.titre}</Link>
      <h1 className="mt-4 text-title-lg font-bold text-ink">Concours blanc</h1>
      <p className="mt-2 max-w-prose text-[16px] leading-relaxed text-ink-soft">Les conditions de l’épreuve : un temps limité, des questions de tout le programme, aucune correction avant la fin. Ta note compte dans le classement.</p>
      <dl className="mt-8 grid grid-cols-3 gap-px overflow-hidden rounded-3xl border border-line bg-line">
        {[['Questions', conf.nbQuestions], ['Durée', `${conf.dureeMinutes} min`], ['Matières', data.programme.matieres.length]].map(([k, v]) => (
          <div key={k} className="bg-white px-5 py-5"><dt className="text-[13px] text-ink-soft">{k}</dt><dd className="mt-1 text-[24px] font-bold tabular-nums tracking-[-0.02em] text-ink">{v}</dd></div>
        ))}
      </dl>
      <ul className="mt-6 grid gap-2 text-[15px] text-ink-soft">
        <li className="flex items-start gap-3"><Clock size={17} className="mt-0.5 shrink-0 text-ink" />À la fin du temps, ta copie est remise automatiquement.</li>
        <li className="flex items-start gap-3"><Compass size={17} className="mt-0.5 shrink-0 text-ink" />Tu peux passer une question et y revenir.</li>
      </ul>
      <Button className="mt-8" size="lg" icon={Timer} onClick={() => setStarted(true)}>Commencer l’épreuve</Button>
      {blancs.length ? (
        <section className="mt-12">
          <h2 className="text-[17px] font-semibold text-ink">Tes derniers concours blancs</h2>
          <ul className="mt-3 divide-y divide-line">
            {blancs.map((b, k) => (
              <li key={`${b.le}-${k}`} className="flex items-center justify-between px-1 py-3 text-[15px]">
                <span className="text-ink-soft">{new Date(`${b.le}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}</span>
                <span className="font-semibold tabular-nums text-ink">{`${String(b.sur === 20 ? b.note : Math.round((20 * b.note) / b.sur * 10) / 10).replace('.', ',')} / 20`}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </Centered>
  );
};

// ── Test de niveau ──────────────────────────────────────────────────────────
/** Profil par matière (même règle que l'application) : niveau et module de départ conseillé. */
const placementResult = (data, modules, res) => {
  const mods = orderedModules(data);
  const parMatiere = {};
  res.codes.forEach((code) => {
    const f = findExercise(modules, code);
    if (!f) return;
    const matiere = mods.find((m) => m.code === f.module.code)?.matiere || 'Autres';
    parMatiere[matiere] = parMatiere[matiere] || { justes: 0, total: 0, modules: {} };
    const ok = res.items[code]?.result?.correct;
    parMatiere[matiere].total += 1;
    if (ok) parMatiere[matiere].justes += 1;
    parMatiere[matiere].modules[f.module.code] = (parMatiere[matiere].modules[f.module.code] || 0) + (ok ? 1 : 0);
  });
  return Object.entries(parMatiere).map(([matiere, v]) => {
    const taux = v.total ? v.justes / v.total : 0;
    const ordre = mods.filter((m) => m.matiere === matiere);
    const depart = ordre.find((m) => !v.modules[m.code]) || ordre[0];
    return { matiere, taux, niveau: taux >= 0.75 ? 'Avancé' : taux >= 0.4 ? 'Intermédiaire' : 'Débutant', depart: depart ? { code: depart.code, titre: depart.titre } : null };
  });
};

export const PrepPlacementPage = () => {
  const { programme } = useParams();
  useSeo(prepPrivateSeo('Test de niveau · Préparation'));
  const prep = usePrepAccount();
  const navigate = useNavigate();
  const { data } = useProgramme(programme);
  const [started, setStarted] = useState(false);
  const [profile, setProfile] = useState(null);
  const back = `/preparation/${programme}`;
  const moduleCodes = useMemo(() => orderedModules(data).map((m) => m.code), [data]);
  const { modules, error } = useModules(moduleCodes, started);
  const [graine] = useState(() => `test:${programme}:${Date.now().toString(36)}`);
  const codes = useMemo(() => (modules ? pickAcross(modules, { nombre: 18, mode: 'test', graine }) : []), [modules, graine]);

  const gate = useGate(prep, `/preparation/${programme}/test-de-niveau`);
  if (gate) return gate;
  if (!data) return <Loading />;

  if (profile) {
    return (
      <Centered>
        <h1 className="text-title-lg font-bold text-ink">Ton profil</h1>
        <p className="mt-2 text-[16px] text-ink-soft">Ton plan du jour part maintenant de ces modules. Tu peux toujours ouvrir n’importe quel module dans le programme.</p>
        <ul className="mt-8 grid gap-4">
          {profile.map((p) => (
            <li key={p.matiere} className="rounded-3xl border border-line bg-white p-6">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[18px] font-bold tracking-[-0.01em] text-ink">{p.matiere}</p>
                <span className={cx('rounded-full px-3 py-1 text-[13px] font-semibold', p.niveau === 'Avancé' ? 'bg-gold-wash text-gold-ink' : 'bg-paper text-ink')}>{p.niveau}</span>
              </div>
              <MasteryBar className="mt-4" value={p.taux} done={p.niveau === 'Avancé'} label={`Réussite en ${p.matiere}`} />
              <p className="mt-3 text-[14px] text-ink-soft">{`${pct(p.taux)} de réussite${p.depart ? ` · commence par « ${p.depart.titre} »` : ''}`}</p>
            </li>
          ))}
        </ul>
        <Button className="mt-8" size="lg" icon={ArrowRight} iconPosition="end" onClick={() => navigate(back)}>Voir mon plan</Button>
      </Centered>
    );
  }
  if (started) {
    if (error) return <Centered><Card><EmptyState title="Connexion impossible" description="Le test n’a pas pu être chargé." onRetry={() => window.location.reload()} /></Card></Centered>;
    if (!modules || !codes.length) return <Loading />;
    return (
      <SessionRunner
        programme={programme}
        mode="test"
        codes={codes}
        modules={modules}
        back={back}
        title="Test de niveau"
        onFinish={(res) => {
          const p = placementResult(data, modules, res);
          savePlacement(programme, { le: todayKey(), resultats: p });
          setProfile(p);
          flush().then(() => prep.reload());
        }}
      />
    );
  }
  return (
    <Centered>
      <Link to={back} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-soft hover:text-ink"><ArrowLeft size={14} />{data.programme.titre}</Link>
      <h1 className="mt-4 text-title-lg font-bold text-ink">Test de niveau</h1>
      <p className="mt-2 max-w-prose text-[16px] leading-relaxed text-ink-soft">18 questions sur toutes les matières, environ 15 minutes. Selon tes réponses, ton plan saute ce que tu maîtrises déjà et commence au bon module dans chaque matière.</p>
      <Button className="mt-8" size="lg" icon={Compass} onClick={() => setStarted(true)}>Commencer le test</Button>
    </Centered>
  );
};

// ── Classement ──────────────────────────────────────────────────────────────
const PERIODES = [['semaine', 'Cette semaine'], ['mois', 'Ce mois'], ['tout', 'Depuis le début']];
export const PrepRankingPage = () => {
  const { programme } = useParams();
  useSeo(prepPrivateSeo('Classement · Préparation'));
  const prep = usePrepAccount();
  const { data } = useProgramme(programme);
  const [periode, setPeriode] = useState('semaine');
  const [board, setBoard] = useState(null);
  const [error, setError] = useState(null);
  const back = `/preparation/${programme}`;
  useEffect(() => {
    if (!prep.user || prep.loading) return undefined;
    let alive = true;
    setBoard(null);
    setError(null);
    prepApi.declare().then(() => prepApi.ranking(programme, periode)).then((b) => { if (alive) setBoard(b); }).catch((e) => { if (alive) setError(e); });
    return () => { alive = false; };
  }, [programme, periode, prep.user, prep.loading]);

  const gate = useGate(prep, `/preparation/${programme}/classement`);
  if (gate) return gate;
  return (
    <Centered>
      <Link to={back} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-soft hover:text-ink"><ArrowLeft size={14} />{data?.programme?.titre || 'Programme'}</Link>
      <h1 className="mt-4 text-title-lg font-bold text-ink">Classement</h1>
      <p className="mt-2 max-w-prose text-[16px] leading-relaxed text-ink-soft">Les candidats du même concours, sous un pseudonyme. Le score compte la maîtrise, la progression, les concours blancs et la régularité.</p>
      <div className="mt-8 inline-flex flex-wrap rounded-full border border-line bg-white p-1" role="tablist">
        {PERIODES.map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={periode === id} onClick={() => setPeriode(id)} className={cx('h-10 rounded-full px-4 text-[14px] font-semibold transition-colors', periode === id ? 'bg-ink text-white' : 'text-ink-soft hover:text-ink')}>{label}</button>
        ))}
      </div>
      {error ? <Card className="mt-6"><EmptyState title="Classement indisponible" description="Réessaie dans un instant." onRetry={() => setPeriode((p) => p)} /></Card> : null}
      {!board && !error ? <Card className="mt-6 p-6"><SkeletonRows count={5} /></Card> : null}
      {board ? (
        <>
          {board.moi ? (
            <div className="mt-6 flex items-center gap-5 rounded-3xl bg-ink p-6 text-white">
              <Trophy size={28} className="shrink-0 text-gold-light" />
              <div className="min-w-0 flex-1">
                <p className="text-[15px] text-white/70">{`Ta place · ${board.moi.pseudonyme}`}</p>
                <p className="text-[34px] font-bold leading-tight tabular-nums tracking-[-0.03em]">{`${board.moi.rang}${board.moi.rang === 1 ? 'ᵉʳ' : 'ᵉ'}`}<span className="text-[18px] font-semibold text-white/60">{` sur ${board.total}`}</span></p>
              </div>
              <p className="text-right text-[14px] text-white/70"><span className="block text-[22px] font-bold tabular-nums text-white">{String(board.moi.score).replace('.', ',')}</span>points</p>
            </div>
          ) : null}
          <ol className="mt-6 divide-y divide-line rounded-3xl border border-line bg-white">
            {board.candidats.map((c) => (
              <li key={c.identite} className={cx('flex items-center gap-4 px-5 py-3.5', c.moi && 'bg-gold-wash/60')}>
                <span className={cx('w-8 text-center text-[15px] font-bold tabular-nums', c.rang <= 3 ? 'text-gold-ink' : 'text-ink-soft')}>{c.rang}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold text-ink">{c.moi ? `${c.pseudonyme} (toi)` : c.pseudonyme}</span>
                  <span className="block text-[13px] text-ink-soft">{`${c.stats.questions} question${c.stats.questions > 1 ? 's' : ''} · ${pct(c.stats.reussite)} de réussite · ${c.stats.modulesValides} module${c.stats.modulesValides > 1 ? 's' : ''} validé${c.stats.modulesValides > 1 ? 's' : ''}`}</span>
                </span>
                <span className="text-[15px] font-semibold tabular-nums text-ink">{String(c.score).replace('.', ',')}</span>
              </li>
            ))}
          </ol>
        </>
      ) : null}
    </Centered>
  );
};
