/**
 * Axios API instance — configured for the backend
 */

import axios from 'axios';
import { API_BASE_URL } from '../types/constants';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor — unwrap API responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message ||
      'Une erreur est survenue';

    console.warn('[API Error]', error.config?.url, message);
    return Promise.reject(error);
  }
);

export default api;
