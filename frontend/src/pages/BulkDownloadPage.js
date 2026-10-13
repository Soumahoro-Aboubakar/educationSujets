import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Clock, Download, FileCheck, FileText, Files, Gift, Layers3, SearchX, X } from 'lucide-react';
import { Button, Card, Container, EmptyState, ErrorNote, Eyebrow, SkeletonRows, cx } from '../components/ui';
import OrganismeLogo from '../components/catalog/OrganismeLogo';
import AuthContext from '../context/AuthContext';
import useAsync from '../hooks/useAsync';
import useSeo from '../hooks/useSeo';
import { catalog, downloads as downloadsApi, errorCode, errorMessage } from '../lib/api';
import { formatFileSize, formatRenewal, labelOf, loadErrorOf, organismeLabel } from '../lib/format';
import { findBySegment, slugOf } from '../lib/slug';
import { apiUrl } from '../lib/visitor';
import { trackEvent } from '../lib/analytics';

/*
 * Téléchargement groupé : organisme → cycle (un seul par opération) → années / matières → sélection.
 * Les filtres vivent dans l'adresse (?organisme=ena&cycle=…&annee=2021) : lien partageable.
 * Le récapitulatif est contrôlé par le serveur (POST /api/downloads/preview) : gratuits, récents,
 * quota restant, dépassement. L'archive ZIP est produite en flux par le serveur ; le navigateur
 * l'enregistre directement. Le serveur revérifie tout au moment du téléchargement.
 */

const plural = (count, singular, pluralForm = `${singular}s`) => `${count} ${count > 1 ? pluralForm : singular}`;
const NO_YEAR = 'inconnue';

const Chip = ({ active, onClick, children, disabled }) => (
  <button
    type="button"
    aria-pressed={active}
    disabled={disabled}
    onClick={onClick}
    className={cx(
      'inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-[background-color,border-color,color,transform] duration-200 active:scale-95 disabled:opacity-40',
      active ? 'border-ink bg-ink text-white' : 'border-line bg-white text-ink-soft hover:border-line-strong hover:text-ink',
    )}
  >
    {children}
  </button>
);

const FilterGroup = ({ label, hint, children }) => (
  <div className="py-4 first:pt-0 last:pb-0">
    <div className="flex items-baseline justify-between gap-3">
      <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-muted">{label}</h2>
      {hint ? <span className="text-xs text-ink-muted">{hint}</span> : null}
    </div>
    <div className="scrollbar-none -mx-1 mt-3 flex flex-wrap gap-2 px-1">{children}</div>
  </div>
);

const TierBadge = ({ item }) => (item.tier === 'free' ? (
  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-gold-wash px-2.5 py-1 text-xs font-semibold text-gold-ink"><Gift size={12} aria-hidden /> Gratuit</span>
) : (
  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-paper-dim px-2.5 py-1 text-xs font-semibold text-ink-soft"><Clock size={12} aria-hidden /> Récent</span>
));

const describe = (item) => [
  item.yearKnown ? String(item.year) : 'Année non précisée',
  item.matiere?.nom,
  item.kind === 'corrige' ? 'Corrigé' : item.correctionIncludedInPdf ? 'Corrigé inclus' : null,
  formatFileSize(item.fileSize),
].filter(Boolean).join(' · ');

