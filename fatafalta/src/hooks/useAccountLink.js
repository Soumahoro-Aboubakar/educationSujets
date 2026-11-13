import { useCallback } from 'react';
import { Alert } from 'react-native';
import * as Linking from 'expo-linking';
import useAsyncAction from './useAsyncAction';
import { createWebHandoff } from '../services/billing';
import { useEntitlements, useRefreshAccount } from './useAccount';
import { canOpenAccount, PURCHASE_FLOW_AVAILABLE } from '../utils/storePolicy';
import { getErrorAlert } from '../utils/userMessages';

/**
 * « Voir mon abonnement » : ouvre directement le site (navigateur du téléphone) sur la page
 * « Mon abonnement » du compte, déjà connecté
 * grâce à un code de passage à usage unique (le jeton de session n'est jamais dans l'adresse).
 * Au retour dans l'application, les droits sont relus depuis le serveur (premier plan).
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
      // Ouverture directe du site dans le navigateur du téléphone ; au retour dans l'app,
      // les droits sont relus automatiquement (retour au premier plan).
      await Linking.openURL(`${checkout.webAccountUrl}?${params.toString()}`);
    } catch (error) {
      Alert.alert(...getErrorAlert(error, 'abonnement', 'tu'));
      refreshAccount();
    }
  }), [run, checkout, refreshAccount]);

  return { available, open, opening };
};

export default useAccountLink;

/**
 * Action commune de tous les boutons « Voir mon abonnement » de l'application (essai, verrous,
 * écran Premium…). Build store, compte connecté : ouverture directe du site. Sinon (non connecté,
 * serveur ancien ou interrupteur coupé) : écran interne qui propose de se connecter.
 * Version Web (PWA) : parcours d'abonnement interne inchangé.
 */
export const useOpenSubscription = (navigation, fallback = 'PrepSubscription') => {
  const link = useAccountLink();
  const go = useCallback(() => {
    if (!PURCHASE_FLOW_AVAILABLE && link.available) link.open();
    else navigation.navigate(fallback);
  }, [link, navigation, fallback]);
  return { go, opening: link.opening };
};

/** Libellé unique du bouton (build store : jamais de mot d'achat). */
export const SUBSCRIPTION_BUTTON_LABEL = PURCHASE_FLOW_AVAILABLE ? 'Voir l’abonnement' : 'Voir mon abonnement';
