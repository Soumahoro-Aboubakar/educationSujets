/**
 * Hook for managing document drafts from the server
 */

import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

export const useDrafts = () => {
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load drafts on mount
  useEffect(() => {
    loadDrafts();
  }, []);

  const loadDrafts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/documents/drafts');
      setDrafts(res.data?.data || []);
    } catch (err) {
      console.error('Error loading drafts:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const saveDraft = useCallback(async (draft) => {
    throw new Error('Save draft is now handled by the regular upload API.');
  }, []);

  const deleteDraft = useCallback(async (draftId) => {
    try {
      await api.delete('/documents/' + draftId);
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
  };
};

export default useDrafts;
