import { useQuery } from '@tanstack/react-query';
import { fetchTrainingQuestions } from '../services/orientation';

export const useTrainingQuestions = (contestId) => useQuery({
  queryKey: ['training-questions', contestId],
  queryFn: () => fetchTrainingQuestions(contestId),
  enabled: Boolean(contestId),
  staleTime: 1000 * 60 * 5,
});
