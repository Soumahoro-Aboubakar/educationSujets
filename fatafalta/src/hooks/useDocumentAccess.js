import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import AuthContext from '../context/AuthContext';
import { useEntitlements } from './useAccount';
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
  const { data: entitlements, isFetching } = useEntitlements();
  const checkout = useWebCheckout();
  const [reason, setReason] = useState(null);
  const [limitInfo, setLimitInfo] = useState(null);
  const awaitingAuth = useRef(false);

  const locked = !isAuthenticated
    ? 'AUTH_REQUIRED'
    : entitlements && !entitlements.canDownload ? 'SUBSCRIPTION_REQUIRED' : null;

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
    guard,
    deny,
    sheetProps: {
      visible: Boolean(reason),
      reason,
      limitInfo,
      entitlements,
      onClose: close,
      onLogin: () => goToAuth('Login'),
      onRegister: () => goToAuth('Register'),
      onSubscribe: () => checkout.open(entitlements?.checkout?.webCheckoutUrl),
      subscribing: checkout.opening,
      onOpenDownloads: () => {
        setReason(null);
        navigation.navigate('Downloads');
      },
    },
  };
};
