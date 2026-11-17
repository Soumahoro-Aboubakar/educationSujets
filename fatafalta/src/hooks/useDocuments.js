import { queryKeys, freshness } from '../services/queryKeys';
import { keepPreviousData } from '@tanstack/react-query';
import { useServerQuery as useQuery, useServerInfiniteQuery as useInfiniteQuery } from './useServerQuery';
import { fetchDocuments } from '../services/documents';
import { DOCUMENTS_PER_PAGE } from '../types/constants';

/**
 * Hook to fetch documents with filters and pagination
 * @param {Object} filters
 * @returns
 */
export const useDocuments = (filters = {}, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.documents(filters),
    queryFn: () => fetchDocuments(filters),
    enabled,
    ...freshness.documents,
    placeholderData: keepPreviousData,
  });
};

export const useInfiniteDocuments = (filters = {}, enabled = true) => useInfiniteQuery({
  queryKey: queryKeys.infiniteDocuments(filters || {}),
  queryFn: ({ pageParam }) => fetchDocuments({
    ...(filters || {}),
    page: pageParam,
    limit: DOCUMENTS_PER_PAGE,
  }),
  placeholderData: keepPreviousData,
  initialPageParam: 1,
  getNextPageParam: (lastPage, pages) => {
    const pagination = lastPage.pagination;
    if (!pagination) return lastPage.data.length === DOCUMENTS_PER_PAGE ? pages.length + 1 : undefined;
    const page = Number(pagination.page) || pages.length;
    return page < Number(pagination.pages) ? page + 1 : undefined;
  },
  enabled,
  ...freshness.documents,
});
