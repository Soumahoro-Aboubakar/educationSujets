import { useMemo } from 'react';
import useDownloadStore from '../store/useDownloadStore';

/**
 * Hook to get the list of offline documents
 * @returns {Array} List of downloaded documents
 */
export const useOfflineDocuments = () => {
  const { getDownloadedDocuments, hydrated } = useDownloadStore();

  const documents = useMemo(() => {
    return hydrated ? getDownloadedDocuments() : [];
  }, [hydrated, getDownloadedDocuments]);

  return documents;
};
