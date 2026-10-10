import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, FileCheck, FileText, Search, SearchX, X } from 'lucide-react';
import { Button, Container, EmptyState, Eyebrow, SkeletonRows, cx } from '../components/ui';
import useAsync from '../hooks/useAsync';
import useDebounce from '../hooks/useDebounce';
import { catalog, documents } from '../lib/api';
import { documentTitle, formatDate, hasCorrection, labelOf, nodeChain, organismeLabel } from '../lib/format';
import { segmentFor } from '../lib/slug';
import { catalogPath } from '../lib/catalogSeo';
import { trackEvent } from '../lib/analytics';
import OrganismeLogo, { distinctPalette } from '../components/catalog/OrganismeLogo';

const PAGE_SIZE = 20;

const TYPE_FILTERS = [
  { id: '', label: 'Tout' },
  { id: 'sujet', label: 'Sujets' },
  { id: 'corrige', label: 'Corrigés' },
];

const normalize = (value) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/**
 * Recherche instantanée (débounce 300 ms) sur les titres et le catalogue : organisme,
 * concours, année, matière. Les organismes correspondants sont proposés en raccourci.
 */
const SearchPage = () => {
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get('q') || '');
  const type = params.get('type') || '';
  const withCorrection = params.get('corrige') === '1';
  const debounced = useDebounce(query.trim(), 300);
  const [page, setPage] = useState(1);
  const [items, setItems] = useState([]);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const next = new URLSearchParams(params);
    if (debounced) next.set('q', debounced);
    else next.delete('q');
    if (debounced.length >= 2) trackEvent('search', { search_term: debounced.slice(0, 100) });
    setParams(next, { replace: true });
    setPage(1);
  }, [debounced]); // eslint-disable-line react-hooks/exhaustive-deps

  const setFilter = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
    setPage(1);
  };

  const organismes = useAsync(() => catalog.organismes({ limit: 100 }), []);
  const colors = useMemo(() => distinctPalette(organismes.data?.data || []), [organismes.data]);
  const matchingOrganismes = useMemo(() => {
    if (debounced.length < 2) return [];
    const needle = normalize(debounced);
    return (organismes.data?.data || []).filter((item) => normalize(labelOf(item)).includes(needle)).slice(0, 4);
  }, [organismes.data, debounced]);

  const results = useAsync(async () => {
    const result = await documents.list({
      search: debounced || undefined,
      documentType: type || undefined,
      hasCorrection: withCorrection ? 'true' : undefined,
      page,
      limit: PAGE_SIZE,
    });
    return { ...result, requestedPage: page };
  }, [debounced, type, withCorrection, page]);

  useEffect(() => {
    const result = results.data;
    if (!result) return;
    setItems((current) => (result.requestedPage > 1 ? [...current, ...result.data] : result.data));
  }, [results.data]);

  const total = results.data?.pagination?.total;
  const hasMore = results.data?.pagination && results.data.pagination.pages > page;

  return (
    <Container className="max-w-4xl py-8 md:py-12">
      <Eyebrow>Catalogue complet</Eyebrow>
      <h1 className="mt-2 text-title-lg font-bold text-ink">Recherche</h1>

      <div className="mt-6 flex animate-rise-in items-center gap-3 rounded-2xl border border-line bg-white px-4 shadow-soft transition-[border-color,box-shadow] duration-200 focus-within:border-ink/30 focus-within:shadow-lift" role="search">
        <Search size={20} className="shrink-0 text-ink-muted" aria-hidden />
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Concours, organisme, matière, année…"
          aria-label="Rechercher"
          type="search"
          enterKeyHint="search"
          className="h-14 min-w-0 flex-1 appearance-none bg-transparent text-base text-ink placeholder:text-ink-muted focus:outline-none [&::-webkit-search-cancel-button]:hidden"
        />
        {query ? (
          <button type="button" onClick={() => { setQuery(''); inputRef.current?.focus(); }} aria-label="Effacer la recherche" className="-mr-2 flex h-10 w-10 animate-fade-in items-center justify-center rounded-full text-ink-muted hover:bg-ink/5 hover:text-ink">
            <X size={17} />
          </button>
        ) : null}
      </div>

      <div className="fade-x scrollbar-none -mx-4 mt-4 flex items-center gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:[mask-image:none]">
        {TYPE_FILTERS.map((filter) => (
          <button
            key={filter.id}
            type="button"
            aria-pressed={type === filter.id}
            onClick={() => setFilter('type', filter.id)}
            className={cx('h-10 shrink-0 rounded-full border px-4 text-sm font-medium transition-[background-color,border-color,color,transform] duration-200 active:scale-95', type === filter.id ? 'border-ink bg-ink text-white' : 'border-line bg-white text-ink-soft hover:border-line-strong hover:text-ink')}
          >
            {filter.label}
          </button>
        ))}
        <span className="mx-1 h-5 w-px shrink-0 bg-line" aria-hidden />
        <button
          type="button"
          aria-pressed={withCorrection}
          onClick={() => setFilter('corrige', withCorrection ? '' : '1')}
          className={cx('inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-[background-color,border-color,color,transform] duration-200 active:scale-95', withCorrection ? 'border-gold bg-gold-wash text-gold-ink' : 'border-line bg-white text-ink-soft hover:border-line-strong hover:text-ink')}
        >
          <FileCheck size={14} /> Avec corrigé
        </button>
      </div>

      {matchingOrganismes.length ? (
        <section className="mt-8" aria-label="Organismes correspondants">
          <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-soft">Organismes</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {matchingOrganismes.map((organisme) => (
              <Link key={organisme._id} to={catalogPath([segmentFor(organisme, organismes.data?.data)])} className="group flex animate-fade-up items-center justify-between rounded-xl border border-line bg-white px-4 py-3 transition-[border-color,box-shadow] duration-200 hover:border-line-strong hover:shadow-soft">
                <span className="flex min-w-0 items-center gap-3">
                  <OrganismeLogo organisme={organisme} size="sm" paletteIndex={colors[organisme._id]} />
                  <span className="truncate font-medium text-ink">{organismeLabel(organisme)}</span>
                </span>
                <ArrowRight size={16} className="text-ink-muted transition-transform group-hover:translate-x-0.5 group-hover:text-ink" />
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-8" aria-live="polite">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-soft">{debounced ? 'Résultats' : 'Derniers ajouts'}</h2>
          {typeof total === 'number' ? <span className="tabular text-sm text-ink-muted">{`${total} document${total > 1 ? 's' : ''}`}</span> : null}
        </div>

        <div className={cx('stagger mt-3 overflow-hidden rounded-2xl border border-line bg-white shadow-soft transition-opacity duration-200', results.loading && items.length ? 'opacity-60' : '')}>
          {results.loading && !items.length ? <div className="p-5"><SkeletonRows count={5} /></div>
            : results.error && !items.length ? <EmptyState icon={SearchX} title="Connexion impossible" description="La recherche n’a pas pu aboutir." onRetry={results.reload} />
              : !items.length ? (
                <EmptyState
                  icon={SearchX}
                  title="Aucun résultat"
                  description={debounced ? `Rien ne correspond à « ${debounced} ». Essayez un sigle, une année ou une matière.` : 'Aucun document pour ces filtres.'}
                  action={<Button to="/sujets" variant="secondary" size="sm">Parcourir le catalogue</Button>}
                />
              ) : items.map((document) => {
                const context = [organismeLabel(document.organismeId), ...nodeChain(document.noeudId).map(labelOf), labelOf(document.matiereId)].filter(Boolean).join(' · ');
                return (
                  <Link key={document._id} to={`/sujets/document/${document._id}`} className="group flex min-h-[64px] items-center gap-4 border-b border-line px-4 py-3.5 transition-colors last:border-0 hover:bg-paper active:bg-paper-dim/60 sm:px-5">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-paper-dim text-ink"><FileText size={18} aria-hidden /></span>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 font-semibold leading-snug text-ink sm:truncate">{documentTitle(document)}</p>
                      <p className="mt-0.5 truncate text-sm text-ink-soft">{context || formatDate(document.dateAjout || document.createdAt)}</p>
                    </div>
                    {document.documentType === 'corrige' ? (
                      <span className="rounded-full bg-paper-dim px-2.5 py-1 text-xs font-semibold text-ink-soft">Corrigé</span>
                    ) : hasCorrection(document) ? (
                      <span className="hidden items-center gap-1 rounded-full bg-gold-wash px-2.5 py-1 text-xs font-semibold text-gold-ink sm:inline-flex"><FileCheck size={13} /> Corrigé</span>
                    ) : null}
                    <ArrowRight size={16} className="shrink-0 text-ink-muted transition-transform group-hover:translate-x-0.5 group-hover:text-ink" aria-hidden />
                  </Link>
                );
              })}
        </div>

        {hasMore ? (
          <div className="mt-6 flex justify-center">
            <Button variant="secondary" loading={results.loading} onClick={() => setPage((value) => value + 1)}>Afficher plus</Button>
          </div>
        ) : null}
      </section>
    </Container>
  );
};

export default SearchPage;
