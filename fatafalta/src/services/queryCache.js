import { queryKeys } from './queryKeys';

export const upsertEntity = (items = [], entity, field = '_id') => {
  const index = items.findIndex((item) => item[field] === entity[field]);
  return index < 0 ? [...items, entity] : items.map((item, i) => i === index ? entity : item);
};
export const removeDocumentFromCache = (data, id) => {
  if (!data) return data;
  if (Array.isArray(data)) return data.filter((item) => String(item._id || item.id) !== String(id));
  if (data.pages) return { ...data, pages: data.pages.map((page) => removeDocumentFromCache(page, id)) };
  if (Array.isArray(data.data)) return { ...data, data: removeDocumentFromCache(data.data, id) };
  return data;
};
export const invalidateKeys = (client, keys) => Promise.all(keys.map((queryKey) => client.invalidateQueries({ queryKey })));
export const documentChanged = (client, id, { removed = false } = {}) => {
  if (removed) {
    [['documents'], queryKeys.drafts(), queryKeys.trash()].forEach((queryKey) => {
      client.setQueriesData({ queryKey }, (data) => removeDocumentFromCache(data, id));
    });
    client.removeQueries({ queryKey: queryKeys.document(id) });
  }
  // Counts and membership can change in every filtered list and published branch.
  return invalidateKeys(client, [
    ['documents'], queryKeys.drafts(), queryKeys.trash(), ['catalog'], ['download-scope'], ['download-preview'],
    ...(id && !removed ? [queryKeys.document(id)] : []),
  ]);
};
// Observe acknowledgements without changing the persisted queue or its retry policy.
export const prepQueueChanged = (client, previous, next, rejections = []) => {
  const pending = new Set(next.map((action) => action.cle));
  const refused = new Set(rejections.map((action) => action.cle));
  const programmes = new Set(previous
    .filter((action) => !pending.has(action.cle) && !refused.has(action.cle))
    .map((action) => action.programme).filter(Boolean));
  return invalidateKeys(client, [...programmes].map(queryKeys.prepProgramme));
};

// Disk hydration must not overwrite a server response or make old data look fresh.
export const hydrateCachedQuery = (client, queryKey, data, updatedAt = 0) => {
  if (data !== undefined && client.getQueryData(queryKey) === undefined) {
    client.setQueryData(queryKey, data, { updatedAt });
  }
};

// Preserve the four-request limit of the followed-candidate list across observers.
export const createRequestLimit = (limit) => {
  let running = 0;
  const pending = [];
  const drain = () => {
    while (running < limit && pending.length) {
      const { task, signal, resolve, reject } = pending.shift();
      if (signal?.aborted) { reject(Object.assign(new Error('Aborted'), { name: 'AbortError' })); continue; }
      running += 1;
      Promise.resolve().then(task).then(resolve, reject).finally(() => { running -= 1; drain(); });
    }
  };
  return (task, signal) => new Promise((resolve, reject) => { pending.push({ task, signal, resolve, reject }); drain(); });
};
