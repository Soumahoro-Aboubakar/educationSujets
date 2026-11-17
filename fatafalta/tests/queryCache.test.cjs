const { test } = require('node:test');
const assert = require('node:assert/strict');
const { QueryClient, QueryObserver, hashKey, keepPreviousData } = require('@tanstack/react-query');
const { createQueryHarness } = require('./helpers/queryHarness.cjs');
const h = createQueryHarness();
const { queryKeys: keys, freshness } = h.load('src/services/queryKeys.js');
const { upsertEntity, removeDocumentFromCache, documentChanged, prepQueueChanged } = h.load('src/services/queryCache.js');
const tick = () => new Promise((resolve) => setImmediate(resolve));
const plain = (value) => JSON.parse(JSON.stringify(value));
function makeClient(t) {
  const client = new QueryClient({ defaultOptions: { queries: { ...freshness.default, retry: false } } });
  t.after(() => client.clear());
  return client;
}

test('clés : ordre des filtres stable, listes simples/infinies distinctes, périodes et identités isolées', () => {
  assert.equal(hashKey(keys.documents({ page: 1, search: 'maths' })), hashKey(keys.documents({ search: 'maths', page: 1 })));
  assert.notEqual(hashKey(keys.documents({})), hashKey(keys.infiniteDocuments({})));
  assert.notEqual(hashKey(keys.ranking('A', 'mois')), hashKey(keys.ranking('A', 'tout')));
  assert.notEqual(hashKey(keys.ranking('A')), hashKey(keys.ranking('B')));
  assert.notEqual(hashKey(keys.candidate('A', 'child', 'mois', 'one')), hashKey(keys.candidate('A', 'child', 'mois', 'two')));
  assert.notEqual(hashKey(keys.account('wallet', 'one')), hashKey(keys.account('wallet', 'two')));
  assert.equal(hashKey(keys.downloadPreview(['b', 'a', 'a'])), hashKey(keys.downloadPreview(['a', 'b'])));
});

test('fraîcheur : durées non nulles et conservation au moins aussi longue', () => {
  for (const policy of Object.values(freshness)) {
    assert.ok(policy.staleTime > 0);
    assert.ok(policy.gcTime >= policy.staleTime);
  }
  assert.equal(freshness.default.staleTime, 300000);
  assert.ok(freshness.catalog.staleTime >= 1800000);
  assert.ok(freshness.ranking.staleTime >= 60000 && freshness.ranking.staleTime <= 120000);
  assert.ok(freshness.account.staleTime < freshness.documents.staleTime);
});

test('deux écrans simultanés puis remontage : un appel tant que la donnée est fraîche', async (t) => {
  const client = makeClient(t); let calls = 0; let resolve;
  const options = { queryKey: keys.publishedOrganismes(), ...freshness.catalog, queryFn: () => { calls++; return new Promise((r) => { resolve = r; }); } };
  const first = client.fetchQuery(options); const second = client.fetchQuery(options);
  assert.equal(calls, 1);
  resolve({ data: [{ _id: 'org' }] }); await Promise.all([first, second]);
  const observer = new QueryObserver(client, options);
  const unsubscribe = observer.subscribe(() => {});
  assert.equal(observer.getCurrentResult().isLoading, false);
  assert.equal(observer.getCurrentResult().data.data[0]._id, 'org');
  await client.fetchQuery(options);
  assert.equal(calls, 1); unsubscribe();
});

test('donnée périmée : cache immédiat, refetch silencieux ; rafraîchissement manuel force le réseau', async (t) => {
  const client = makeClient(t); let calls = 0; let resolve;
  const key = keys.document('a');
  client.setQueryData(key, { _id: 'a', title: 'cached' }, { updatedAt: Date.now() - freshness.documents.staleTime - 1 });
  const observer = new QueryObserver(client, { queryKey: key, ...freshness.documents, queryFn: () => { calls++; return new Promise((r) => { resolve = r; }); } });
  const unsubscribe = observer.subscribe(() => {});
  assert.equal(observer.getCurrentResult().data.title, 'cached');
  assert.equal(observer.getCurrentResult().isLoading, false);
  assert.equal(observer.getCurrentResult().isFetching, true);
  resolve({ _id: 'a', title: 'fresh' }); await tick();
  await client.refetchQueries({ queryKey: key, stale: true });
  assert.equal(calls, 1);
  const refresh = observer.refetch(); assert.equal(calls, 2);
  resolve({ _id: 'a', title: 'manual' }); await refresh;
  unsubscribe();
});

