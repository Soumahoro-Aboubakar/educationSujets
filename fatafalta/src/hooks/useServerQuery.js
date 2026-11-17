import { sessionQueryOptions } from '../services/queryKeys';
import { useContext, useEffect } from 'react';
import AuthContext from '../context/AuthContext';
import { NavigationContext } from '@react-navigation/native';
import { hashKey, useQuery, useQueries, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';

// React Navigation keeps many screens mounted. Focus only refreshes stale data;
// cached data stays visible and concurrent observers share the same request.
const useQueriesFocus = (keys) => {
  const client = useQueryClient();
  const navigation = useContext(NavigationContext);
  const serialized = hashKey(keys);
  useEffect(() => {
    // Account hooks also run in App's bridge, outside NavigationContainer.
    if (!navigation) return undefined;
    const onFocus = () => JSON.parse(serialized).forEach((queryKey) => {
      client.refetchQueries({ queryKey, exact: true, stale: true, type: 'active' }, { cancelRefetch: false });
    });
    if (navigation.isFocused()) onFocus();
    return navigation.addListener('focus', onFocus);
  }, [client, navigation, serialized]);
};
export const useQueryFocus = (queryKey, enabled = true) => useQueriesFocus(enabled ? [queryKey] : []);

const useSessionOptions = (options) => {
  const { token } = useContext(AuthContext);
  return sessionQueryOptions(options, token);
};
export const useServerQuery = (options) => {
  const scoped = useSessionOptions(options);
  const query = useQuery(scoped);
  useQueryFocus(scoped.queryKey, scoped.enabled !== false);
  return { ...query, queryKey: scoped.queryKey, isError: query.isError && query.data === undefined };
};
export const useServerInfiniteQuery = (options) => {
  const scoped = useSessionOptions(options);
  const query = useInfiniteQuery(scoped);
  useQueryFocus(scoped.queryKey, scoped.enabled !== false);
  return { ...query, queryKey: scoped.queryKey, isError: query.isError && query.data === undefined };
};

export const useServerQueries = (options) => {
  const queries = useQueries({ queries: options });
  useQueriesFocus(options.filter((option) => option.enabled !== false).map((option) => option.queryKey));
  return queries;
};
