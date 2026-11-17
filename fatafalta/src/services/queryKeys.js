// Keys describe server resources, never screen names or presentation transforms.
export const queryKeys = {
  account: (name, identity = 'visitor') => ['account', name, identity],
  plans: () => ['plans'],
  options: (endpoint) => ['options', endpoint],
  orientation: () => ['orientation-options'],
  publishedOrganismes: (params = { limit: 100 }) => ['catalog', 'organismes', params],
  parcours: (id) => ['catalog', 'parcours', id],
  publishedNodes: (params) => ['catalog', 'nodes', params],
  publishedMatieres: (params) => ['catalog', 'matieres', params],
  organismes: (search = '') => ['metadata', 'organismes', search],
  structure: (id) => ['metadata', 'structure', id],
  nodes: (params) => ['metadata', 'nodes', params],
  matieres: (id) => ['metadata', 'matieres', id],
  institutionNodes: (params) => ['metadata', 'institution-nodes', params],
  documents: (filters = {}) => ['documents', 'list', filters],
  infiniteDocuments: (filters = {}) => ['documents', 'infinite', filters],
  document: (id) => ['document', id],
  drafts: () => ['drafts'],
  trash: () => ['trash'],
  downloadScope: (params) => ['download-scope', params],
  downloadPreview: (ids) => ['download-preview', [...new Set(ids)].sort()],
  paymentMethods: () => ['admin-payment-methods'],
  training: (id) => ['training-questions', id],
  prepCatalogue: () => ['prep-catalogue'],
  prepProgramme: (programme) => ['prep', programme],
  ranking: (programme, periode = 'tout', scope = null) => ['prep', programme, 'ranking', periode, scope],
  candidate: (programme, id, periode = 'tout', scope = null) => ['prep', programme, 'candidate', periode, scope, id],
  candidates: (programme, periode, q, scope = null) => ['prep', programme, 'search', periode, scope, q.trim()],
};

const minute = 60 * 1000;
const policy = (staleTime, gcTime = 24 * 60 * minute) => Object.freeze({ staleTime, gcTime });
export const freshness = Object.freeze({
  default: policy(5 * minute),
  catalog: policy(60 * minute),
  options: policy(60 * minute),
  plans: policy(30 * minute),
  documents: policy(5 * minute),
  ranking: policy(90 * 1000, 30 * minute),
  account: policy(30 * 1000, 30 * minute),
  quota: policy(15 * 1000, 30 * minute),
});

const privateRoots = new Set(['documents', 'document', 'drafts', 'trash', 'download-scope', 'download-preview', 'admin-payment-methods', 'training-questions']);
export const sessionQueryOptions = (options, token) => {
  if (!privateRoots.has(options.queryKey[0])) return options;
  return {
    ...options,
    queryKey: [...options.queryKey, { session: token || null }],
    placeholderData: options.placeholderData ? (previous, previousQuery) => (
      previousQuery?.queryKey.at(-1)?.session === (token || null)
        ? options.placeholderData(previous, previousQuery) : undefined
    ) : undefined,
  };
};
