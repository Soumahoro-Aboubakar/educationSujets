import { hydrateCachedQuery } from '../services/queryCache';
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import cache from '../services/cache';
import { queryKeys } from '../services/queryKeys';
import { useOptions } from './useOptions';
import { FILTER_DEFINITIONS } from '../types/constants';

// The raw endpoint cache is also shared with upload/edit metadata forms.
export const useFilterOptions = () => {
  const client = useQueryClient();
  const queries = useOptions(FILTER_DEFINITIONS.map((def) => def.endpoint));
  const data = Object.fromEntries(FILTER_DEFINITIONS.map((def, i) => [def.key,
    def.key === 'semester' ? (queries[i].data || []).map((item) => ({ ...item, displayName: (item.name || '').replace(/Semestre/gi, 'Session') })) : queries[i].data || [],
  ]));
  const stamp = queries.map((query) => query.dataUpdatedAt).join(':');
  useEffect(() => {
    let active = true;
    cache.load('filterOptions').then((raw) => {
      if (!active || !raw) return;
      const payload = raw.payload || raw;
      FILTER_DEFINITIONS.forEach((def) => {
        const key = queryKeys.options(def.endpoint);
        if (payload[def.key]) hydrateCachedQuery(client, key, payload[def.key], raw.cachedAt || 0);
      });
    });
    return () => { active = false; };
  }, [client]);
  useEffect(() => {
    if (queries.every((query) => query.data)) cache.save('filterOptions', { payload: data, cachedAt: Math.min(...queries.map((query) => query.dataUpdatedAt)) });
  }, [stamp]);
  return { data, isLoading: queries.some((query) => query.isLoading), isError: queries.some((query) => query.isError && !query.data),
    error: queries.find((query) => query.error)?.error, refetch: () => Promise.all(queries.map((query) => query.refetch())) };
};
