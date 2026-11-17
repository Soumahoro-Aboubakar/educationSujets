import { useContext } from 'react';
import { useServerInfiniteQuery } from './useServerQuery';
import AuthContext from '../context/AuthContext';
import { queryKeys, freshness } from '../services/queryKeys';
import { deleteDocument } from '../services/documents';
import api from '../services/api';
import { getUserMessage, getErrorMessage } from '../utils/userMessages';

export const useDrafts = () => {
  const { token } = useContext(AuthContext);
  const query = useServerInfiniteQuery({
    queryKey: queryKeys.drafts(), ...freshness.documents, enabled: Boolean(token), initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const res = await api.get('/api/documents/drafts', { params: { page: pageParam, limit: 12 } });
      return { data: res.data?.data || [], pagination: res.data?.meta?.pagination };
    },
    getNextPageParam: (last, pages) => last.pagination?.pages > pages.length ? pages.length + 1 : undefined,
  });
  const drafts = [...new Map((query.data?.pages || []).flatMap((page) => page.data).map((item) => [item._id || item.id, item])).values()];
  return {
    drafts, loading: query.isLoading, loadingMore: query.isFetchingNextPage,
    error: query.error ? getUserMessage(query.error, 'documents', 'vous') : null,
    page: query.data?.pages.length || 1, hasMore: Boolean(query.hasNextPage),
    loadDrafts: (page = 1, append = false) => append ? (query.hasNextPage && !query.isFetching ? query.fetchNextPage() : Promise.resolve()) : query.refetch(),
    deleteDraft: deleteDocument,
    saveDraft: async () => { throw new Error(getErrorMessage(null, 'envoi', 'vous')); },
    getDraftById: (id) => drafts.find((item) => (item._id || item.id) === id),
    clearAllDrafts: async () => {},
  };
};
export default useDrafts;
