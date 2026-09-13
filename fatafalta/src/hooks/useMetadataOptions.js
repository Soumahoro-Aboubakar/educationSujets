/**
 * Hook for fetching and managing metadata options
 * (universities, departments, levels, semesters, categories)
 */

import { useState, useEffect } from 'react';
import api from '../services/api';

export const useMetadataOptions = () => {
  const [options, setOptions] = useState({
    universities: [],
    institutions: [],
    departments: [],
    levels: [],
    semesters: [],
    categories: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch all metadata options on mount
  useEffect(() => {
    fetchAllMetadata();
  }, []);

  const fetchAllMetadata = async () => {
    setLoading(true);
    try {
      const [uniRes, institutionRes, deptRes, levelRes, semRes, catRes] = await Promise.all([
        api.get('/api/universities'),
        api.get('/api/institutions'),
        api.get('/api/departments'),
        api.get('/api/levels'),
        api.get('/api/semesters'),
        api.get('/api/categories'),
      ]);

      setOptions({
        universities: uniRes.data.data || [],
        institutions: institutionRes.data.data || [],
        departments: deptRes.data.data || [],
        levels: levelRes.data.data || [],
        semesters: semRes.data.data || [],
        categories: catRes.data.data || [],
      });
      setError(null);
    } catch (err) {
      console.error('Error fetching metadata:', err);
      setError('Erreur lors du chargement des métadonnées');
    } finally {
      setLoading(false);
    }
  };

  // Create new option and add it to the list
  const createOption = async (fieldKey, apiEndpoint, name) => {
    try {
      const response = await api.post(`/api/${apiEndpoint}`, { name });
      const newEntity = response.data.data;

      setOptions(prev => ({
        ...prev,
        [fieldKey]: [...prev[fieldKey], newEntity]
      }));

      return newEntity;
    } catch (err) {
      console.error(`Error creating ${fieldKey}:`, err);
      throw err;
    }
  };

  return {
    options,
    loading,
    error,
    fetchAllMetadata,
    createOption,
  };
};

export default useMetadataOptions;
