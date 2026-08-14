import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchOrientationOptions } from '../services/orientation';
import cache from '../services/cache';

const CACHE_KEY = 'orientation-options';

export const useOrientationOptions = () => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [CACHE_KEY],
    queryFn: fetchOrientationOptions,
    staleTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
  });

  // Persist server response to local cache (best-effort)
  useEffect(() => {
    let mounted = true;
    const persist = async () => {
      if (!query.data) return;
      try {
        await cache.save(CACHE_KEY, { payload: query.data, cachedAt: Date.now() });
      } catch (e) {
        // ignore
      }
    };

    if (mounted) persist();
    return () => { mounted = false; };
  }, [query.data]);

  // When the hook mounts, if we have a local cache, populate react-query cache synchronously
  useEffect(() => {
    let mounted = true;
    const hydrate = async () => {
      try {
        const raw = await cache.load(CACHE_KEY);
        if (!mounted || !raw) return;
        // populate react-query cache so components read immediately
        queryClient.setQueryData([CACHE_KEY], raw.payload);
      } catch (e) {
        // ignore
      }
    };

    hydrate();
    return () => { mounted = false; };
  }, [queryClient]);

  return query;
};
