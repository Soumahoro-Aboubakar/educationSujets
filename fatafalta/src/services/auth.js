/**
 * Authentication API Service
 */

import api from './api';
import * as SecureStore from 'expo-secure-store';

/**
 * Register a new user (contributor role)
 * @param {string} name
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{token: string, data: Object}>}
 */
export const registerUser = async (name, email, password) => {
  const response = await api.post('/api/auth/register', {
    name,
    email,
    password,
  });
  return response.data;
};

/**
 * Login with email and password
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{token: string, data: Object}>}
 */
export const loginUser = async (email, password) => {
  const response = await api.post('/api/auth/login', {
    email,
    password,
  });
  return response.data;
};

/**
 * Get current user profile
 * @returns {Promise<Object>}
 */
export const getCurrentUser = async () => {
  const response = await api.get('/api/auth/me');
  return response.data.data;
};

/**
 * Logout
 * @returns {Promise<void>}
 */
export const logoutUser = async () => {
  await api.post('/api/auth/logout');
  await SecureStore.deleteItemAsync('authToken');
  await SecureStore.deleteItemAsync('authUser');
};

/**
 * Refresh authentication token
 * @returns {Promise<{token: string}>}
 */
export const refreshToken = async () => {
  const response = await api.post('/api/auth/refresh');
  return response.data;
};
