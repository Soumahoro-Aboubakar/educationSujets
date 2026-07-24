import { useQuery } from '@tanstack/react-query';
import { fetchDocuments } from '../services/documents';

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
