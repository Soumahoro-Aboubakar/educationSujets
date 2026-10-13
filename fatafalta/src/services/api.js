/**
 * Axios API instance — configured for the backend
 */

import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../types/constants';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/*
 * Identifiant visiteur (sans compte) : créé et signé par le serveur pour le quota de sujets
 * récents, conservé ici et renvoyé à chaque requête (X-Visitor-Token). Les compteurs restent
 * sur le serveur.
 */
const VISITOR_KEY = 'visitorToken';
let visitorToken;
const loadVisitorToken = async () => {
  if (visitorToken === undefined) {
    try { visitorToken = (await SecureStore.getItemAsync(VISITOR_KEY)) || null; } catch { visitorToken = null; }
  }
  return visitorToken;
};
const captureVisitorToken = (response) => {
  const received = response?.headers?.['x-visitor-token'] || response?.data?.data?.visitorToken;
  if (received && received !== visitorToken) {
    visitorToken = received;
    SecureStore.setItemAsync(VISITOR_KEY, received).catch(() => {});
  }
};

api.interceptors.request.use(async (config) => {
  const token = await loadVisitorToken();
  if (token) config.headers['X-Visitor-Token'] = token;
  return config;
});

// Response interceptor — unwrap API responses
api.interceptors.response.use(
  (response) => {
    captureVisitorToken(response);
    return response;
  },
  (error) => {
    captureVisitorToken(error.response);
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
