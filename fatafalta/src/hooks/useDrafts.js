/**
 * Hook for managing document drafts from the server
 */

import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

export const useDrafts = () => {
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  // Load drafts on mount
  useEffect(() => {
    loadDrafts(1, false);
  }, []);

  const loadDrafts = useCallback(async (requestedPage = 1, append = false) => {
    try {
      if (append) setLoadingMore(true);
      else setLoading(true);
      
      const res = await api.get('/api/documents/drafts', { params: { page: requestedPage, limit: 12 } });
      const newData = res.data?.data || [];
      const pagination = res.data?.meta?.pagination;
      
      setDrafts(prev => {
        if (!append) return newData;
        const existingIds = new Set(prev.map(d => d._id || d.id));
        const newItems = newData.filter(d => !existingIds.has(d._id || d.id));
        return [...prev, ...newItems];
      });
      setPage(requestedPage);
      setHasMore(pagination ? pagination.pages > requestedPage : false);
    } catch (err) {
      console.error('Error loading drafts:', err);
    } finally {
      if (append) setLoadingMore(false);
      else setLoading(false);
    }
  }, []);

  const saveDraft = useCallback(async (draft) => {
    throw new Error('Save draft is now handled by the regular upload API.');
  }, []);

  const deleteDraft = useCallback(async (draftId) => {
    try {
      await api.delete('/api/documents/' + draftId);
      setDrafts(prev => prev.filter(d => d._id !== draftId && d.id !== draftId));
    } catch (err) {
      console.error('Error deleting draft:', err);
      throw err;
    }
  }, []);

  const getDraftById = useCallback((draftId) => {
    return drafts.find(d => d._id === draftId || d.id === draftId);
  }, [drafts]);

  const clearAllDrafts = useCallback(async () => {
    // No-op for server drafts
  }, []);

  return {
    drafts,
    loading,
    saveDraft,
    deleteDraft,
    getDraftById,
    clearAllDrafts,
    loadDrafts,
    page,
    hasMore,
    loadingMore,
  };
};

export default useDrafts;
