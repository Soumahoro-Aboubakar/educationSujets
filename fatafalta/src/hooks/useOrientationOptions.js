import { hydrateCachedQuery } from '../services/queryCache';
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useServerQuery } from './useServerQuery';
import { fetchOrientationOptions } from '../services/orientation';
import { queryKeys, freshness } from '../services/queryKeys';
import cache from '../services/cache';

export const useOrientationOptions = (enabled = true) => {
  const client = useQueryClient();
  const query = useServerQuery({ queryKey: queryKeys.orientation(), queryFn: fetchOrientationOptions, ...freshness.options, enabled });
  useEffect(() => {
    if (query.data) cache.save('orientation-options', { payload: query.data, cachedAt: query.dataUpdatedAt });
  }, [query.data, query.dataUpdatedAt]);
  useEffect(() => {
    let active = true;
    cache.load('orientation-options').then((raw) => {
      if (active && raw?.payload) {
        hydrateCachedQuery(client, queryKeys.orientation(), raw.payload, raw.cachedAt || 0);
      }
    });
    return () => { active = false; };
  }, [client]);
  return query;
};
