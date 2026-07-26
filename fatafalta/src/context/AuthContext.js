import React, { createContext, useState, useEffect, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import api from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize auth state from storage
  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        const storedToken = await SecureStore.getItemAsync('authToken');
        const storedUser = await SecureStore.getItemAsync('authUser');
        
        if (storedToken && storedUser) {
          // Validate token with backend
          try {
            const response = await api.get('/api/auth/me', {
              headers: { Authorization: `Bearer ${storedToken}` }
            });
            setToken(storedToken);
            setUser(JSON.parse(storedUser));
            // Update API default header
            api.defaults.headers.common.Authorization = `Bearer ${storedToken}`;
          } catch (err) {
            // Token expired or invalid, clear it
            await SecureStore.deleteItemAsync('authToken');
            await SecureStore.deleteItemAsync('authUser');
            setToken(null);
            setUser(null);
          }
        }
      } catch (err) {
        console.error('Bootstrap error:', err);
      } finally {
        setLoading(false);
      }
    };

    bootstrapAsync();
  }, []);

  const persistAuthData = async (tokenValue, userValue) => {
    console.log('Persisting auth data:', { tokenValue, userValue });
    const authToken = typeof tokenValue === 'string' ? tokenValue : JSON.stringify(tokenValue);
    const authUser = JSON.stringify(userValue);

    await SecureStore.setItemAsync('authToken', authToken);
    await SecureStore.setItemAsync('authUser', authUser);
  };

  const register = useCallback(async (name, email, password) => {
    try {
      setError(null);
      const response = await api.post('/api/auth/register', {
        name,
        email,
        password,
      });
      
      const { token: newToken, user: newUser } = response.data;
      
      await persistAuthData(newToken, newUser);
      
      setToken(newToken);
      setUser(newUser);
      api.defaults.headers.common.Authorization = `Bearer ${newToken}`;
      
      return { success: true, user: newUser };
    } catch (err) {
      const message = err.response?.data?.message || 'Erreur lors de l\'inscription';
      setError(message);
      return { success: false, error: message };
    }
  }, []);

  const login = useCallback(async (email, password) => {
    try {
      setError(null);
      const response = await api.post('/api/auth/login', {
        email,
        password,
      });
      
      const { token: newToken, user: newUser } = response.data;
      
      await persistAuthData(newToken, newUser);
      
      setToken(newToken);
      setUser(newUser);
      api.defaults.headers.common.Authorization = `Bearer ${newToken}`;
      
      return { success: true, user: newUser };
    } catch (err) {
      console.error('Login error00:', err);
      const message = err.response?.data?.message || 'Erreur lors de la connexion';
      setError(message);
      return { success: false, error: message };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/api/auth/logout');
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      await SecureStore.deleteItemAsync('authToken');
      await SecureStore.deleteItemAsync('authUser');
      setToken(null);
      setUser(null);
      delete api.defaults.headers.common.Authorization;
      setError(null);
    }
  }, []);

  const isAdmin = useCallback(() => {
    return user?.role === 'admin' || user?.role === 'sub-admin';
  }, [user]);

  const value = {
    user,
    token,
    loading,
    error,
    login,
    register,
    logout,
    isAdmin,
    isAuthenticated: !!token,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
