import { QueryClient } from '@tanstack/react-query';
import { freshness } from './queryKeys';

// Un refus du serveur (4xx : accès, introuvable, validation) ne change pas en réessayant :
// on ne retente que les coupures réseau et les erreurs serveur, deux fois au plus.
export const shouldRetry = (failureCount, error) => {
  const status = error?.response?.status;
  if (status >= 400 && status < 500 && status !== 408 && status !== 429) return false;
  return failureCount < 2;
};

export const queryClient = new QueryClient({
  defaultOptions: { queries: { ...freshness.default, retry: shouldRetry, refetchOnWindowFocus: false } },
});

// Cancel first: a late response from the old account must never repopulate the cache.
export const clearSessionCache = async () => {
  await queryClient.cancelQueries();
  queryClient.clear();
};
