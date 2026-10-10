import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ChevronRight, FileCheck, FileText, Layers3, Search, SearchX, X } from 'lucide-react';
import { Breadcrumbs, Button, Container, EmptyState, SkeletonRows, cx } from '../components/ui';
import useAsync from '../hooks/useAsync';
import useDebounce from '../hooks/useDebounce';
import useSeo from '../hooks/useSeo';
import { catalog, documents as documentsApi } from '../lib/api';
import { documentTitle, formatDate, hasCorrection, labelOf, loadErrorOf, organismeLabel } from '../lib/format';
import { findBySegment, segmentFor } from '../lib/slug';
import { CATALOG_ROOT, catalogCrumbs, catalogPath, catalogSeo, catalogText } from '../lib/catalogSeo';
import { NOINDEX } from '../lib/seo';
import OrganismeLogo, { distinctPalette } from '../components/catalog/OrganismeLogo';

/*
 * Parcours du catalogue : organisme → type de parcours → niveaux (concours, année…) → matière → sujets.
 * L'état vit dans le chemin, sous forme d'alias lisibles (/sujets/inphb/mpsi/2022/francais) :
 * retour navigateur, partage de lien, nouvel onglet et rechargement arrivent au même endroit,
 * et chaque position a sa page pré-rendue pour les moteurs de recherche (scripts/prerender.mjs).
 * Les anciens liens (/sujets?o=inphb&pt=mpsi&n=2022&m=francais) restent valides et sont réécrits.
 */

const MATTER_LEVEL = { libelleSingulier: 'Matière', libellePluriel: 'Matières' };
const PAGE_SIZE = 20;

const Row = ({ to, onClick, title, meta, icon: Icon = ChevronRight, leading, trailing }) => {
  const content = (
    <>
      {leading}
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-[16px] font-semibold leading-snug tracking-[-0.01em] text-ink sm:truncate">{title}</p>
        {meta ? <p className="mt-0.5 truncate text-sm text-ink-soft">{meta}</p> : null}
      </div>
      {trailing}
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-muted transition-[background-color,color,transform] duration-200 group-hover:translate-x-0.5 group-hover:bg-paper-dim group-hover:text-ink">
        <Icon size={18} aria-hidden />
      </span>
    </>
  );
  const className = 'group flex min-h-[64px] w-full items-center gap-4 border-b border-line px-4 py-3.5 text-left transition-colors last:border-0 hover:bg-paper active:bg-paper-dim/60 sm:px-5';
  return to
    ? <Link to={to} className={className}>{content}</Link>
    : <button type="button" onClick={onClick} className={className}>{content}</button>;
};

const Filter = ({ value, onChange, placeholder }) => (
  <div className="relative w-full sm:max-w-xs">
    <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" aria-hidden />
    <input
      type="search"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      aria-label={placeholder}
      enterKeyHint="search"
      className="h-12 w-full appearance-none rounded-xl border border-line bg-white pl-10 pr-11 text-base text-ink transition-[border-color,box-shadow] duration-200 placeholder:text-ink-muted hover:border-line-strong focus:border-ink/40 focus:outline-none focus:ring-4 focus:ring-ink/[0.06] sm:h-11 sm:text-[15px] [&::-webkit-search-cancel-button]:hidden"
    />
    {value ? (
      <button type="button" onClick={() => onChange('')} aria-label="Effacer le filtre" className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 animate-fade-in items-center justify-center rounded-full text-ink-muted hover:text-ink">
        <X size={16} />
      </button>
    ) : null}
  </div>
);

const countLabel = (count) => (count ? `${count} sujet${count > 1 ? 's' : ''}` : undefined);

const safeDecode = (segment) => {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
};