test('changement de filtre : keepPreviousData conserve les lignes pendant le chargement', async (t) => {
  const client = makeClient(t);
  const first = keys.documents({ search: 'one' }); client.setQueryData(first, { data: [{ _id: 'old' }] });
  const observer = new QueryObserver(client, { queryKey: first, queryFn: async () => ({}), placeholderData: keepPreviousData });
  const unsubscribe = observer.subscribe(() => {}); let resolve;
  observer.setOptions({ queryKey: keys.documents({ search: 'two' }), queryFn: () => new Promise((r) => { resolve = r; }), placeholderData: keepPreviousData });
  assert.equal(observer.getCurrentResult().data.data[0]._id, 'old');
  assert.equal(observer.getCurrentResult().isPlaceholderData, true);
  resolve({ data: [{ _id: 'new' }] }); await tick(); unsubscribe();
});

test('mise à jour immuable : insertion/remplacement unique et suppression dans toutes les pages', () => {
  const list = [{ _id: 'a', title: 'old' }, { _id: 'b' }];
  assert.equal(upsertEntity(list, { _id: 'a', title: 'new' }).length, 2);
  assert.equal(list[0].title, 'old');
  assert.equal(upsertEntity(list, { _id: 'c' }).length, 3);
  const data = { pages: [{ data: list, pagination: { pages: 2 } }, { data: [{ id: 'a' }] }], pageParams: [1, 2] };
  const removed = removeDocumentFromCache(data, 'a');
  assert.deepEqual(plain(removed.pages.map((page) => page.data)), [[{ _id: 'b' }], []]);
  assert.equal(data.pages[0].data.length, 2);
  assert.equal(removed.pageParams, data.pageParams);
  assert.equal(removeDocumentFromCache(undefined, 'a'), undefined);
});

test('suppression : listes et détail ciblés, aucun impact sur compte, plans et autres détails', async (t) => {
  const client = makeClient(t);
  const listing = keys.infiniteDocuments({ search: 'a' });
  client.setQueryData(listing, { pages: [{ data: [{ _id: 'a' }, { _id: 'b' }] }], pageParams: [1] });
  client.setQueryData(keys.document('a'), { _id: 'a' });
  client.setQueryData(keys.document('b'), { _id: 'b' });
  client.setQueryData(keys.account('wallet', 'me'), { balance: 10 });
  client.setQueryData(keys.plans(), []);
  await documentChanged(client, 'a', { removed: true });
  assert.equal(client.getQueryData(keys.document('a')), undefined);
  assert.equal(client.getQueryData(listing).pages[0].data.length, 1);
  assert.equal(client.getQueryState(listing).isInvalidated, true);
  for (const key of [keys.document('b'), keys.plans(), keys.account('wallet', 'me')]) assert.equal(client.getQueryState(key).isInvalidated, false);
});

test('réponses acquittées : seul le programme concerné devient périmé, pas les retry ni les refus', async (t) => {
  const client = makeClient(t);
  ['A', 'B', 'C'].forEach((code) => client.setQueryData(keys.ranking(code), { total: 1 }));
  await prepQueueChanged(client, [{ cle: '1', programme: 'A' }, { cle: '2', programme: 'B' }, { cle: '3', programme: 'C' }], [{ cle: '2', programme: 'B' }], [{ cle: '3' }]);
  assert.equal(client.getQueryState(keys.ranking('A')).isInvalidated, true);
  assert.equal(client.getQueryState(keys.ranking('B')).isInvalidated, false);
  assert.equal(client.getQueryState(keys.ranking('C')).isInvalidated, false);
});

test('déconnexion : annule puis vide ; même une réponse tardive ne restaure pas le compte précédent', async () => {
  const { queryClient: client, clearSessionCache } = h.load('src/services/queryClient.js');
  let resolve;
  const old = client.fetchQuery({ queryKey: keys.account('wallet', 'old'), queryFn: () => new Promise((r) => { resolve = r; }) }).catch(() => {});
  await clearSessionCache();
  resolve({ private: 'old' }); await old; await tick();
  assert.equal(client.getQueryCache().getAll().length, 0);
  client.clear();
});

