import { useCallback, useRef } from 'react';
import { openAccountPageAfterAuth, THEN_SUBSCRIPTION } from './useAccountLink';

const isStaff = (user) => user?.role === 'admin' || user?.role === 'sub-admin';

/**
 * Destination après connexion ou inscription.
 * `returnTo: 'back'` (depuis un document protégé) ramène à l'écran d'origine ;
 * sinon l'utilisateur rejoint l'application (l'administration pour l'équipe).
 * `then: 'abonnement'` (bouton « Voir mon abonnement » sans compte) ouvre ensuite le site.
 * Le verrou évite une double navigation (effet d'état + retour de la requête).
 */
export const useAuthRedirect = (navigation, route) => {
  const done = useRef(false);

  return useCallback((user) => {
    if (done.current) return;
    done.current = true;
    // Demande « Voir mon abonnement » faite avant d'être connecté : on la reprend tout de suite.
    if (route?.params?.then === THEN_SUBSCRIPTION) setTimeout(() => { openAccountPageAfterAuth(); }, 350);

    if (route?.params?.returnTo === 'back' && navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    navigation.reset({
      index: isStaff(user) ? 1 : 0,
      // Onglets (plus de tiroir, § 5) ; l'équipe arrive sur l'administration, empilée sur « Moi ».
      routes: isStaff(user)
        ? [{ name: 'MainTabs', params: { screen: 'AccountTab' } }, { name: 'AdminTab' }]
        : [{ name: 'MainTabs', params: { screen: 'AccountTab' } }],
    });
  }, [navigation, route?.params?.returnTo, route?.params?.then]);
};
