import { useCallback } from 'react';
import { Alert } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import useAsyncAction from './useAsyncAction';
import { createWebHandoff } from '../services/billing';
import { useEntitlements, useRefreshAccount } from './useAccount';
import { canOpenAccount } from '../utils/storePolicy';
import { getErrorAlert } from '../utils/userMessages';

/**
 * « Voir mon abonnement » : ouvre la page « Mon abonnement » du compte sur le site, déjà connecté
 * grâce à un code de passage à usage unique (le jeton de session n'est jamais dans l'adresse).
 * Au retour dans l'application, les droits sont relus depuis le serveur.
 */
export const useAccountLink = () => {
  const [run, opening] = useAsyncAction();
  const refreshAccount = useRefreshAccount();
  const { data: entitlements } = useEntitlements();
  const checkout = entitlements?.checkout;
  const available = canOpenAccount(checkout);

  const open = useCallback(() => run(async () => {
    if (!canOpenAccount(checkout)) return;
    try {
      const { code } = await createWebHandoff();
      const returnUrl = Linking.createURL('abonnement-retour');
      const params = new URLSearchParams({ handoff: code, source: 'app', return: returnUrl });
      await WebBrowser.openAuthSessionAsync(`${checkout.webAccountUrl}?${params.toString()}`, returnUrl);
    } catch (error) {
      Alert.alert(...getErrorAlert(error, 'abonnement', 'tu'));
    } finally {
      refreshAccount();
    }
  }), [run, checkout, refreshAccount]);

  return { available, open, opening };
};

export default useAccountLink;
