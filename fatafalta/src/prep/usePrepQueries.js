import { createRequestLimit } from '../services/queryCache';
import { useCallback, useContext, useMemo } from 'react';
import AuthContext from '../context/AuthContext';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerQuery } from '../hooks/useServerQuery';
import { queryKeys, freshness } from '../services/queryKeys';
import usePrep from './store';
import prepApi from './api';

const candidateLimit = createRequestLimit(4);
export const candidateQuery = (programme, id, periode, scope) => ({
  queryKey: queryKeys.candidate(programme, id, periode, scope),
  queryFn: ({ signal }) => candidateLimit(() => prepApi.candidate(programme, id, periode, signal), signal),
  ...freshness.ranking, enabled: Boolean(programme && id),
});

export const usePrepQueryScope = () => {
  const prep = usePrep((state) => state.token);
  const { token: account } = useContext(AuthContext);
  return useMemo(() => ({ prep, account }), [prep, account]);
};

export const usePrepRanking = (programme, periode = 'tout') => {
  const token = usePrepQueryScope();
  return useServerQuery({
    queryKey: queryKeys.ranking(programme, periode, token),
    queryFn: ({ signal }) => prepApi.ranking(programme, periode, { signal }),
    ...freshness.ranking, enabled: Boolean(programme),
    placeholderData: (previous, query) => query?.queryKey[4]?.account === token.account && query?.queryKey[4]?.prep === token.prep ? keepPreviousData(previous) : undefined,
  });
};
export const useCandidate = (programme, id, periode = 'tout') => {
  const token = usePrepQueryScope();
  return useServerQuery(candidateQuery(programme, id, periode, token));
};

// Ranking retains its bidirectional cursor controller; React Query owns its data.
export const useRankingResource = (programme, periode) => {
  const token = usePrepQueryScope();
  const client = useQueryClient();
  const queryKey = queryKeys.ranking(programme, periode, token);
  // Même lecture que usePrepRanking : les deux observateurs partagent cette clé, et un
  // rafraîchissement au retour sur l'écran doit toujours savoir relire le classement.
  const query = useQuery({ queryKey, queryFn: ({ signal }) => prepApi.ranking(programme, periode, { signal }), ...freshness.ranking, enabled: false, placeholderData: (previous, query) => query?.queryKey[4]?.account === token.account && query?.queryKey[4]?.prep === token.prep ? keepPreviousData(previous) : undefined });
  const save = useCallback((value, preserveTimestamp = false) => client.setQueryData(queryKeys.ranking(programme, periode, token), value, preserveTimestamp ? { updatedAt: client.getQueryState(queryKeys.ranking(programme, periode, token))?.dataUpdatedAt } : undefined), [client, programme, periode, token]);
  const fetch = useCallback(({ locate, automatic, controller }) => client.fetchQuery({
    queryKey: queryKeys.ranking(programme, periode, token), ...freshness.ranking,
    staleTime: automatic ? freshness.ranking.staleTime : 0,
    queryFn: async ({ signal }) => {
      const abort = () => controller.abort();
      signal.addEventListener('abort', abort, { once: true });
      try {
        const result = await prepApi.ranking(programme, periode, { ...(locate ? { autour: 'moi' } : {}), signal: controller.signal });
        if (!result) throw new Error('Classement vide');
        return result;
      } finally { signal.removeEventListener('abort', abort); }
    },
  }), [client, programme, periode, token]);
  const cancel = useCallback(() => client.cancelQueries({ queryKey: queryKeys.ranking(programme, periode, token), exact: true }), [client, programme, periode, token]);
  return { data: query.data, save, fetch, cancel };
};

export const useCandidateSearchResource = (programme, periode, q) => {
  const token = usePrepQueryScope();
  const client = useQueryClient();
  const query = useQuery({ queryKey: queryKeys.candidates(programme, periode, q, token), queryFn: ({ signal }) => prepApi.searchCandidates(programme, q, periode, signal), ...freshness.ranking, enabled: false });
  const fetch = useCallback((text, signal, force = false) => client.fetchQuery({
    queryKey: queryKeys.candidates(programme, periode, text, token), ...freshness.ranking,
    staleTime: force ? 0 : freshness.ranking.staleTime,
    queryFn: () => prepApi.searchCandidates(programme, text, periode, signal),
  }), [client, programme, periode, token]);
  return { data: query.data, fetch, scope: token };
};
