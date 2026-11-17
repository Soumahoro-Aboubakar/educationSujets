
import { useServerQuery, useServerInfiniteQuery } from './useServerQuery';
import { queryKeys, freshness } from '../services/queryKeys';
import { fetchPublishedOrganismes, fetchParcoursTypes, fetchPublishedNoeuds, fetchPublishedMatieres } from '../services/catalog';
import { fetchOrganismes, fetchOrganismeStructure, fetchMatieres, fetchCatalogNodes } from '../services/dynamicCatalog';
import { fetchNodes } from '../services/institutions';

export const usePublishedOrganismes = (enabled = true) => useServerQuery({
  queryKey: queryKeys.publishedOrganismes(), queryFn: () => fetchPublishedOrganismes({ limit: 100 }), ...freshness.catalog, enabled,
});
export const useParcours = (id, initial) => useServerQuery({
  queryKey: queryKeys.parcours(id), queryFn: () => fetchParcoursTypes(id), ...freshness.catalog, enabled: Boolean(id),
  ...(initial ? { initialData: { data: initial }, initialDataUpdatedAt: 0 } : {}),
});
export const usePublishedBranches = (params, matters, enabled) => useServerInfiniteQuery({
  queryKey: matters ? queryKeys.publishedMatieres(params) : queryKeys.publishedNodes(params),
  queryFn: ({ pageParam }) => (matters ? fetchPublishedMatieres : fetchPublishedNoeuds)({ ...params, page: pageParam, limit: 50 }),
  ...freshness.catalog, enabled, initialPageParam: 1,
  getNextPageParam: (last, pages) => last.pagination?.pages > pages.length ? pages.length + 1 : undefined,
});
export const catalogQueries = {
  organismes: () => ({ queryKey: queryKeys.organismes(), queryFn: () => fetchOrganismes(), ...freshness.catalog }),
  structure: (id) => ({ queryKey: queryKeys.structure(id), queryFn: () => fetchOrganismeStructure(id), ...freshness.catalog, enabled: Boolean(id) }),
  matieres: (id) => ({ queryKey: queryKeys.matieres(id), queryFn: () => fetchMatieres(id), ...freshness.catalog, enabled: Boolean(id) }),
  nodes: (params) => ({ queryKey: queryKeys.nodes(params), queryFn: () => fetchCatalogNodes(params), ...freshness.catalog }),
  institutionNodes: (params) => ({ queryKey: queryKeys.institutionNodes(params), queryFn: () => fetchNodes(params), ...freshness.catalog }),
};
