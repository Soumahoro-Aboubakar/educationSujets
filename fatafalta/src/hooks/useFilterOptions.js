import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { fetchAllFilterOptions } from '../services/filters';
import cache from '../services/cache';

/**
 * Hook to fetch all taxonomy filter options (universities, departments, etc.)
 * Uses a local cache to provide instant data + background sync.
 */
export const useFilterOptions = () => {
  const qc = useQueryClient();
  const [initial, setInitial] = useState(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem('filterOptions');
        return raw ? JSON.parse(raw) : undefined;
      }
    } catch (e) {
      // ignore
    }
    return undefined;
  });

  const query = useQuery({
    queryKey: ['filterOptions'],
    queryFn: fetchAllFilterOptions,
    initialData: initial,
    staleTime: 1000 * 60 * 60, // 1 hour
    refetchOnMount: true,
    refetchOnReconnect: true,
    onSuccess: (data) => {
      // persist fetched data
      cache.save('filterOptions', data);
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem('filterOptions', JSON.stringify(data));
        }
      } catch (e) {
        // ignore
      }
    },
  });

  // For native (expo) platforms, attempt to load cache asynchronously and prime react-query
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const mobileCached = await cache.load('filterOptions');
        if (mounted && mobileCached) {
          qc.setQueryData(['filterOptions'], mobileCached);
          setInitial(mobileCached);
        }
      } catch (e) {
        // ignore
      }
    })();
    return () => { mounted = false; };
  }, [qc]);

  return query;
};
