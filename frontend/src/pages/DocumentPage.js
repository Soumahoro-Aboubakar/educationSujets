import React, { useContext, useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Download, FileCheck, FileText, Lock, Search } from 'lucide-react';
import { Breadcrumbs, Button, Card, Container, EmptyState, ErrorNote, InfoRow, Skeleton } from '../components/ui';
import AccessModal from '../components/access/AccessModal';
import AuthContext from '../context/AuthContext';
import useAsync from '../hooks/useAsync';
import useEntitlements from '../hooks/useEntitlements';
import useSeo from '../hooks/useSeo';
import { catalog, documents, errorCode, errorMessage } from '../lib/api';
import { catalogCrumbs, catalogPath, documentSeo } from '../lib/catalogSeo';
import { correctionOf, documentTitle, formatDate, formatFileSize, hasCorrection, hasIncludedCorrection, labelOf, nodeChain, organismeLabel } from '../lib/format';
import { NOINDEX } from '../lib/seo';
import { trackEvent } from '../lib/analytics';
import { segmentFor, slugOf } from '../lib/slug';

const ACCESS_CODES = ['AUTH_REQUIRED', 'SUBSCRIPTION_REQUIRED', 'DAILY_LIMIT_REACHED', 'ACCOUNT_DISABLED'];

/**
 * Téléchargement contrôlé : le bouton est un guide, le serveur reste seul juge.
 * En cas de refus, la fenêtre d'accès explique la situation au lieu d'un message d'erreur brut.
 */
const useProtectedDownload = (next) => {
  const { user } = useContext(AuthContext);
  const entitlements = useEntitlements();
  const [reason, setReason] = useState(null);
  const [limitInfo, setLimitInfo] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState(null);

  const locked = !user ? 'AUTH_REQUIRED' : entitlements.data && !entitlements.data.canDownload ? 'SUBSCRIPTION_REQUIRED' : null;

  const download = async (documentId) => {
    setError(null);
    trackEvent('download_click', { document_id: documentId, locked: Boolean(locked) });
    if (locked) {
      setReason(locked);
      return;
    }
    setBusyId(documentId);
    // Onglet ouvert pendant le clic : un window.open après une requête serait bloqué.
    const tab = window.open('about:blank', '_blank');
    try {
      const { url } = await documents.downloadUrl(documentId);
      if (tab) {
        tab.opener = null;
        tab.location.href = url;
      } else {
        window.location.assign(url);
      }
      entitlements.reload();
    } catch (requestError) {
      tab?.close();
      const code = errorCode(requestError);
      if (ACCESS_CODES.includes(code)) {
        setLimitInfo(requestError.response?.data?.details || null);
        setReason(code);
      } else {
        setError(errorMessage(requestError, 'Le téléchargement n’a pas pu démarrer.'));
      }
    } finally {
      setBusyId(null);
    }
  };

  return {
    locked,
    download,
    busyId,
    error,
    entitlements: entitlements.data,
    modal: <AccessModal reason={reason} onClose={() => setReason(null)} next={next} entitlements={entitlements.data} limitInfo={limitInfo} />,
  };
};

/**
 * Position du sujet dans le catalogue (organisme → parcours → niveaux → matière), avec l'adresse
 * de chaque étape : fil d'Ariane cliquable, et liens explorables par les moteurs de recherche.
 */
const catalogContext = (document, organismeList) => {
  const nodes = nodeChain(document?.noeudId);
  const organismeId = String(document?.noeudId?.organismeId || document?.matiereId?.organismeId || '');
  const organisme = organismeList.find((item) => String(item._id) === organismeId) || null;
  if (!organisme) return { organisme: null, nodes, crumbs: [] };
  const parcoursType = document.parcoursTypeId?.nom ? document.parcoursTypeId : null;
  const matiere = document.matiereId?.nom ? document.matiereId : null;
  const steps = [
    { label: organismeLabel(organisme), segment: segmentFor(organisme, organismeList) },
    parcoursType && { label: labelOf(parcoursType), segment: slugOf(parcoursType) },
    ...nodes.map((node) => ({ label: labelOf(node), segment: slugOf(node) })),
    matiere && { label: labelOf(matiere), segment: slugOf(matiere) },
  ].filter(Boolean);
  const crumbs = catalogCrumbs(steps.map(({ label }, index) => ({
    label,
    path: catalogPath(steps.slice(0, index + 1).map(({ segment }) => segment)),
  })));
  return { organisme, parcoursType, nodes, matiere, crumbs };
};

