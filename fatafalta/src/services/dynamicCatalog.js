import api from './api';

const withName = (item) => (item ? { ...item, name: item.name || item.nom } : item);

export const fetchOrganismes = async (search = '') => {
  const response = await api.get('/api/organismes', {
    params: { recherche: search || undefined, limit: 100 },
  });
  return (response.data.data || []).map(withName);
};

export const createOrganisme = async (nom) => {
  const response = await api.post('/api/organismes', { nom });
  return withName(response.data.data);
};

export const fetchOrganismeStructure = async (organismeId) => {
  const response = await api.get(`/api/structures/${organismeId}`);
  return response.data.data?.structure || null;
};

export const fetchParcoursTypes = async (organismeId) => {
  const response = await api.get(`/api/organismes/${organismeId}/parcours-types`);
  return (response.data.data || []).map(withName);
};

export const createParcoursType = async (organismeId, nom) => {
  const response = await api.post(`/api/organismes/${organismeId}/parcours-types`, { nom });
  return withName(response.data.data);
};

export const fetchCatalogNodes = async ({ organismeId, parentId, type }) => {
  const response = await api.get('/api/noeuds', {
    params: {
      organismeId,
      parentId: parentId || undefined,
      recherche: undefined,
      limit: 100,
    },
  });
  return (response.data.data || [])
    .filter((item) => !type || item.ordreNiveau)
    .map(withName);
};

export const createCatalogNode = async ({ organismeId, parentId, nom }) => {
  const response = await api.post('/api/noeuds/trouver-ou-creer', {
    organismeId,
    parentId: parentId || null,
    nom,
  });
  return withName(response.data.data);
};

export const fetchMatieres = async (organismeId, search = '') => {
  const response = await api.get('/api/matieres', {
    params: { organismeId, recherche: search || undefined, limit: 100 },
  });
  return (response.data.data || []).map(withName);
};

export const createMatiere = async (organismeId, nom) => {
  const response = await api.post('/api/matieres/trouver-ou-creer', { organismeId, nom });
  return withName(response.data.data);
};