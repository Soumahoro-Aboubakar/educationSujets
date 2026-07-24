/**
 * Document API service
 */

import api from './api';

/**
 * Fetch paginated list of approved documents with optional filters
 * @param {Object} params - { search, university, department, level, semester, category, page, limit }
 * @returns {Promise<{ data: Array, pagination: Object }>}
 */
export const fetchDocuments = async (params = {}) => {
  const cleanParams = {};

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      cleanParams[key] = value;
    }
  });

  const response = await api.get('/api/documents', { params: cleanParams });
  return {
    data: response.data.data || [],
    pagination: response.data.meta?.pagination || null,
  };
};

/**
 * Fetch a single document by ID (increments views)
 * @param {string} id
 * @returns {Promise<Object>}
 */
export const fetchDocument = async (id) => {
  const response = await api.get(`/api/documents/${id}`);
  return response.data.data;
};

/**
 * Get signed download URL for a document
 * @param {string} id
 * @returns {Promise<{ url: string, expiresIn: number }>}
 */
export const getDownloadUrl = async (id) => {
  const response = await api.get(`/api/documents/${id}/download`);
  return response.data.data;
};