const DocumentPage = () => {
  const { id } = useParams();
  const location = useLocation();
  const { data: document, loading, error, reload } = useAsync(() => documents.get(id), [id]);
  const organismes = useAsync(() => catalog.organismes({ limit: 100 }), []);
  const access = useProtectedDownload(location.pathname);
  const context = catalogContext(document, organismes.data?.data || []);

  const documentId = document?._id;
  const organismeName = context.organisme ? organismeLabel(context.organisme) : null;
  useEffect(() => {
    if (documentId && organismeName) trackEvent('view_item', { document_id: documentId, organisme: organismeName });
  }, [documentId, organismeName]);

  useSeo(document && !organismes.loading
    ? documentSeo({ ...document, hasCorrection: hasCorrection(document) }, context)
    : error ? { title: 'Sujet introuvable', description: 'Ce document n’existe pas ou n’est plus disponible.', robots: NOINDEX } : null);

  if (loading && !document) {
    return (
      <Container className="py-8 md:py-12">
        <div role="status" aria-label="Chargement du sujet" className="grid gap-8 lg:grid-cols-[1fr_360px] lg:gap-12">
          <div className="space-y-4">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="mt-6 h-4 w-24" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-24 w-full" />
          </div>
          <Skeleton className="h-72 rounded-3xl" />
        </div>
      </Container>
    );
  }

  if (error || !document) {
    return (
      <Container className="max-w-3xl py-12">
        <EmptyState icon={FileText} title="Sujet introuvable" description="Ce document n’existe pas ou n’est plus disponible." onRetry={reload} action={<Button to="/sujets" variant="ghost" size="sm">Parcourir les sujets</Button>} />
      </Container>
    );
  }

  const correction = correctionOf(document);
  const correctionIncluded = hasIncludedCorrection(document);
  const isCorrection = document.documentType === 'corrige' || document.type === 'correction';
  const chain = nodeChain(document.noeudId);
  const details = [
    ['Parcours', labelOf(document.parcoursTypeId)],
    ...chain.map((node) => ['Niveau', labelOf(node)]),
    ['Matière', labelOf(document.matiereId)],
    ['Institution', document.institution?.name],
    ['Université', document.university?.name],
    ['Session', document.semester?.name],
    ['Catégorie', document.category?.name],
    ['Format', [String(document.extension || 'pdf').replace('.', '').toUpperCase(), formatFileSize(document.fileSize)].filter(Boolean).join(' · ')],
    ['Ajouté le', formatDate(document.dateAjout || document.createdAt)],
  ].filter(([, value]) => Boolean(value));

  // Le fil d'Ariane donne déjà la position ; sans lui, la chaîne sert de repère au-dessus du titre.
  const chainLabel = [chain.map(labelOf).join(' · '), labelOf(document.matiereId)].filter(Boolean).join(' · ');
  const noun = isCorrection ? 'le corrigé' : 'le sujet';
  const format = String(document.extension || 'pdf').replace('.', '').toUpperCase();
  const listing = context.crumbs.length > 1 ? context.crumbs[context.crumbs.length - 1] : null;

  return (
    <Container className="py-6 md:py-12">
      {context.crumbs.length ? (
        <Breadcrumbs crumbs={context.crumbs.map((crumb) => ({ label: crumb.label, to: crumb.path }))} currentIsLink />
      ) : (
        <button type="button" onClick={() => window.history.back()} className="-ml-2 inline-flex h-10 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-ink-soft hover:text-ink">
          <ArrowLeft size={16} /> Retour
        </button>
      )}

      <div className="mt-5 grid gap-6 md:mt-8 lg:grid-cols-[1fr_360px] lg:gap-x-12 lg:gap-y-8">
        <header className="min-w-0 animate-rise-in lg:col-start-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-ink px-2.5 py-1 text-xs font-semibold text-white">
              <FileText size={12} aria-hidden /> {isCorrection ? 'Corrigé' : 'Sujet'}
            </span>
            {correction || correctionIncluded ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-gold-wash px-2.5 py-1 text-xs font-semibold text-gold-ink">
                <FileCheck size={12} aria-hidden /> {correction ? 'Corrigé disponible' : 'Corrigé inclus'}
              </span>
            ) : null}
            {!context.crumbs.length && chainLabel ? <span className="text-xs font-semibold uppercase tracking-[0.12em] text-gold-ink">{chainLabel}</span> : null}
          </div>
          <h1 className="mt-4 text-title-lg font-bold text-ink">{documentTitle(document)}</h1>
          {document.description ? <p className="mt-4 max-w-2xl text-[17px] leading-relaxed text-ink-soft">{document.description}</p> : null}
        </header>

        {/* Accès au fichier : en vue sur mobile juste après le titre, épinglé à droite sur ordinateur. */}
        <aside className="lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <div className="animate-rise-in rounded-3xl border border-line bg-white p-5 shadow-soft [animation-delay:80ms] sm:p-6 lg:sticky lg:top-24">
            <div className="flex items-center gap-4">
              {/* Vignette du fichier : une feuille cornée, le format en étiquette. */}
              <div className="relative h-[72px] w-14 shrink-0 rounded-lg border border-line bg-paper shadow-soft" aria-hidden>
                <span className="absolute right-0 top-0 h-4 w-4 rounded-bl-md border-b border-l border-line bg-paper-dim" />
                <span className="absolute inset-x-2.5 top-6 h-1 rounded-full bg-ink/70" />
                <span className="absolute inset-x-2.5 top-[34px] h-1 rounded-full bg-paper-dim" />
                <span className="absolute left-2.5 right-5 top-[42px] h-1 rounded-full bg-paper-dim" />
                <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 rounded bg-burgundy px-1.5 py-0.5 text-[9px] font-bold tracking-wide text-white">{format}</span>
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-ink">{access.locked ? 'Document réservé aux membres' : 'Prêt à télécharger'}</p>
                <p className="mt-0.5 text-sm text-ink-soft">
                  {access.locked === 'AUTH_REQUIRED'
                    ? 'Le document est disponible. Connectez-vous pour vérifier votre accès.'
                    : access.locked
                      ? 'Le document est disponible. Un abonnement actif est nécessaire pour le télécharger.'
                      : [format, formatFileSize(document.fileSize)].filter(Boolean).join(' · ')}
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-2">
              <Button size="lg" icon={access.locked ? Lock : Download} loading={access.busyId === document._id} onClick={() => access.download(document._id)}>
                {access.locked ? `Débloquer ${noun}` : `Télécharger ${noun}`}
              </Button>
              {correction ? (
                <Button size="lg" variant="secondary" icon={access.locked ? Lock : FileCheck} loading={access.busyId === correction._id} onClick={() => access.download(correction._id)}>
                  {access.locked ? 'Débloquer le corrigé' : 'Télécharger le corrigé'}
                </Button>
              ) : null}
            </div>
            <ErrorNote className="mt-3">{access.error}</ErrorNote>

            {access.entitlements?.downloads && !access.entitlements.downloads.unlimited && !access.locked ? (
              <div className="mt-4">
                <div className="flex items-baseline justify-between text-xs text-ink-muted">
                  <span>Téléchargements aujourd’hui</span>
                  <span className="tabular font-semibold text-ink-soft">{`${access.entitlements.downloads.used} / ${access.entitlements.downloads.limit}`}</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-paper-dim" role="progressbar" aria-label="Téléchargements utilisés aujourd’hui" aria-valuenow={access.entitlements.downloads.used} aria-valuemin={0} aria-valuemax={access.entitlements.downloads.limit}>
                  <div className="h-full origin-left rounded-full bg-ink transition-transform duration-700 ease-emphasized" style={{ transform: `scaleX(${Math.min(1, access.entitlements.downloads.used / (access.entitlements.downloads.limit || 1))})` }} />
                </div>
              </div>
            ) : null}

            {correctionIncluded && !correction ? (
              <p className="mt-4 flex items-start gap-2 border-t border-line pt-4 text-sm text-gold-ink">
                <FileCheck size={15} className="mt-0.5 shrink-0" aria-hidden /> Corrigé inclus : il se trouve dans le même PDF, à la suite du sujet.
              </p>
            ) : !isCorrection && !correction ? (
              <p className="mt-4 border-t border-line pt-4 text-sm text-ink-soft">Le corrigé de ce sujet n’a pas encore été publié.</p>
            ) : null}
          </div>
        </aside>

        <Card className="min-w-0 animate-rise-in self-start px-5 [animation-delay:120ms] lg:col-start-1">
          <h2 className="border-b border-line py-3.5 text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">Fiche du document</h2>
          {details.map(([label, value], index) => <InfoRow key={`${label}-${index}`} label={label} value={value} />)}
        </Card>
      </div>

      <nav aria-label="Continuer" className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2 md:mt-14">
        {listing ? (
          <Link to={listing.path} className="group flex min-w-0 items-center gap-4 rounded-2xl border border-line bg-white p-4 transition-[border-color,box-shadow] duration-200 hover:border-line-strong hover:shadow-soft">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-paper-dim"><FileText size={18} className="text-ink" aria-hidden /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm text-ink-soft">Tous les sujets</span>
              <span className="block truncate font-semibold text-ink">{context.crumbs.slice(1).map((crumb) => crumb.label).join(' · ')}</span>
            </span>
            <ArrowRight size={17} className="shrink-0 text-ink-muted transition-transform group-hover:translate-x-0.5 group-hover:text-ink" aria-hidden />
          </Link>
        ) : null}
        <Link to="/recherche" className="group flex items-center gap-4 rounded-2xl border border-line bg-white p-4 transition-[border-color,box-shadow] duration-200 hover:border-line-strong hover:shadow-soft">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-paper-dim"><Search size={18} className="text-ink" aria-hidden /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm text-ink-soft">Vous cherchez un autre sujet ?</span>
            <span className="block font-semibold text-ink">Lancer une recherche</span>
          </span>
          <ArrowRight size={17} className="shrink-0 text-ink-muted transition-transform group-hover:translate-x-0.5 group-hover:text-ink" aria-hidden />
        </Link>
      </nav>

      {access.modal}
    </Container>
  );
};

export default DocumentPage;
