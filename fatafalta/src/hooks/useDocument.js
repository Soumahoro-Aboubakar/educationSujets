import { queryKeys, freshness } from '../services/queryKeys';
import { useServerQuery as useQuery } from './useServerQuery';
import { fetchDocument } from '../services/documents';

/**
 * Hook to fetch a single document by ID
 * @param {string} id
 * @returns
 */
export const useDocument = (id) => {
  return useQuery({
    queryKey: queryKeys.document(id),
    queryFn: () => fetchDocument(id),
    enabled: !!id,
    ...freshness.documents,
  });
};
