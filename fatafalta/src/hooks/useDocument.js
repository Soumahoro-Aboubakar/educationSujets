import { useQuery } from '@tanstack/react-query';
import { fetchDocument } from '../services/documents';

/**
 * Hook to fetch a single document by ID
 * @param {string} id
 * @returns
 */
export const useDocument = (id) => {
  return useQuery({
    queryKey: ['document', id],
    queryFn: () => fetchDocument(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};
