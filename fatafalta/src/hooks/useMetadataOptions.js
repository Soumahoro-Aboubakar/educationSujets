import { useQueryClient } from '@tanstack/react-query';
import { useOptions } from './useOptions';
import api from '../services/api';
import { queryKeys } from '../services/queryKeys';
import { upsertEntity } from '../services/queryCache';
import { getErrorMessage } from '../utils/userMessages';

const fields = ['universities', 'institutions', 'departments', 'levels', 'semesters', 'categories'];
export const useMetadataOptions = () => {
  const client = useQueryClient();
  const queries = useOptions(fields.map((field) => `/api/${field}`));
  const options = Object.fromEntries(fields.map((field, i) => [field, queries[i].data || []]));
  const error = queries.find((query) => query.error && !query.data)?.error;
  const createOption = async (fieldKey, apiEndpoint, name) => {
    const entity = (await api.post(`/api/${apiEndpoint}`, { name })).data.data;
    client.setQueryData(queryKeys.options(`/api/${apiEndpoint}`), (items) => upsertEntity(items, entity));
    return entity;
  };
  return { options, loading: queries.some((query) => query.isLoading), error: error ? getErrorMessage(error, 'catalogue', 'vous') : null,
    fetchAllMetadata: () => Promise.all(queries.map((query) => query.refetch())), createOption };
};
export default useMetadataOptions;
