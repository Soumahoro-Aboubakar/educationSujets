import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { createWebHandoff, getErrorMessage } from '../services/billing';
import { useRefreshAccount } from './useAccount';

/**
 * Ouvre la souscription web dans un navigateur intégré, déjà connecté grâce à un code de
 * passage à usage unique. Au retour dans l'app, les droits sont relus depuis le serveur.
 * L'URL n'est jamais affichée : elle vient de /api/me/entitlements (checkout.webCheckoutUrl).
 */
export const useWebCheckout = () => {
  const [opening, setOpening] = useState(false);
  const refreshAccount = useRefreshAccount();

  const open = useCallback(async (checkoutUrl, { promoCode } = {}) => {
    if (!checkoutUrl || opening) return;
    setOpening(true);
    try {
      const { code } = await createWebHandoff();
      const returnUrl = Linking.createURL('abonnement-retour');
      const params = new URLSearchParams({ handoff: code, source: 'app', return: returnUrl });
      if (promoCode) params.set('code', promoCode);
      await WebBrowser.openAuthSessionAsync(`${checkoutUrl}?${params.toString()}`, returnUrl);
    } catch (error) {
      Alert.alert('Abonnement', getErrorMessage(error, 'Impossible d’ouvrir la page d’abonnement pour le moment.'));
    } finally {
      setOpening(false);
      refreshAccount();
    }
  }, [opening, refreshAccount]);

  return { open, opening };
};