test('changement de compte : aucune placeholder privée précédente, navigation conservée', () => {
  const { sessionQueryOptions } = h.load('src/services/queryKeys.js');
  const base = { queryKey: keys.infiniteDocuments({ search: 'a' }), placeholderData: keepPreviousData };
  const previous = sessionQueryOptions(base, 'one');
  const next = sessionQueryOptions(base, 'two');
  const data = { private: 'one' };
  assert.notEqual(hashKey(previous.queryKey), hashKey(next.queryKey));
  assert.equal(next.placeholderData(data, previous), undefined);
  assert.equal(previous.placeholderData(data, previous), data);
  assert.equal(sessionQueryOptions({ queryKey: keys.publishedOrganismes() }, 'one').queryKey[0], 'catalog');
});

test('hydratation disque : conserve la date et ne remplace jamais une réponse serveur', (t) => {
  const client = makeClient(t);
  const { hydrateCachedQuery } = h.load('src/services/queryCache.js');
  const key = keys.orientation();
  hydrateCachedQuery(client, key, { version: 'disk' }, 123);
  assert.equal(client.getQueryState(key).dataUpdatedAt, 123);
  client.setQueryData(key, { version: 'server' });
  hydrateCachedQuery(client, key, { version: 'old disk' }, 456);
  assert.equal(client.getQueryData(key).version, 'server');
});

test('hooks compte hors navigation : aucun listener navigation requis ; retour écran seulement périmé', () => {
  const { sessionQueryOptions } = h.load('src/services/queryKeys.js');
  const calls = []; let navigation = null; let onFocus;
  const authContext = {}; const navContext = {};
  const react = { useContext: (context) => context === authContext ? { token: 'me' } : navigation, useEffect: (fn) => fn() };
  const mockQuery = (options) => ({ data: { ok: true }, isError: false, options });
  const local = createQueryHarness({
    react,
    '../context/AuthContext': { __esModule: true, default: authContext },
    '@react-navigation/native': { NavigationContext: navContext },
    '@tanstack/react-query': { hashKey, useQuery: mockQuery, useQueryClient: () => ({ refetchQueries: (...args) => calls.push(args) }) },
  }).load('src/hooks/useServerQuery.js');
  local.useServerQuery({ queryKey: keys.account('wallet', 'me'), queryFn: () => {} });
  assert.equal(calls.length, 0);
  navigation = { isFocused: () => true, addListener: (event, fn) => { assert.equal(event, 'focus'); onFocus = fn; return () => {}; } };
  const result = local.useServerQuery({ queryKey: keys.documents({}), queryFn: () => {} });
  assert.equal(hashKey(result.queryKey), hashKey(sessionQueryOptions({ queryKey: keys.documents({}) }, 'me').queryKey));
  assert.equal(calls.length, 1); onFocus(); assert.equal(calls.length, 2);
  assert.equal(calls[1][0].stale, true); assert.equal(calls[1][1].cancelRefetch, false);
});

test('candidats suivis : concurrence bornée et tâche annulée jamais envoyée au serveur', async () => {
  const { createRequestLimit } = h.load('src/services/queryCache.js');
  const limit = createRequestLimit(2); const resolvers = []; let started = 0;
  const task = () => { started++; return new Promise((resolve) => resolvers.push(resolve)); };
  const a = limit(task); const b = limit(task);
  const controller = new AbortController(); const cancelled = limit(task, controller.signal).catch((error) => error.name);
  const c = limit(task); controller.abort(); await tick();
  assert.equal(started, 2);
  resolvers.shift()(); await a; await tick();
  assert.equal(started, 3);
  assert.equal(await cancelled, 'AbortError');
  resolvers.forEach((resolve) => resolve()); await Promise.all([b, c]);
});

test('un refus du serveur (4xx) n’est jamais retenté ; réseau et 5xx deux fois au plus', () => {
  const { shouldRetry } = h.load('src/services/queryClient.js');
  const err = (status) => (status ? { response: { status } } : { message: 'Network Error' });
  assert.equal(shouldRetry(0, err(403)), false);
  assert.equal(shouldRetry(0, err(404)), false);
  assert.equal(shouldRetry(0, err(429)), true);
  assert.equal(shouldRetry(0, err(500)), true);
  assert.equal(shouldRetry(1, err()), true);
  assert.equal(shouldRetry(2, err()), false);
});
