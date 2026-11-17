import { invalidateKeys } from '../services/queryCache';
import { queryKeys, freshness } from '../services/queryKeys';
import { useContext } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useServerQuery as useQuery } from './useServerQuery';
import AuthContext from '../context/AuthContext';
import {
  fetchEntitlements,
  fetchPlans,
  fetchPromoCode,
  fetchSubscription,
  fetchWallet,
} from '../services/billing';
import { fetchDownloadQuota } from '../services/documents';

// Les clés incluent le jeton : changer de compte ne réutilise jamais les données du précédent.
const useAuthedQuery = (name, queryFn, options = {}) => {
  const { token } = useContext(AuthContext);
  return useQuery({
    queryKey: queryKeys.account(name, token),
    queryFn,
    enabled: Boolean(token),
    ...freshness.account,
    // Au retour dans l'app, les données périmées sont relues sans masquer le cache.
    refetchOnWindowFocus: true,
    ...options,
  });
};

// Tant qu'un paiement est en attente de confirmation, l'état est relu régulièrement.
const PENDING_REFRESH_MS = 5000;

export const useEntitlements = () => useAuthedQuery('entitlements', fetchEntitlements, {
  refetchInterval: (query) => (query.state.data?.subscription?.status === 'PENDING' ? PENDING_REFRESH_MS : false),
});
export const useSubscription = () => useAuthedQuery('subscription', fetchSubscription, {
  refetchInterval: (query) => (query.state.data?.status === 'PENDING' ? PENDING_REFRESH_MS : false),
});
export const usePromoCode = () => useAuthedQuery('promo-code', fetchPromoCode);
export const useWallet = () => useAuthedQuery('wallet', fetchWallet);

/**
 * Quota de sujets récents (24 h glissantes), aussi pour un visiteur sans compte.
 * Clé sous « account » : relu par useRefreshAccount après chaque téléchargement.
 */
export const useDownloadQuota = () => {
  const { token } = useContext(AuthContext);
  return useQuery({
    queryKey: queryKeys.account('download-quota', token || 'visiteur'),
    queryFn: fetchDownloadQuota,
    ...freshness.quota,
    refetchOnWindowFocus: true,
  });
};

export const usePlans = () => useQuery({
  queryKey: queryKeys.plans(),
  queryFn: fetchPlans,
  ...freshness.plans,
});

/** À appeler après un paiement, un retrait ou une connexion. */
export const useRefreshAccount = (names = ['entitlements', 'subscription', 'promo-code', 'wallet', 'profile', 'download-quota']) => {
  const queryClient = useQueryClient();
  return () => invalidateKeys(queryClient, [
    ...names.map((name) => ['account', name]),
    ...(names.includes('entitlements') || names.includes('download-quota') ? [['download-scope'], ['download-preview']] : []),
  ]);
};
