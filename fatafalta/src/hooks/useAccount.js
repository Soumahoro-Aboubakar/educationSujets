import { useContext } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import AuthContext from '../context/AuthContext';
import {
  fetchEntitlements,
  fetchPlans,
  fetchPromoCode,
  fetchSubscription,
  fetchWallet,
} from '../services/billing';

// Les clés incluent le jeton : changer de compte ne réutilise jamais les données du précédent.
const useAuthedQuery = (name, queryFn, options = {}) => {
  const { token } = useContext(AuthContext);
  return useQuery({
    queryKey: ['account', name, token],
    queryFn,
    enabled: Boolean(token),
    staleTime: 30 * 1000,
    ...options,
  });
};

export const useEntitlements = () => useAuthedQuery('entitlements', fetchEntitlements);
export const useSubscription = () => useAuthedQuery('subscription', fetchSubscription);
export const usePromoCode = () => useAuthedQuery('promo-code', fetchPromoCode);
export const useWallet = () => useAuthedQuery('wallet', fetchWallet);

export const usePlans = () => useQuery({
  queryKey: ['plans'],
  queryFn: fetchPlans,
  staleTime: 10 * 60 * 1000,
});

/** À appeler après un paiement, un retrait ou une connexion. */
export const useRefreshAccount = () => {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['account'] });
};
