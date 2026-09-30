import { useCallback, useRef } from 'react';

const isStaff = (user) => user?.role === 'admin' || user?.role === 'sub-admin';

/**
 * Destination après connexion ou inscription.
 * `returnTo: 'back'` (depuis un document protégé) ramène à l'écran d'origine ;
 * sinon l'utilisateur rejoint l'application (l'administration pour l'équipe).
 * Le verrou évite une double navigation (effet d'état + retour de la requête).
 */
export const useAuthRedirect = (navigation, route) => {
  const done = useRef(false);

  return useCallback((user) => {
    if (done.current) return;
    done.current = true;

    if (route?.params?.returnTo === 'back' && navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    navigation.reset({
      index: 0,
      // MainTabs (tiroir) → AppTabs (onglets) → onglet cible.
      routes: [{ name: 'MainTabs', params: { screen: 'AppTabs', params: { screen: isStaff(user) ? 'AdminTab' : 'AccountTab' } } }],
    });
  }, [navigation, route?.params?.returnTo]);
};