const BulkDownloadPage = () => {
  const { user } = useContext(AuthContext);
  const [params, setParams] = useSearchParams();
  const organismeParam = params.get('organisme') || '';
  const cycleParam = params.get('cycle') || '';
  const yearParam = params.get('annee') || '';
  const matiereParam = useMemo(() => (params.get('matieres') || '').split(',').filter(Boolean), [params]);

  const [selected, setSelected] = useState(() => new Set());
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const recapRef = useRef(null);

  useSeo({
    title: 'Télécharger plusieurs sujets',
    description: 'Téléchargez en une fois les sujets d’un organisme, d’un cycle ou d’une année. Sujets de 2010 et avant gratuits, sans compte.',
    robots: 'noindex, follow',
  });

  const setParam = (changes) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([key, value]) => (value ? next.set(key, value) : next.delete(key)));
    setParams(next, { replace: true });
  };

  const organismes = useAsync(() => catalog.organismes({ limit: 100 }), []);
  const organismeList = organismes.data?.data || [];
  const organisme = findBySegment(organismeList, organismeParam);

  const scope = useAsync(
    () => downloadsApi.scope({ organisme: organisme?._id, parcoursTypeId: cycleParam || undefined }),
    [organisme?._id, cycleParam, user?._id || 'visiteur'],
    { enabled: Boolean(organisme) },
  );
  const data = scope.data;
  const documents = useMemo(() => data?.documents || [], [data]);
  const byId = useMemo(() => new Map(documents.map((item) => [item._id, item])), [documents]);

  // Changer d'organisme ou de cycle vide la sélection : une opération ne mélange jamais deux cycles.
  const scopeKey = `${organisme?._id || ''}|${data?.cycle?._id || ''}`;
  const lastScope = useRef(scopeKey);
  useEffect(() => {
    if (lastScope.current !== scopeKey) {
      lastScope.current = scopeKey;
      setSelected(new Set());
      setSuccess(null);
      setError(null);
    }
  }, [scopeKey]);

  const visible = useMemo(() => documents.filter((item) => (
    (!yearParam || (yearParam === NO_YEAR ? !item.yearKnown : String(item.year) === yearParam))
    && (!matiereParam.length || matiereParam.includes(item.matiere?._id))
  )), [documents, yearParam, matiereParam]);

  const selectedItems = useMemo(() => [...selected].map((id) => byId.get(id)).filter(Boolean), [selected, byId]);
  const selectionKey = selectedItems.map((item) => item._id).sort().join(',');

  // Récapitulatif serveur (quota exact, documents déjà accordés), relancé après chaque changement.
  const [previewTick, setPreviewTick] = useState(0);
  const preview = useAsync(
    () => downloadsApi.preview(selectionKey.split(',')),
    [selectionKey, previewTick],
    { enabled: Boolean(selectionKey) },
  );
  const summary = selectionKey ? preview.data : null;

  const toggle = (id) => {
    setSuccess(null);
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const selectVisible = () => {
    setSuccess(null);
    setSelected((current) => new Set([...current, ...visible.map((item) => item._id)]));
  };
  const clearVisible = () => {
    setSelected((current) => {
      const next = new Set(current);
      visible.forEach((item) => next.delete(item._id));
      return next;
    });
  };
  /** Accord explicite de l'utilisateur : ne garder que les sujets récents couverts par le quota. */
  const keepWithinQuota = () => {
    if (!summary) return;
    const granted = new Set(summary.documents.filter((item) => item.alreadyGranted).map((item) => item._id));
    let budget = summary.quota.remaining ?? Infinity;
    setSelected(new Set(selectedItems.filter((item) => {
      if (item.tier === 'free' || granted.has(item._id)) return true;
      if (budget > 0) { budget -= 1; return true; }
      return false;
    }).map((item) => item._id)));
  };
  const removeRecent = () => setSelected(new Set(selectedItems.filter((item) => item.tier === 'free').map((item) => item._id)));

  const chooseCycle = (cycleId) => {
    if (cycleId === (data?.cycle?._id || '')) return;
    if (selected.size && !window.confirm('Un téléchargement groupé ne concerne qu’un seul cycle. Changer de cycle retire votre sélection actuelle. Continuer ?')) return;
    setParam({ cycle: cycleId, annee: '', matieres: '' });
  };
  const chooseOrganisme = (item) => {
    if (selected.size && !window.confirm('Changer d’organisme retire votre sélection actuelle. Continuer ?')) return;
    setParam({ organisme: slugOf(item) || item._id, cycle: '', annee: '', matieres: '' });
  };
  const toggleMatiere = (id) => {
    const next = matiereParam.includes(id) ? matiereParam.filter((value) => value !== id) : [...matiereParam, id];
    setParam({ matieres: next.join(',') });
  };

  const start = async () => {
    setError(null);
    setSuccess(null);
    setCreating(true);
    trackEvent('bulk_download', { organisme: organisme ? organismeLabel(organisme) : undefined, count: selectedItems.length });
    try {
      const bundle = await downloadsApi.createBundle(selectedItems.map((item) => item._id), 'zip');
      // Archive servie en flux par le serveur, enregistrée directement par le navigateur.
      window.location.assign(apiUrl(bundle.archiveUrl));
      setSuccess({ count: bundle.count, unavailable: bundle.unavailable?.length || 0, recent: bundle.counts?.recentToCharge || 0 });
      setTimeout(() => { setPreviewTick((value) => value + 1); scope.reload(); }, 2500);
    } catch (requestError) {
      const code = errorCode(requestError);
      setError({
        code,
        message: errorMessage(requestError, 'Le téléchargement n’a pas pu démarrer. Réessayez dans un instant.'),
        details: requestError.response?.data?.details,
      });
      setPreviewTick((value) => value + 1);
    } finally {
      setCreating(false);
    }
  };

  const quota = summary?.quota || data?.quota;
  const counts = summary?.counts;
  const overflow = summary?.overflow || 0;
  const blocked = counts?.blocked || 0;
  const canStart = selectedItems.length > 0 && summary && summary.canProceed && !preview.loading;
  const renewal = formatRenewal(quota?.nextRenewalAt);

  // ── Rendu ────────────────────────────────────────────────────────────────────────────────

  const organismePicker = (
    <FilterGroup label="Organisme">
      {organismes.loading && !organismes.data ? <SkeletonRows count={1} className="w-full" /> : organismeList.map((item) => (
        <Chip key={item._id} active={organisme?._id === item._id} onClick={() => chooseOrganisme(item)}>
          <OrganismeLogo organisme={item} size="xs" />
          {organismeLabel(item)}
        </Chip>
      ))}
    </FilterGroup>
  );

  const renderList = () => {
    if (!organisme) {
      if (organismeParam && organismes.data) {
        return <EmptyState icon={SearchX} title="Organisme introuvable" description="Ce lien ne correspond à aucun organisme publié. Choisissez-en un ci-dessus." />;
      }
      return <EmptyState icon={Files} title="Choisissez un organisme" description="Sélectionnez l’organisme dont vous voulez télécharger les sujets." />;
    }
    if (scope.loading && !data) return <div className="p-5"><SkeletonRows count={6} /></div>;
    if (scope.error) {
      const { title, description } = loadErrorOf(scope.error, 'La liste des sujets');
      return <EmptyState icon={Layers3} title={title} description={description} onRetry={scope.reload} />;
    }
    if (data?.requiresCycle && !data.cycle) {
      return <EmptyState icon={Layers3} title="Choisissez un cycle" description="Les sujets de cet organisme sont classés par cycle. Un téléchargement groupé concerne un seul cycle à la fois." />;
    }
    if (!visible.length) return <EmptyState icon={FileText} title="Aucun document" description="Aucun document publié ne correspond à ces filtres." />;

    return visible.map((item) => {
      const checked = selected.has(item._id);
      return (
        <label key={item._id} className={cx('flex min-h-[64px] cursor-pointer items-center gap-4 border-b border-line px-4 py-3 transition-colors last:border-0 hover:bg-paper sm:px-5', checked && 'bg-paper')}>
          <input type="checkbox" checked={checked} onChange={() => toggle(item._id)} className="h-5 w-5 shrink-0 cursor-pointer rounded accent-[#0D1B32]" aria-describedby={`meta-${item._id}`} />
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-paper-dim text-ink">
            {item.kind === 'corrige' ? <FileCheck size={18} aria-hidden /> : <FileText size={18} aria-hidden />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="line-clamp-2 font-semibold leading-snug text-ink sm:truncate">{item.title}</span>
            <span id={`meta-${item._id}`} className="mt-0.5 block truncate text-sm text-ink-soft">{describe(item)}</span>
          </span>
          <TierBadge item={item} />
        </label>
      );
    });
  };

  const recap = (
    <div ref={recapRef} className="scroll-mt-24 lg:sticky lg:top-24"><Card className="p-5 shadow-soft sm:p-6">
      <h2 className="text-lg font-bold tracking-[-0.01em] text-ink">Récapitulatif</h2>
      <p className="mt-1 text-sm text-ink-soft" aria-live="polite">
        {selectedItems.length ? `${plural(selectedItems.length, 'document sélectionné', 'documents sélectionnés')}` : 'Aucun document sélectionné.'}
      </p>

      {counts ? (
        <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-xl bg-gold-wash px-3 py-2.5 text-gold-ink"><dt className="text-xs">Gratuits</dt><dd className="tabular text-lg font-bold">{counts.free}</dd></div>
          <div className="rounded-xl bg-paper-dim px-3 py-2.5 text-ink"><dt className="text-xs text-ink-soft">Récents à décompter</dt><dd className="tabular text-lg font-bold">{counts.recentToCharge}</dd></div>
        </dl>
      ) : null}

      {quota && !quota.unlimited ? (
        <p className="mt-3 text-sm text-ink-soft">
          {`Sujets récents : ${quota.remaining} sur ${quota.limit} encore disponibles (${quota.windowHours} h glissantes).`}
          {quota.remaining === 0 && renewal ? ` Prochain téléchargement possible à partir du ${renewal}.` : ''}
        </p>
      ) : quota?.unlimited ? <p className="mt-3 text-sm text-ink-soft">Accès administrateur : aucun quota.</p> : null}

      {overflow > 0 ? (
        <div className="mt-4 rounded-xl border border-gold/40 bg-gold-wash/60 p-3.5 text-sm text-ink" role="status">
          <p className="flex items-start gap-2 font-semibold"><AlertTriangle size={16} className="mt-0.5 shrink-0 text-gold-ink" aria-hidden /> Sélection au-delà de votre quota</p>
          <p className="mt-1.5 text-ink-soft">
            {quota.remaining === 0
              ? `Votre sélection contient ${plural(counts.recentToCharge, 'sujet récent', 'sujets récents')}, et votre quota de sujets récents est épuisé pour le moment.${renewal ? ` Il sera renouvelé progressivement, à partir du ${renewal}.` : ''} Les sujets gratuits peuvent être téléchargés dès maintenant.`
              : `Votre sélection contient ${plural(counts.recentToCharge, 'sujet récent', 'sujets récents')}, mais il vous reste seulement ${plural(quota.remaining, `téléchargement${quota.plan === 'subscriber' ? '' : ' gratuit'}`, `téléchargements${quota.plan === 'subscriber' ? '' : ' gratuits'}`)} pour le moment. Vous pouvez choisir jusqu’à ${plural(quota.remaining, 'sujet récent', 'sujets récents')} maintenant. Les autres pourront être téléchargés lorsque votre quota sera renouvelé.`}
          </p>
          <div className="mt-3 grid gap-2">
            {quota.remaining > 0 ? <Button size="sm" variant="secondary" onClick={keepWithinQuota}>{`Garder ${plural(quota.remaining, 'sujet récent', 'sujets récents')} et les gratuits`}</Button> : null}
            {counts.free ? <Button size="sm" variant="secondary" onClick={removeRecent}>Ne garder que les sujets gratuits</Button> : null}
            {quota.plan !== 'subscriber' ? <Button size="sm" to="/abonnement?next=%2Ftelecharger">Prendre mon abonnement</Button> : null}
          </div>
        </div>
      ) : null}

      {blocked > 0 ? (
        <p className="mt-4 rounded-xl bg-paper-dim p-3.5 text-sm text-ink-soft">
          {`${plural(blocked, 'sujet récent est réservé', 'sujets récents sont réservés')} aux abonnés. Retirez-les ou `}
          <Link to="/abonnement?next=%2Ftelecharger" className="font-semibold text-burgundy hover:underline">prenez votre abonnement</Link>.
        </p>
      ) : null}

      {selectedItems.length ? (
        <ul className="mt-4 max-h-72 divide-y divide-line overflow-y-auto rounded-xl border border-line">
          {selectedItems.map((item) => (
            <li key={item._id} className="flex items-center gap-2 px-3 py-2 text-sm">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium text-ink">{item.title}</span>
                <span className="block truncate text-xs text-ink-muted">{[item.yearKnown ? item.year : 'Année non précisée', item.matiere?.nom, item.tier === 'free' ? 'gratuit' : 'récent'].filter(Boolean).join(' · ')}</span>
              </span>
              <button type="button" onClick={() => toggle(item._id)} aria-label={`Retirer ${item.title}`} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-muted hover:bg-paper-dim hover:text-ink"><X size={15} /></button>
            </li>
          ))}
        </ul>
      ) : null}

      <Button size="lg" icon={Download} className="mt-5 w-full" loading={creating} disabled={!canStart} onClick={start}>
        {selectedItems.length > 1 ? `Télécharger ${selectedItems.length} documents (ZIP)` : 'Télécharger'}
      </Button>
      {selectedItems.length && preview.loading ? <p className="mt-2 text-center text-xs text-ink-muted">Vérification de la sélection…</p> : null}
      {preview.error && selectedItems.length ? <ErrorNote className="mt-3">{errorMessage(preview.error, 'La sélection n’a pas pu être vérifiée.')}</ErrorNote> : null}
      {error ? <ErrorNote className="mt-3">{error.message}</ErrorNote> : null}
      {success ? (
        <p className="mt-3 flex items-start gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">
          <CheckCircle2 size={17} className="mt-px shrink-0" aria-hidden />
          <span>
            {`Archive de ${plural(success.count, 'document')} en cours de téléchargement.`}
            {success.unavailable ? ` ${plural(success.unavailable, 'document indisponible n’a', 'documents indisponibles n’ont')} pas été inclus.` : ''}
            {' Un document momentanément indisponible est listé dans LISEZ-MOI.txt et n’est pas décompté.'}
          </span>
        </p>
      ) : null}
      <p className="mt-4 text-xs leading-relaxed text-ink-muted">
        {`Sujets de ${quota?.freeUntilYear || 2010} et avant : gratuits, sans compte. Sujets plus récents : ${quota?.limits?.free ?? 3} par ${quota?.windowHours || 24} h sans abonnement, ${quota?.limits?.subscriber ?? 20} avec un abonnement.`}
      </p>
    </Card></div>
  );

  return (
    <Container className="py-8 pb-28 md:py-12 lg:pb-12">
      <Eyebrow>Téléchargement groupé</Eyebrow>
      <h1 className="mt-2 text-title-lg font-bold text-ink">Télécharger plusieurs sujets</h1>
      <p className="mt-2 max-w-2xl text-ink-soft">Choisissez un organisme, un cycle, puis les années et matières qui vous intéressent. Les sujets individuels restent disponibles sur leur fiche.</p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px] lg:gap-10">
        <div className="min-w-0 space-y-6">
          <Card className="divide-y divide-line p-5 sm:p-6">
            {organismePicker}
            {data?.cycles?.length > 1 || (data?.cycles?.length === 1 && data.requiresCycle) ? (
              <FilterGroup label="Cycle" hint="Un seul cycle par téléchargement">
                {data.cycles.map((cycle) => (
                  <Chip key={cycle._id} active={data.cycle?._id === cycle._id} onClick={() => chooseCycle(cycle._id)}>
                    {cycle.nom}<span className="tabular opacity-70">{cycle.subjectCount}</span>
                  </Chip>
                ))}
              </FilterGroup>
            ) : null}
            {data?.facets?.years?.length ? (
              <FilterGroup label="Année">
                <Chip active={!yearParam} onClick={() => setParam({ annee: '' })}>Toutes</Chip>
                {data.facets.years.map((year) => (
                  <Chip key={year} active={yearParam === String(year)} onClick={() => setParam({ annee: String(year) })}>{year}</Chip>
                ))}
                {data.facets.hasUnknownYear ? <Chip active={yearParam === NO_YEAR} onClick={() => setParam({ annee: NO_YEAR })}>Non précisée</Chip> : null}
              </FilterGroup>
            ) : null}
            {data?.facets?.matieres?.length > 1 ? (
              <FilterGroup label="Matières" hint={matiereParam.length ? plural(matiereParam.length, 'choisie', 'choisies') : 'Toutes'}>
                {data.facets.matieres.map((matiere) => (
                  <Chip key={matiere._id} active={matiereParam.includes(matiere._id)} onClick={() => toggleMatiere(matiere._id)}>{labelOf(matiere)}</Chip>
                ))}
              </FilterGroup>
            ) : null}
          </Card>

          <section aria-label="Documents disponibles">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-ink-soft" aria-live="polite">
                {organisme && data && !(data.requiresCycle && !data.cycle)
                  ? `${plural(visible.length, 'document')} dans ce périmètre · ${plural(visible.filter((item) => item.tier === 'free').length, 'gratuit')} · ${plural(visible.filter((item) => item.tier === 'recent').length, 'récent')}`
                  : ' '}
              </p>
              {visible.length ? (
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={selectVisible}>Tout sélectionner</Button>
                  <Button size="sm" variant="ghost" onClick={clearVisible} disabled={!visible.some((item) => selected.has(item._id))}>Tout désélectionner</Button>
                </div>
              ) : null}
            </div>
            <div className={cx('mt-3 overflow-hidden rounded-2xl border border-line bg-white shadow-soft transition-opacity', scope.loading && data && 'opacity-60')}>
              {renderList()}
            </div>
          </section>
        </div>

        <aside className="min-w-0">{recap}</aside>
      </div>

      {/* Mobile : rappel permanent de la sélection, accès direct au récapitulatif. */}
      {selectedItems.length ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
          <div className="mx-auto flex max-w-xl items-center justify-between gap-3">
            <span className="text-sm font-semibold text-ink">{plural(selectedItems.length, 'document sélectionné', 'documents sélectionnés')}</span>
            <Button size="sm" onClick={() => recapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>Récapitulatif</Button>
          </div>
        </div>
      ) : null}
    </Container>
  );
};

export default BulkDownloadPage;
