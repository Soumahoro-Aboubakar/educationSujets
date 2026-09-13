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

  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      cleanParams[key] = value;
    }
  });

  const response = await api.get('/api/documents', { params: cleanParams });
  return {
    data: response.data.data || [],
    pagination: response.data.pagination || response.data.meta?.pagination || null,
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

/**
 * Delete a document (move to trash)
 * @param {string} id
 */
export const deleteDocument = async (id) => {
  const response = await api.delete(`/api/documents/${id}`);
  return response.data;
};

/**
 * Get trashed documents (Super Admin only)
 * @param {Object} params
 */
export const getTrashedDocuments = async (params = {}) => {
  const cleanParams = {};
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      cleanParams[key] = value;
    }
  });
  const response = await api.get('/api/documents/trash', { params: cleanParams });
  return {
    data: response.data.data || [],
    pagination: response.data.pagination || response.data.meta?.pagination || null,
  };
};

/**
 * Get preview URL for a trashed document (Super Admin only)
 * @param {string} id
 */
export const getTrashedDocumentPreview = async (id) => {
  const response = await api.get(`/api/documents/trash/${id}/preview`);
  return response.data.data;
};

/**
 * Restore a trashed document (Super Admin only)
 * @param {string} id
 */
export const restoreDocument = async (id) => {
  const response = await api.put(`/api/documents/trash/${id}/restore`);
  return response.data;
};

/**
 * Permanently delete a trashed document (Super Admin only)
 * @param {string} id
 */
export const permanentlyDeleteDocument = async (id) => {
  const response = await api.delete(`/api/documents/trash/${id}`);
  return response.data;
};
