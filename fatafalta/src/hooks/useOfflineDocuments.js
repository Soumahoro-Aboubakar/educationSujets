import { useMemo } from 'react';
import useDownloadStore from '../store/useDownloadStore';

/**
 * Hook to get the list of offline documents
 * @returns {Array} List of downloaded documents
 */
export const useOfflineDocuments = () => {
  const downloads = useDownloadStore((state) => state.downloads);
  const hydrated = useDownloadStore((state) => state.hydrated);

  const documents = useMemo(() => {
    if (!hydrated) return [];
    return Object.entries(downloads)
      .map(([id, entry]) => ({ id, ...entry }))
      .sort((a, b) => new Date(b.downloadedAt) - new Date(a.downloadedAt));
  }, [downloads, hydrated]);

  return documents;
};
