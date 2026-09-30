import React, { useContext, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ArrowLeft, Download, FileCheck, FileText, Lock } from 'lucide-react';
import { Button, Card, Container, EmptyState, InfoRow, SkeletonRows } from '../components/ui';
import AccessModal from '../components/access/AccessModal';
import AuthContext from '../context/AuthContext';
import useAsync from '../hooks/useAsync';
import useEntitlements from '../hooks/useEntitlements';
import { documents, errorCode, errorMessage } from '../lib/api';
import { correctionOf, documentTitle, formatDate, formatFileSize, labelOf, nodeChain } from '../lib/format';

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

const DocumentPage = () => {
  const { id } = useParams();
  const location = useLocation();
  const { data: document, loading, error, reload } = useAsync(() => documents.get(id), [id]);
  const access = useProtectedDownload(location.pathname);

  if (loading && !document) {
    return <Container className="max-w-3xl py-12"><SkeletonRows count={5} /></Container>;
  }

  if (error || !document) {
    return (
      <Container className="max-w-3xl py-12">
        <EmptyState icon={FileText} title="Sujet introuvable" description="Ce document n’existe pas ou n’est plus disponible." onRetry={reload} />
      </Container>
    );
  }

  const correction = correctionOf(document);
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

  const eyebrow = [chain.map(labelOf).join(' · '), labelOf(document.matiereId)].filter(Boolean).join(' · ') || (isCorrection ? 'Corrigé' : 'Sujet');
  const noun = isCorrection ? 'le corrigé' : 'le sujet';

  return (
    <Container className="max-w-3xl py-8 md:py-12">
      <button type="button" onClick={() => window.history.back()} className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft hover:text-ink">
        <ArrowLeft size={16} /> Retour
      </button>

      <header className="mt-6 animate-fade-up">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gold-ink">{eyebrow}</p>
        <h1 className="mt-3 text-3xl font-bold leading-tight tracking-[-0.03em] text-ink md:text-[40px]">{documentTitle(document)}</h1>
        {document.description ? <p className="mt-3 text-lg leading-relaxed text-ink-soft">{document.description}</p> : null}
      </header>

      {access.locked ? (
        <button
          type="button"
          onClick={() => access.download(document._id)}
          className="mt-8 flex w-full items-center gap-4 rounded-2xl bg-gold-wash p-5 text-left transition-colors hover:bg-gold-wash/70"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white"><Lock size={18} className="text-ink" /></span>
          <span>
            <span className="block font-semibold text-ink">Document réservé aux membres</span>
            <span className="block text-sm text-ink-soft">
              {access.locked === 'AUTH_REQUIRED'
                ? 'Le document est disponible. Connectez-vous pour vérifier votre accès.'
                : 'Le document est disponible. Un abonnement actif est nécessaire pour le télécharger.'}
            </span>
          </span>
        </button>
      ) : null}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Button size="lg" icon={access.locked ? Lock : Download} loading={access.busyId === document._id} onClick={() => access.download(document._id)} className="sm:flex-1">
          {access.locked ? `Débloquer ${noun}` : `Télécharger ${noun}`}
        </Button>
        {correction ? (
          <Button size="lg" variant="secondary" icon={access.locked ? Lock : FileCheck} loading={access.busyId === correction._id} onClick={() => access.download(correction._id)} className="sm:flex-1">
            {access.locked ? 'Débloquer le corrigé' : 'Télécharger le corrigé'}
          </Button>
        ) : null}
      </div>
      {access.error ? <p className="mt-3 text-sm text-rose-600" role="alert">{access.error}</p> : null}
      {access.entitlements?.downloads && !access.entitlements.downloads.unlimited && !access.locked ? (
        <p className="mt-3 text-sm text-ink-muted">
          {`${access.entitlements.downloads.used} / ${access.entitlements.downloads.limit} téléchargements utilisés aujourd’hui`}
        </p>
      ) : null}

      {!isCorrection && !correction ? (
        <p className="mt-4 text-sm text-ink-soft">Le corrigé de ce sujet n’a pas encore été publié.</p>
      ) : null}

      <Card className="mt-10 px-5">
        {details.map(([label, value], index) => <InfoRow key={`${label}-${index}`} label={label} value={value} />)}
      </Card>

      <p className="mt-8 text-center text-sm text-ink-muted">
        Vous cherchez un autre sujet ? <Link to="/recherche" className="font-semibold text-burgundy hover:underline">Lancer une recherche</Link>
      </p>

      {access.modal}
    </Container>
  );
};

export default DocumentPage;
