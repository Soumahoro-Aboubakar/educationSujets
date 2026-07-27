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
  console.log("Voici le log de la response ", response.data);
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

/**
 * Upload a new document
 * @param {FormData} formData
 * @returns {Promise<Object>}
 */
export const uploadDocument = async (formData) => {
  const response = await api.post('/api/documents', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

/**
 * Upload and associate a correction PDF to an existing document.
 * @param {string} documentId
 * @param {FormData} formData
 * @returns {Promise<Object>}
 */
export const uploadCorrectionDocument = async (documentId, formData) => {
  const response = await api.post(`/api/documents/${documentId}/correction`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

/**
 * Update an existing document (metadata only)
 * @param {string} id
 * @param {Object} payload
 */
export const updateDocumentMetadata = async (id, payload) => {
  const response = await api.put(`/api/documents/${id}`, payload);
  return response.data;
};

/**
 * Validate/publish a document
 * @param {string} id
 * @param {string} status - 'approved' or 'rejected'
 */
export const validateDocumentStatus = async (id, status) => {
  const response = await api.put(`/api/documents/${id}/validate`, { status });
  return response.data;
};
