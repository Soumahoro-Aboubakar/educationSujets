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
      index: isStaff(user) ? 1 : 0,
      // Onglets (plus de tiroir, § 5) ; l'équipe arrive sur l'administration, empilée sur « Moi ».
      routes: isStaff(user)
        ? [{ name: 'MainTabs', params: { screen: 'AccountTab' } }, { name: 'AdminTab' }]
        : [{ name: 'MainTabs', params: { screen: 'AccountTab' } }],
    });
  }, [navigation, route?.params?.returnTo]);
};
