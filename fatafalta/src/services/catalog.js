import api from './api';

const unwrapList = (response) => ({
  data: response.data?.data || [],
  pagination: response.data?.meta?.pagination || response.data?.pagination || null,
  meta: response.data?.meta || {},
});

// Public, data-driven catalogue. These endpoints deliberately contain only
// branches that lead to at least one approved subject.
export const fetchPublishedOrganismes = async (params = {}) =>
  unwrapList(await api.get('/api/catalog/organismes', { params }));

export const fetchParcoursTypes = async (organismeId) =>
  unwrapList(await api.get(`/api/organismes/${organismeId}/parcours-types`));

export const fetchPublishedNoeuds = async (params = {}) =>
  unwrapList(await api.get('/api/catalog/noeuds', { params }));

export const fetchPublishedMatieres = async (params = {}) =>
  unwrapList(await api.get('/api/catalog/matieres', { params }));

