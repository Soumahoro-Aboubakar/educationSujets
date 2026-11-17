import { useCallback, useState } from 'react';

// Only a deliberate refresh animates RefreshControl; background reads stay silent.
export const usePullRefresh = (refetch) => {
  const [refreshing, setRefreshing] = useState(false);
  const refresh = useCallback(async () => {
    setRefreshing(true);
    try { return await refetch(); } finally { setRefreshing(false); }
  }, [refetch]);
  return { refreshing, refresh };
};
