import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronRight, FileCheck, FileText, Layers3, SearchX } from 'lucide-react';
import { Button, Container, EmptyState, SkeletonRows, cx } from '../components/ui';
import useAsync from '../hooks/useAsync';
import useDebounce from '../hooks/useDebounce';
import { catalog, documents as documentsApi } from '../lib/api';
import { documentTitle, formatDate, hasCorrection, labelOf } from '../lib/format';

/*
 * Parcours du catalogue : organisme → type de parcours → niveaux (concours, année…) → matière → sujets.
 * L'état vit dans l'URL (?o, pt, n, m) : retour navigateur, partage de lien et rechargement fonctionnent.
 */

const MATTER_LEVEL = { libelleSingulier: 'Matière', libellePluriel: 'Matières' };
const PAGE_SIZE = 20;

const Row = ({ to, onClick, title, meta, icon: Icon = ChevronRight, trailing }) => {
  const content = (
    <>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[16px] font-semibold tracking-[-0.01em] text-ink">{title}</p>
        {meta ? <p className="mt-0.5 truncate text-sm text-ink-soft">{meta}</p> : null}
      </div>
      {trailing}
      <Icon size={18} className="shrink-0 text-ink-muted transition-transform group-hover:translate-x-0.5 group-hover:text-ink" />
    </>
  );
  const className = 'group flex w-full items-center gap-4 border-b border-line px-5 py-4 text-left transition-colors last:border-0 hover:bg-paper';
  return to
    ? <Link to={to} className={className}>{content}</Link>
    : <button type="button" onClick={onClick} className={className}>{content}</button>;
};

const Filter = ({ value, onChange, placeholder }) => (
  <input
    value={value}
    onChange={(event) => onChange(event.target.value)}
    placeholder={placeholder}
    aria-label={placeholder}
    className="h-11 w-full rounded-xl border border-line bg-white px-4 text-[15px] text-ink placeholder:text-ink-muted focus:border-ink/30 focus:outline-none sm:max-w-xs"
  />
);

