import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { fetchDocuments } from '../services/documents';
import { DOCUMENTS_PER_PAGE } from '../types/constants';

/**
 * Hook to fetch documents with filters and pagination
 * @param {Object} filters
 * @returns
 */
export const useDocuments = (filters = {}) => {
  return useQuery({
    queryKey: ['documents', filters],
    queryFn: () => fetchDocuments(filters),
    staleTime: 1000 * 60 * 5, // 5 minutes
    keepPreviousData: true,
  });
};

export const useInfiniteDocuments = (filters = {}, enabled = true) => useInfiniteQuery({
  queryKey: ['documents-infinite', filters || {}],
  queryFn: ({ pageParam }) => fetchDocuments({
    ...(filters || {}),
    page: pageParam,
    limit: DOCUMENTS_PER_PAGE,
  }),
  initialPageParam: 1,
  getNextPageParam: (lastPage) => {
    const pagination = lastPage.pagination;
    if (!pagination || pagination.page >= pagination.pages) return undefined;
    return pagination.page + 1;
  },
  enabled,
  staleTime: 1000 * 60 * 5,
});
