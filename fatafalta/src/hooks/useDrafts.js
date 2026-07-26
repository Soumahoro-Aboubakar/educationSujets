/**
 * Hook for managing document drafts locally
 */

import { useState, useEffect, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';

const DRAFTS_STORAGE_KEY = 'document_drafts';

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
      const storedDrafts = await SecureStore.getItemAsync(DRAFTS_STORAGE_KEY);
      if (storedDrafts) {
        setDrafts(JSON.parse(storedDrafts));
      }
    } catch (err) {
      console.error('Error loading drafts:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const saveDraft = useCallback(async (draft) => {
    try {
      const id = draft.id || `draft_${Date.now()}`;
      const draftWithId = {
        ...draft,
        id,
        savedAt: new Date().toISOString(),
      };

      const updatedDrafts = drafts.some(d => d.id === id)
        ? drafts.map(d => d.id === id ? draftWithId : d)
        : [...drafts, draftWithId];

      setDrafts(updatedDrafts);
      await SecureStore.setItemAsync(DRAFTS_STORAGE_KEY, JSON.stringify(updatedDrafts));
      
      return draftWithId;
    } catch (err) {
      console.error('Error saving draft:', err);
      throw err;
    }
  }, [drafts]);

  const deleteDraft = useCallback(async (draftId) => {
    try {
      const updatedDrafts = drafts.filter(d => d.id !== draftId);
      setDrafts(updatedDrafts);
      await SecureStore.setItemAsync(DRAFTS_STORAGE_KEY, JSON.stringify(updatedDrafts));
    } catch (err) {
      console.error('Error deleting draft:', err);
      throw err;
    }
  }, [drafts]);

  const getDraftById = useCallback((draftId) => {
    return drafts.find(d => d.id === draftId);
  }, [drafts]);

  const clearAllDrafts = useCallback(async () => {
    try {
      setDrafts([]);
      await SecureStore.deleteItemAsync(DRAFTS_STORAGE_KEY);
    } catch (err) {
      console.error('Error clearing drafts:', err);
      throw err;
    }
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