const ExplorePage = () => {
  const [params, setParams] = useSearchParams();
  const organismeId = params.get('o');
  const parcoursTypeId = params.get('pt');
  const path = useMemo(() => (params.get('n') ? params.get('n').split(',') : []), [params]);
  const matiereId = params.get('m');
  const [filter, setFilter] = useState('');
  const labels = useRef(new Map());
  const [, forceLabels] = useState(0);

  const remember = (items) => {
    items.forEach((item) => labels.current.set(item._id, labelOf(item)));
    forceLabels((value) => value + 1);
  };

  const organismes = useAsync(() => catalog.organismes({ limit: 100 }), []);
  const organisme = organismes.data?.data.find((item) => item._id === organismeId) || null;
  const levels = organisme?.structure?.niveaux || [];

  const parcoursTypes = useAsync(
    () => catalog.parcoursTypes(organismeId),
    [organismeId],
    { enabled: Boolean(organismeId) },
  );
  const needsParcours = Boolean(parcoursTypes.data?.data.length);
  const parcoursType = parcoursTypes.data?.data.find((item) => item._id === parcoursTypeId) || null;

  const step = !organismeId ? 'organisme'
    : organismes.data && !organisme ? 'notfound'
    : !organisme || parcoursTypes.loading ? 'loading'
      : needsParcours && !parcoursTypeId ? 'parcours'
        : path.length < levels.length ? 'noeud'
          : !matiereId ? 'matiere'
            : 'documents';

  const leafId = path[path.length - 1];

  const levelItems = useAsync(async () => {
    const common = { organismeId, parcoursTypeId: parcoursTypeId || undefined, page: 1, limit: 100 };
    const result = step === 'noeud'
      ? await catalog.noeuds({ ...common, parentId: leafId || 'root' })
      : await catalog.matieres({ ...common, noeudId: leafId });
    remember(result.data);
    return result;
  }, [step, organismeId, parcoursTypeId, leafId], { enabled: step === 'noeud' || step === 'matiere' });

  // Lien direct : résout les libellés du fil d'Ariane manquants.
  useEffect(() => {
    if (!organismeId || !path.length) return;
    path.forEach((id, depth) => {
      if (labels.current.has(id)) return;
      catalog.noeuds({ organismeId, parcoursTypeId: parcoursTypeId || undefined, parentId: path[depth - 1] || 'root', limit: 100 })
        .then((result) => remember(result.data))
        .catch(() => {});
    });
    if (matiereId && !labels.current.has(matiereId)) {
      catalog.matieres({ organismeId, parcoursTypeId: parcoursTypeId || undefined, noeudId: leafId, limit: 100 })
        .then((result) => remember(result.data))
        .catch(() => {});
    }
  }, [organismeId, parcoursTypeId, path, matiereId, leafId]);

  const [page, setPage] = useState(1);
  const [docs, setDocs] = useState([]);
  const docsQuery = useDebounce(step === 'documents' ? filter : '', 300);
  const documentsState = useAsync(async () => {
    const result = await documentsApi.list({
      noeudId: leafId,
      matiereId,
      parcoursTypeId: parcoursTypeId || undefined,
      type: 'sujet',
      recherche: docsQuery || undefined,
      page,
      limit: PAGE_SIZE,
    });
    return { ...result, requestedPage: page };
  }, [leafId, matiereId, parcoursTypeId, docsQuery, page], { enabled: step === 'documents' });

  // Alimentation depuis la réponse la plus récente uniquement (useAsync ignore les réponses obsolètes).
  useEffect(() => {
    const result = documentsState.data;
    if (!result) return;
    setDocs((current) => (result.requestedPage > 1 ? [...current, ...result.data] : result.data));
  }, [documentsState.data]);

  useEffect(() => {
    setFilter('');
    setPage(1);
  }, [step, leafId, matiereId]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [organismeId, parcoursTypeId, path.length, matiereId]);

  const go = (next) => {
    const nextParams = new URLSearchParams();
    Object.entries(next).forEach(([key, value]) => {
      if (value) nextParams.set(key, Array.isArray(value) ? value.join(',') : value);
    });
    setParams(nextParams);
  };

  const base = { o: organismeId, pt: parcoursTypeId };
  const currentLevel = step === 'matiere' ? MATTER_LEVEL : levels[path.length];

  const crumbs = [
    { label: 'Organismes', to: {} },
    organisme && { label: labelOf(organisme), to: { o: organismeId } },
    parcoursType && { label: labelOf(parcoursType), to: base },
    ...path.map((id, index) => ({ label: labels.current.get(id) || '…', to: { ...base, n: path.slice(0, index + 1) } })),
    matiereId && { label: labels.current.get(matiereId) || '…', to: { ...base, n: path, m: matiereId } },
  ].filter(Boolean);

  const titles = {
    organisme: ['Choisissez un organisme', 'L’organisme qui a organisé le concours ou l’examen.'],
    parcours: ['Type de parcours', `Les parcours proposés par ${labelOf(organisme)}.`],
    noeud: [currentLevel?.libellePluriel || 'Niveaux', crumbs.slice(1).map((crumb) => crumb.label).join(' · ')],
    matiere: ['Matières', crumbs.slice(1).map((crumb) => crumb.label).join(' · ')],
    notfound: ['Organisme introuvable', 'Ce lien ne correspond à aucun organisme publié.'],
    documents: [labels.current.get(matiereId) || 'Sujets', crumbs.slice(1, -1).map((crumb) => crumb.label).join(' · ')],
    loading: ['Chargement…', ''],
  };
  const [title, subtitle] = titles[step];

  const filterItems = (items) => {
    const normalized = filter.trim().toLocaleLowerCase();
    return normalized ? items.filter((item) => labelOf(item).toLocaleLowerCase().includes(normalized)) : items;
  };

  const renderList = () => {
    if (step === 'loading' || (step === 'organisme' && organismes.loading && !organismes.data)) return <div className="p-5"><SkeletonRows count={6} /></div>;

    if (step === 'notfound') {
      return <EmptyState icon={SearchX} title="Organisme introuvable" action={<Button variant="secondary" onClick={() => go({})}>Voir tous les organismes</Button>} />;
    }

    if (step === 'organisme') {
      if (organismes.error) return <EmptyState icon={Layers3} title="Connexion impossible" description="Le catalogue n’a pas pu être chargé." onRetry={organismes.reload} />;
      const items = filterItems(organismes.data.data);
      if (!items.length) return <EmptyState icon={SearchX} title="Aucun résultat" description="Aucun organisme ne correspond à votre recherche." />;
      return items.map((item) => (
        <Row key={item._id} onClick={() => go({ o: item._id })} title={labelOf(item)} meta={item.subjectCount ? `${item.subjectCount} sujet${item.subjectCount > 1 ? 's' : ''}` : 'Sujets publiés'} />
      ));
    }

    if (step === 'parcours') {
      return filterItems(parcoursTypes.data.data).map((item) => (
        <Row key={item._id} onClick={() => go({ o: organismeId, pt: item._id })} title={labelOf(item)} />
      ));
    }

    if (step === 'noeud' || step === 'matiere') {
      if (levelItems.loading && !levelItems.data) return <div className="p-5"><SkeletonRows count={5} /></div>;
      if (levelItems.error) return <EmptyState icon={Layers3} title="Connexion impossible" description="Ce niveau n’a pas pu être chargé." onRetry={levelItems.reload} />;
      const items = filterItems(levelItems.data?.data || []);
      if (!items.length) return <EmptyState icon={SearchX} title="Rien ici pour le moment" description="Aucun élément ne correspond." />;
      return items.map((item) => (
        <Row
          key={item._id}
          onClick={() => go(step === 'noeud' ? { ...base, n: [...path, item._id] } : { ...base, n: path, m: item._id })}
          title={labelOf(item)}
          meta={item.subjectCount ? `${item.subjectCount} sujet${item.subjectCount > 1 ? 's' : ''}` : undefined}
        />
      ));
    }

    if (documentsState.loading && !docs.length) return <div className="p-5"><SkeletonRows count={5} /></div>;
    if (documentsState.error && !docs.length) return <EmptyState icon={FileText} title="Connexion impossible" description="Les sujets n’ont pas pu être chargés." onRetry={documentsState.reload} />;
    if (!docs.length) return <EmptyState icon={FileText} title="Aucun sujet" description={filter ? 'Aucun sujet ne correspond à ce filtre.' : 'Aucun sujet publié pour cette matière.'} />;

    return docs.map((document) => {
      const correction = hasCorrection(document);
      return (
        <Row
          key={document._id}
          to={`/sujets/document/${document._id}`}
          title={documentTitle(document)}
          meta={formatDate(document.dateAjout || document.createdAt)}
          trailing={correction ? (
            <span className="hidden items-center gap-1 rounded-full bg-gold-wash px-2.5 py-1 text-xs font-semibold text-gold-ink sm:inline-flex">
              <FileCheck size={13} /> Corrigé
            </span>
          ) : null}
        />
      );
    });
  };

  const hasMoreDocs = step === 'documents' && documentsState.data?.pagination && documentsState.data.pagination.pages > page;

  return (
    <Container className="py-8 md:py-12">
      <nav aria-label="Fil d’Ariane" className="flex flex-wrap items-center gap-1 text-sm">
        {crumbs.map((crumb, index) => {
          const last = index === crumbs.length - 1;
          return (
            <React.Fragment key={`${crumb.label}-${index}`}>
              {index > 0 ? <ChevronRight size={14} className="text-ink-muted" /> : null}
              {last ? <span className="font-medium text-ink">{crumb.label}</span> : (
                <button type="button" onClick={() => go(crumb.to)} className="text-ink-soft hover:text-burgundy">{crumb.label}</button>
              )}
            </React.Fragment>
          );
        })}
      </nav>

      <div key={`${step}-${path.length}`} className="mt-6 flex animate-fade-up flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-[-0.03em] text-ink md:text-4xl">{title}</h1>
          {subtitle ? <p className="mt-1.5 text-ink-soft">{subtitle}</p> : null}
        </div>
        {step !== 'loading' && step !== 'notfound' ? (
          <Filter
            value={filter}
            onChange={(value) => {
              setFilter(value);
              if (step === 'documents') setPage(1);
            }}
            placeholder={step === 'documents' ? 'Filtrer les sujets…' : 'Filtrer la liste…'}
          />
        ) : null}
      </div>

      <div className={cx('mt-6 overflow-hidden rounded-2xl border border-line bg-white', step === 'loading' && 'opacity-80')}>
        {renderList()}
      </div>

      {hasMoreDocs ? (
        <div className="mt-6 flex justify-center">
          <Button variant="secondary" loading={documentsState.loading} onClick={() => setPage((value) => value + 1)}>Charger plus de sujets</Button>
        </div>
      ) : null}
    </Container>
  );
};

export default ExplorePage;
