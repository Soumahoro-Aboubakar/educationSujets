import { queryKeys, freshness } from '../services/queryKeys';
import { useServerQuery as useQuery } from './useServerQuery';
import { fetchTrainingQuestions } from '../services/orientation';

export const useTrainingQuestions = (contestId) => useQuery({
  queryKey: queryKeys.training(contestId),
  queryFn: () => fetchTrainingQuestions(contestId),
  enabled: Boolean(contestId),
  ...freshness.documents,
});
