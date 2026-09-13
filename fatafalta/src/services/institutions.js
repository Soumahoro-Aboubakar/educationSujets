import api from './api';

export const fetchInstitutions = async () => {
  const response = await api.get('/api/institutions');
  return response.data.data || [];
};

export const fetchInstitutionStructure = async (institutionId) => {
  const response = await api.get(`/api/institutions/${institutionId}/structure`);
  return {
    ...(response.data.data || { institution: null, nodes: [] }),
    pagination: response.data.meta?.pagination || response.data.pagination || null,
  };
};

export const fetchNodes = async (params = {}) => {
  const response = await api.get('/api/nodes', { params });
  return {
    data: response.data.data || [],
    pagination: response.data.meta?.pagination || response.data.pagination || null,
  };
};

export const createInstitution = async (payload) => {
  const response = await api.post('/api/institutions', payload);
  return response.data.data;
};

export const updateInstitution = async (institutionId, payload) => {
  const response = await api.put(`/api/institutions/${institutionId}`, payload);
  return response.data.data;
};

export const createCatalogNode = async (payload) => {
  const response = await api.post('/api/nodes', payload);
  return response.data.data;
};
