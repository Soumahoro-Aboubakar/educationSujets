import api from '../services/api';
import { queryKeys, freshness } from '../services/queryKeys';
import { useServerQuery, useServerQueries } from './useServerQuery';

export const optionQuery = (endpoint) => ({
  queryKey: queryKeys.options(endpoint),
  queryFn: async () => (await api.get(endpoint)).data.data || [],
  ...freshness.options,
});
export const useOption = (endpoint) => useServerQuery(optionQuery(endpoint));
export const useOptions = (endpoints) => useServerQueries(endpoints.map(optionQuery));
