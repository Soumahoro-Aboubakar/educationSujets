import api from './api';

/** Data is intentionally provided by the API so unavailable catalog entries are never offered. */
export const fetchOrientationOptions = async () => {
  const response = await api.get('/api/orientation/options');
  //console.log('fetchOrientationOptions response', response.data.data);
  return response.data.data || {
    universities: [],
    subjectContests: [],
    trainingContests: [],
  };
};

export const fetchTrainingQuestions = async (contestId) => {
  const response = await api.get('/api/training/questions', {
    params: { contest: contestId },
  });
  return response.data.data || [];
};

export const answerTrainingQuestion = async (questionId, selectedIndex) => {
  const response = await api.post(`/api/training/questions/${questionId}/answer`, {
    selectedIndex,
  });
  return response.data.data;
};