const ExplorePage = () => {
  const { '*': splat = '' } = useParams();
  const [params] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  // Segments d'URL : alias lisibles (« inphb », « 2023 ») ou, pour les anciens liens, identifiants.
  const pathSegments = useMemo(() => splat.split('/').filter(Boolean).map(safeDecode), [splat]);
  const legacy = params.get('o') ? {
    parcours: params.get('pt'),
    nodes: (params.get('n') || '').split(',').filter(Boolean),
    matiere: params.get('m'),
  } : null;
  const organismeSegment = legacy ? params.get('o') : pathSegments[0] || null;
  const [filter, setFilter] = useState('');

  // Listes déjà chargées, par niveau : un clic ne relance aucune requête pour résoudre le chemin.
  const lists = useRef(new Map());
  const cachedList = (key, load) => {
    if (!lists.current.has(key)) {
      lists.current.set(key, load().catch((error) => {
        lists.current.delete(key);
        throw error;
      }));
    }
    return lists.current.get(key);
  };

  const organismes = useAsync(() => catalog.organismes({ limit: 100 }), []);
  const organismeList = useMemo(() => organismes.data?.data || [], [organismes.data]);
  const organisme = findBySegment(organismeList, organismeSegment);
  // Couleurs des monogrammes réparties sur la liste complète : identiques sur toutes les pages.
  const colors = useMemo(() => distinctPalette(organismeList), [organismeList]);
  const organismeId = organisme?._id;
  const levels = organisme?.structure?.niveaux || [];

  // Chaque résultat porte la clé de l'URL qu'il résout : un résultat d'une URL précédente n'est
  // jamais utilisé (useAsync ne passe en chargement qu'après le rendu qui suit un changement).
  const parcoursTypes = useAsync(
    async () => ({ ...(await catalog.parcoursTypes(organismeId)), organismeId }),
    [organismeId],
    { enabled: Boolean(organismeId) },
  );
  const parcoursFresh = Boolean(parcoursTypes.data) && parcoursTypes.data.organismeId === organismeId && !parcoursTypes.loading;
  const parcoursList = parcoursFresh ? parcoursTypes.data.data : [];
  const needsParcours = parcoursList.length > 0;
  // Après l'organisme : [parcours], un segment par niveau, puis la matière.
  const tail = pathSegments.slice(needsParcours ? 2 : 1);
  const parcoursSegment = legacy ? legacy.parcours : (needsParcours ? pathSegments[1] : null);
  const nodeSegments = legacy ? legacy.nodes : tail.slice(0, levels.length);
  const matiereSegment = legacy ? legacy.matiere : tail[levels.length] || null;
  const extraSegments = !legacy && tail.length > levels.length + 1;
  const parcoursType = needsParcours ? findBySegment(parcoursList, parcoursSegment) : null;
  const parcoursTypeId = parcoursType?._id;
  const parcoursReady = Boolean(organismeId) && parcoursFresh && (!needsParcours || Boolean(parcoursType));
  const scope = `${organismeId}|${parcoursTypeId || ''}`;

  const nodeList = (parentId) => cachedList(`${scope}|noeuds|${parentId}`, () => catalog.noeuds({
    organismeId, parcoursTypeId, parentId, page: 1, limit: 100,
  }));
  const matiereList = (noeudId) => cachedList(`${scope}|matieres|${noeudId}`, () => catalog.matieres({
    organismeId, parcoursTypeId, noeudId, page: 1, limit: 100,
  }));

  // Lien direct, actualisation, lien partagé : chaque segment est retrouvé parmi les éléments
  // publiés de son niveau, dans l'ordre (organisme → parcours → niveaux → matière).
  const trailKey = `${scope}|${nodeSegments.join(',')}|${matiereSegment || ''}|${levels.length}`;
  const trail = useAsync(async () => ({ key: trailKey, ...(await resolveTrail()) }), [trailKey], { enabled: parcoursReady });
  async function resolveTrail() {
    const nodes = [];
    for (const segment of nodeSegments.slice(0, levels.length)) {
      const siblings = (await nodeList(nodes[nodes.length - 1]?.item._id || 'root')).data;
      const item = findBySegment(siblings, segment);
      if (!item) return { nodes, missing: 'noeud' };
      nodes.push({ item, siblings });
    }
    if (!matiereSegment || nodes.length < levels.length) return { nodes, matiere: null };
    const siblings = (await matiereList(nodes[nodes.length - 1].item._id)).data;
    const item = findBySegment(siblings, matiereSegment);
    return item ? { nodes, matiere: { item, siblings } } : { nodes, missing: 'matiere' };
  }
  const trailFresh = Boolean(trail.data) && trail.data.key === trailKey && !trail.loading;

  const nodes = (trailFresh && trail.data.nodes) || [];
  const matiere = (trailFresh && trail.data.matiere?.item) || null;
  const leaf = nodes[nodes.length - 1]?.item || null;

  const step = !organismeSegment ? 'organisme'
    : organismes.error ? 'error'
      : !organismes.data ? 'loading'
        : !organisme ? 'notfound'
          : parcoursTypes.error ? 'error'
            : !parcoursFresh ? 'loading'
              : needsParcours && !parcoursSegment ? 'parcours'
                : needsParcours && !parcoursType ? 'notfound'
                  : extraSegments ? 'notfound'
                  : trail.error ? 'error'
                    // Résolution en cours : jamais d'affichage (ni de réécriture d'URL) sur l'ancien chemin.
                    : !trailFresh ? 'loading'
                      : trail.data.missing ? 'notfound'
                        : nodes.length < levels.length ? 'noeud'
                          : !matiere ? 'matiere'
                            : 'documents';

  // Liste du niveau affiché (niveau suivant, ou matières du dernier niveau).
  const levelKey = `${step}|${scope}|${leaf?._id || 'root'}`;
  const levelItems = useAsync(
    async () => ({ key: levelKey, ...(await (step === 'noeud' ? nodeList(leaf?._id || 'root') : matiereList(leaf._id))) }),
    [levelKey],
    { enabled: step === 'noeud' || step === 'matiere' },
  );
  const levelFresh = levelItems.data?.key === levelKey && !levelItems.loading;

  /** Adresse publique d'une position du parcours : uniquement des alias lisibles. */
  const pathFor = ({ withOrganisme = true, withParcours = true, path = [], subject = null } = {}) => {
    if (!withOrganisme || !organisme) return CATALOG_ROOT;
    return catalogPath([
      segmentFor(organisme, organismeList),
      withParcours && parcoursType ? segmentFor(parcoursType, parcoursList) : null,
      ...path.map(({ item, siblings }) => segmentFor(item, siblings)),
      subject ? segmentFor(subject.item, subject.siblings) : null,
    ]);
  };

  // Ancien lien (?o=…, identifiants MongoDB) ou alias en majuscules : l'adresse est réécrite sous
  // sa forme lisible, sans nouvelle entrée d'historique. Le lien d'origine continue de fonctionner.
  const canonical = ['noeud', 'matiere', 'documents', 'parcours'].includes(step)
    ? pathFor({ withParcours: step !== 'parcours', path: nodes, subject: trail.data?.matiere })
    : step === 'organisme' ? CATALOG_ROOT : null;
  // Les autres paramètres (utm_source…) sont conservés ; ceux d'un ancien lien sont remplacés par le chemin.
  const isLegacy = Boolean(legacy);
  useEffect(() => {
    if (canonical === null || (canonical === location.pathname && !isLegacy)) return;
    navigate(`${canonical}${isLegacy ? '' : location.search}${location.hash}`, { replace: true });
  }, [canonical, isLegacy, location.pathname, location.search, location.hash, navigate]);

  const [page, setPage] = useState(1);
  const [docs, setDocs] = useState([]);
  const docsQuery = useDebounce(step === 'documents' ? filter : '', 300);
  const documentsState = useAsync(async () => {
    const result = await documentsApi.list({
      noeudId: leaf._id,
      matiereId: matiere._id,
      parcoursTypeId,
      type: 'sujet',
      recherche: docsQuery || undefined,
      page,
      limit: PAGE_SIZE,
    });
    return { ...result, requestedPage: page };
  }, [leaf?._id, matiere?._id, parcoursTypeId, docsQuery, page], { enabled: step === 'documents' });

  // Alimentation depuis la réponse la plus récente uniquement (useAsync ignore les réponses obsolètes).
  useEffect(() => {
    const result = documentsState.data;
    if (!result) return;
    setDocs((existing) => (result.requestedPage > 1 ? [...existing, ...result.data] : result.data));
  }, [documentsState.data]);

  useEffect(() => {
    setFilter('');
    setPage(1);
    setDocs([]);
  }, [step, leaf?._id, matiere?._id]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [organismeId, parcoursTypeId, nodes.length, matiere?._id]);

  const currentLevel = step === 'matiere' ? MATTER_LEVEL : levels[nodes.length];

  const crumbs = [
    { label: 'Organismes', to: pathFor({ withOrganisme: false }) },
    organisme && { label: organismeLabel(organisme), to: pathFor({ withParcours: false }), logo: organisme },
    parcoursType && { label: labelOf(parcoursType), to: pathFor() },
    ...nodes.map(({ item }, index) => ({ label: labelOf(item), to: pathFor({ path: nodes.slice(0, index + 1) }) })),
    matiere && { label: labelOf(matiere), to: pathFor({ path: nodes, subject: trail.data.matiere }) },
  ].filter(Boolean);

  // Lien en partie introuvable : on propose de revenir au dernier niveau valide.
  const lastValid = crumbs[crumbs.length - 1];

  // Sujets publiés à la position affichée (compteurs du catalogue) : repris dans la description.
  const positionCount = matiere ? trail.data.matiere.item.subjectCount
    : nodes.length ? nodes[nodes.length - 1].item.subjectCount
      : !parcoursType ? organisme?.subjectCount : undefined;
  const text = ['organisme', 'parcours', 'noeud', 'matiere', 'documents'].includes(step)
    ? catalogText({
      organismes: organismeList, organisme, parcoursType, nodes: nodes.map(({ item }) => item), matiere, levels, step, count: positionCount,
    })
    : null;

  const titles = {
    notfound: organisme
      ? ['Lien introuvable', 'Une partie de ce lien ne correspond plus à un contenu publié.']
      : ['Organisme introuvable', 'Ce lien ne correspond à aucun organisme publié.'],
    loading: ['Chargement…', ''],
    error: ['Chargement impossible', ''],
  };
  const [title, subtitle] = text ? [text.h1, text.description] : titles[step];
  const listHeading = text ? (step === 'noeud' ? currentLevel?.libellePluriel || text.listHeading : text.listHeading) : null;

  // Une position introuvable n'est pas indexée ; une position valide a son adresse canonique.
  // Métadonnées appliquées une fois la liste affichée : la page pré-rendue est remplacée d'un coup.
  const listReady = step === 'noeud' || step === 'matiere' ? levelFresh
    : step === 'documents' ? Boolean(documentsState.data) || Boolean(documentsState.error)
      : true;
  useSeo(text && canonical && listReady
    ? catalogSeo({ text, path: canonical, crumbs: catalogCrumbs(crumbs.slice(1).map(({ label, to }) => ({ label, path: to }))) })
    : step === 'notfound' ? { title: titles.notfound[0], description: titles.notfound[1], robots: NOINDEX } : null);

  const filterItems = (items, label = labelOf) => {
    const normalized = filter.trim().toLocaleLowerCase();
    return normalized ? items.filter((item) => label(item).toLocaleLowerCase().includes(normalized)) : items;
  };

  const errorState = (error, what, onRetry) => {
    const { title: errorTitle, description } = loadErrorOf(error, what);
    return <EmptyState icon={Layers3} title={errorTitle} description={description} onRetry={onRetry} />;
  };

  const renderList = () => {
    if (step === 'loading' || (step === 'organisme' && organismes.loading && !organismes.data)) return <div className="p-5"><SkeletonRows count={6} /></div>;

    if (step === 'error') {
      const failed = organismes.error ? organismes : parcoursTypes.error ? parcoursTypes : trail;
      return errorState(failed.error, 'Le catalogue', failed.reload);
    }

    if (step === 'notfound') {
      return (
        <EmptyState
          icon={SearchX}
          title={titles.notfound[0]}
          description={titles.notfound[1]}
          action={<Button variant="secondary" onClick={() => navigate(lastValid.to)}>{organisme ? `Revenir à ${lastValid.label}` : 'Voir tous les organismes'}</Button>}
        />
      );
    }

    if (step === 'organisme') {
      if (organismes.error) return errorState(organismes.error, 'Le catalogue', organismes.reload);
      const items = filterItems(organismeList, organismeLabel);
      if (!items.length) return <EmptyState icon={SearchX} title="Aucun résultat" description="Aucun organisme ne correspond à votre recherche." />;
      return items.map((item) => (
        <Row
          key={item._id}
          to={catalogPath([segmentFor(item, organismeList)])}
          leading={<OrganismeLogo organisme={item} size="md" paletteIndex={colors[item._id]} />}
          title={organismeLabel(item)}
          meta={countLabel(item.subjectCount) || 'Sujets publiés'}
        />
      ));
    }

    if (step === 'parcours') {
      return filterItems(parcoursList).map((item) => (
        <Row key={item._id} to={`${pathFor({ withParcours: false })}/${encodeURIComponent(segmentFor(item, parcoursList))}`} title={labelOf(item)} />
      ));
    }

    if (step === 'noeud' || step === 'matiere') {
      if (levelItems.error) return errorState(levelItems.error, 'Ce niveau', levelItems.reload);
      if (!levelFresh) return <div className="p-5"><SkeletonRows count={5} /></div>;
      const siblings = levelItems.data.data;
      const items = filterItems(siblings);
      if (!items.length) return <EmptyState icon={SearchX} title="Rien ici pour le moment" description="Aucun élément ne correspond." />;
      return items.map((item) => {
        const next = step === 'noeud'
          ? pathFor({ path: [...nodes, { item, siblings }] })
          : pathFor({ path: nodes, subject: { item, siblings } });
        return (
          <Row
            key={item._id}
            to={next}
            title={labelOf(item)}
            meta={countLabel(item.subjectCount)}
          />
        );
      });
    }

    if (documentsState.loading && !docs.length) return <div className="p-5"><SkeletonRows count={5} /></div>;
    // Une erreur sur la première page n'est jamais masquée par une liste précédente.
    if (documentsState.error && (page === 1 || !docs.length)) return errorState(documentsState.error, 'La liste des sujets', documentsState.reload);
    if (!docs.length) return <EmptyState icon={FileText} title="Aucun sujet" description={filter ? 'Aucun sujet ne correspond à ce filtre.' : 'Aucun sujet publié pour cette matière.'} />;

    return docs.map((document) => {
      const correction = hasCorrection(document);
      return (
        <Row
          key={document._id}
          to={`/sujets/document/${document._id}`}
          title={documentTitle(document)}
          leading={(
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-paper-dim text-ink">
              <FileText size={18} aria-hidden />
            </span>
          )}
          meta={(
            <span className="inline-flex items-center gap-2">
              {formatDate(document.dateAjout || document.createdAt)}
              {correction ? <span className="inline-flex items-center gap-1 font-medium text-gold-ink"><FileCheck size={13} aria-hidden /> Corrigé</span> : null}
            </span>
          )}
        />
      );
    });
  };

  const hasMoreDocs = step === 'documents' && documentsState.data?.pagination && documentsState.data.pagination.pages > page;

  return (
    <Container className="py-8 md:py-12">
      <Breadcrumbs
        crumbs={crumbs.map((crumb) => ({
          label: crumb.label,
          to: crumb.to,
          leading: crumb.logo ? <OrganismeLogo organisme={crumb.logo} size="xs" paletteIndex={colors[crumb.logo._id]} /> : null,
        }))}
      />

      <div key={`${step}-${nodes.length}`} className="mt-4 flex animate-fade-up flex-col justify-between gap-5 sm:mt-6 sm:flex-row sm:items-end">
        <div className="flex min-w-0 items-center gap-4">
          {/* Dans le parcours d'un organisme, son logo rappelle en permanence où l'on se trouve. */}
          {organisme && step !== 'notfound' && step !== 'error' ? <OrganismeLogo organisme={organisme} size="lg" paletteIndex={colors[organisme._id]} className="hidden sm:inline-flex" /> : null}
          <div className="min-w-0">
            <h1 className="text-title-lg font-bold text-ink">{title}</h1>
            {subtitle ? <p className="mt-2 max-w-2xl text-ink-soft">{subtitle}</p> : null}
          </div>
        </div>
        {step !== 'loading' && step !== 'notfound' && step !== 'error' ? (
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

      {listHeading ? <h2 className="mt-8 text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">{listHeading}</h2> : null}
      <div
        key={`list-${step}-${leaf?._id || organismeId || 'root'}-${matiere?._id || ''}`}
        className={cx(listHeading ? 'mt-3' : 'mt-6', 'stagger overflow-hidden rounded-2xl border border-line bg-white shadow-soft', step === 'loading' && 'opacity-80')}
      >
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
