import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronRight, FileCheck, FileText, Layers3, SearchX } from 'lucide-react';
import { Button, Container, EmptyState, SkeletonRows, cx } from '../components/ui';
import useAsync from '../hooks/useAsync';
import useDebounce from '../hooks/useDebounce';
import { catalog, documents as documentsApi } from '../lib/api';
import { documentTitle, formatDate, hasCorrection, labelOf, loadErrorOf, organismeLabel } from '../lib/format';
import { findBySegment, segmentFor } from '../lib/slug';

/*
 * Parcours du catalogue : organisme → type de parcours → niveaux (concours, année…) → matière → sujets.
 * L'état vit dans l'URL (?o, pt, n, m) sous forme d'alias lisibles (/sujets?o=inphb&pt=mpsi&n=2022) :
 * retour navigateur, partage de lien, nouvel onglet et rechargement arrivent au même endroit.
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
  // Segments d'URL : alias lisibles (« inphb », « 2023 ») ou, pour les anciens liens, identifiants.
  const organismeSegment = params.get('o');
  const parcoursSegment = params.get('pt');
  const nodeParam = params.get('n') || '';
  const nodeSegments = useMemo(() => nodeParam.split(',').filter(Boolean), [nodeParam]);
  const matiereSegment = params.get('m');
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
  const organismeList = organismes.data?.data || [];
  const organisme = findBySegment(organismeList, organismeSegment);
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
  const trailKey = `${scope}|${nodeParam}|${matiereSegment || ''}|${levels.length}`;
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

  /** URL publique d'une position du parcours : uniquement des alias lisibles. */
  const paramsFor = ({ withOrganisme = true, withParcours = true, path = [], subject = null } = {}) => {
    const next = new URLSearchParams();
    if (!withOrganisme || !organisme) return next;
    next.set('o', segmentFor(organisme, organismeList));
    if (withParcours && parcoursType) next.set('pt', segmentFor(parcoursType, parcoursList));
    if (path.length) next.set('n', path.map(({ item, siblings }) => segmentFor(item, siblings)).join(','));
    if (subject) next.set('m', segmentFor(subject.item, subject.siblings));
    return next;
  };
  const go = (next) => setParams(next);

  // Ancien lien (identifiants MongoDB) ou alias en majuscules : l'adresse est réécrite sous sa
  // forme lisible, sans nouvelle entrée d'historique. Le lien d'origine continue de fonctionner.
  const canonical = ['noeud', 'matiere', 'documents', 'parcours'].includes(step)
    ? paramsFor({ withParcours: step !== 'parcours', path: nodes, subject: trail.data?.matiere }).toString()
    : null;
  const current = params.toString();
  useEffect(() => {
    if (canonical !== null && canonical !== current) setParams(new URLSearchParams(canonical), { replace: true });
  }, [canonical, current, setParams]);

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
    { label: 'Organismes', to: paramsFor({ withOrganisme: false }) },
    organisme && { label: organismeLabel(organisme), to: paramsFor({ withParcours: false }) },
    parcoursType && { label: labelOf(parcoursType), to: paramsFor() },
    ...nodes.map(({ item }, index) => ({ label: labelOf(item), to: paramsFor({ path: nodes.slice(0, index + 1) }) })),
    matiere && { label: labelOf(matiere), to: paramsFor({ path: nodes, subject: trail.data.matiere }) },
  ].filter(Boolean);

  // Lien en partie introuvable : on propose de revenir au dernier niveau valide.
  const lastValid = crumbs[crumbs.length - 1];

  const titles = {
    organisme: ['Choisissez un organisme', 'L’organisme qui a organisé le concours ou l’examen.'],
    parcours: ['Type de parcours', `Les parcours proposés par ${organismeLabel(organisme)}.`],
    noeud: [currentLevel?.libellePluriel || 'Niveaux', crumbs.slice(1).map((crumb) => crumb.label).join(' · ')],
    matiere: ['Matières', crumbs.slice(1).map((crumb) => crumb.label).join(' · ')],
    notfound: organisme
      ? ['Lien introuvable', 'Une partie de ce lien ne correspond plus à un contenu publié.']
      : ['Organisme introuvable', 'Ce lien ne correspond à aucun organisme publié.'],
    documents: [labelOf(matiere) || 'Sujets', crumbs.slice(1, -1).map((crumb) => crumb.label).join(' · ')],
    loading: ['Chargement…', ''],
    error: ['Chargement impossible', ''],
  };
  const [title, subtitle] = titles[step];

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
          action={<Button variant="secondary" onClick={() => go(lastValid.to)}>{organisme ? `Revenir à ${lastValid.label}` : 'Voir tous les organismes'}</Button>}
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
          to={`/sujets?o=${segmentFor(item, organismeList)}`}
          title={organismeLabel(item)}
          meta={item.subjectCount ? `${item.subjectCount} sujet${item.subjectCount > 1 ? 's' : ''}` : 'Sujets publiés'}
        />
      ));
    }

    if (step === 'parcours') {
      return filterItems(parcoursList).map((item) => (
        <Row key={item._id} to={`/sujets?${paramsFor({ withParcours: false }).toString()}&pt=${segmentFor(item, parcoursList)}`} title={labelOf(item)} />
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
          ? paramsFor({ path: [...nodes, { item, siblings }] })
          : paramsFor({ path: nodes, subject: { item, siblings } });
        return (
          <Row
            key={item._id}
            to={`/sujets?${next.toString()}`}
            title={labelOf(item)}
            meta={item.subjectCount ? `${item.subjectCount} sujet${item.subjectCount > 1 ? 's' : ''}` : undefined}
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
                <Link to={`/sujets${crumb.to.toString() ? `?${crumb.to.toString()}` : ''}`} className="text-ink-soft hover:text-burgundy">{crumb.label}</Link>
              )}
            </React.Fragment>
          );
        })}
      </nav>

      <div key={`${step}-${nodes.length}`} className="mt-6 flex animate-fade-up flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-[-0.03em] text-ink md:text-4xl">{title}</h1>
          {subtitle ? <p className="mt-1.5 text-ink-soft">{subtitle}</p> : null}
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
