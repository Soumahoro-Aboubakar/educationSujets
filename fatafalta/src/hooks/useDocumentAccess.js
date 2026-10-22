import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import AuthContext from '../context/AuthContext';
import { useDownloadQuota, useEntitlements } from './useAccount';
import { useWebCheckout } from './useWebCheckout';

/**
 * Orchestration de l'accès à un document protégé :
 *  - `locked` anticipe l'état (cadenas affiché avant tout appui) à partir des droits serveur ;
 *  - `guard(action)` ouvre la feuille d'accès au lieu de lancer l'action si besoin ;
 *  - `deny(code)` affiche le refus renvoyé par le serveur, qui reste l'autorité finale.
 * Après connexion ou abonnement, les droits sont relus et la feuille se met à jour seule.
 */
export const useDocumentAccess = (navigation) => {
  const { isAuthenticated } = useContext(AuthContext);
  const quota = useDownloadQuota();
  const { data: entitlements, isFetching } = useEntitlements();
  const checkout = useWebCheckout();
  const [reason, setReason] = useState(null);
  const [limitInfo, setLimitInfo] = useState(null);
  const awaitingAuth = useRef(false);

  // Plus de blocage anticipé : les sujets de 2009 et avant sont gratuits sans compte et les
  // sujets 2010-2020 ont un quota gratuit. Le serveur décide et la feuille explique son refus.
  const locked = null;

  // Retour de la connexion : on vérifie automatiquement l'abonnement.
  useEffect(() => {
    if (!awaitingAuth.current || !isAuthenticated || !entitlements || isFetching) return;
    awaitingAuth.current = false;
    setReason(entitlements.canDownload ? null : 'SUBSCRIPTION_REQUIRED');
  }, [isAuthenticated, entitlements, isFetching]);

  // Retour de la souscription : la feuille se ferme dès que l'accès est ouvert.
  useEffect(() => {
    if (reason === 'SUBSCRIPTION_REQUIRED' && entitlements?.canDownload) setReason(null);
  }, [reason, entitlements?.canDownload]);

  const deny = useCallback((code, details) => {
    setLimitInfo(details || null);
    setReason(code);
  }, []);

  const guard = useCallback((action) => () => {
    if (locked) {
      setReason(locked);
      return;
    }
    action();
  }, [locked]);

  const close = useCallback(() => setReason(null), []);

  const goToAuth = (screen) => {
    awaitingAuth.current = true;
    setReason(null);
    navigation.navigate(screen, { returnTo: 'back' });
  };

  return {
    locked,
    quota: quota.data,
    guard,
    deny,
    sheetProps: {
      visible: Boolean(reason),
      reason,
      limitInfo,
      entitlements,
      quota: quota.data,
      onClose: close,
      onLogin: () => goToAuth('Login'),
      onRegister: () => goToAuth('Register'),
      // Le paiement se fait sur le site ; au retour, les droits sont relus et la feuille se ferme seule.
      onSubscribe: () => checkout.open(entitlements?.checkout?.webCheckoutUrl),
      subscribing: checkout.opening,
      onOpenDownloads: () => {
        setReason(null);
        navigation.navigate('Downloads');
      },
    },
  };
};
