import { getErrorAlert } from '../utils/userMessages';
import { useCallback } from 'react';
import useAsyncAction from './useAsyncAction';
import { Alert } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { createWebHandoff } from '../services/billing';
import { useRefreshAccount } from './useAccount';
import { PURCHASE_FLOW_AVAILABLE } from '../utils/storePolicy';

/**
 * Ouvre la souscription web dans un navigateur intégré, déjà connecté grâce à un code de
 * passage à usage unique. Au retour dans l'app, les droits sont relus depuis le serveur.
 * L'URL n'est jamais affichée : elle vient de /api/me/entitlements (checkout.webCheckoutUrl).
 */
export const useWebCheckout = () => {
  const [run, opening] = useAsyncAction();
  const refreshAccount = useRefreshAccount();

  const open = useCallback((checkoutUrl, { promoCode } = {}) => run(async () => {
    // Builds stores : aucun parcours d'achat, quelle que soit l'URL reçue (voir utils/storePolicy).
    if (!PURCHASE_FLOW_AVAILABLE || !checkoutUrl) return;
    try {
      const { code } = await createWebHandoff();
      const returnUrl = Linking.createURL('abonnement-retour');
      const params = new URLSearchParams({ handoff: code, source: 'app', return: returnUrl });
      if (promoCode) params.set('code', promoCode);
      await WebBrowser.openAuthSessionAsync(`${checkoutUrl}?${params.toString()}`, returnUrl);
    } catch (error) {
      Alert.alert(...getErrorAlert(error, 'abonnement', 'tu'));
    } finally {
      refreshAccount();
    }
  }), [run, refreshAccount]);

  return { open, opening };
};
