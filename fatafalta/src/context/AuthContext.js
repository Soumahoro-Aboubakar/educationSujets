import { useQuery } from '@tanstack/react-query';
import { queryClient, clearSessionCache } from '../services/queryClient';
import { queryKeys, freshness } from '../services/queryKeys';
import { getErrorMessage } from '../utils/userMessages';
import React, { createContext, useState, useEffect, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import api from '../services/api';
import { clearSession, onSessionEnded, readRefreshToken, saveSession, setAccessHeader } from '../services/session';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const profile = useQuery({
    queryKey: queryKeys.account('profile', token),
    queryFn: async () => (await api.get('/api/auth/me')).data.data,
    ...freshness.account, enabled: Boolean(token),
  });
  useEffect(() => {
    if (profile.data) {
      setUser(profile.data);
      SecureStore.setItemAsync('authUser', JSON.stringify(profile.data)).catch(() => {});
    }
  }, [profile.data]);

  // Initialize auth state from storage
  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        const storedToken = await SecureStore.getItemAsync('authToken');
        const storedUser = await SecureStore.getItemAsync('authUser');
        
        if (storedToken && storedUser) {
          // Jeton expiré : renouvelé automatiquement (services/session) avant de relire le profil.
          setAccessHeader(storedToken);
          try {
            const response = await api.get('/api/auth/me');
            setToken(storedToken);
            const currentUser = response.data.data || response.data.user || JSON.parse(storedUser);
            queryClient.setQueryData(queryKeys.account('profile', storedToken), currentUser);
            setUser(currentUser);
          } catch (err) {
            if (err.response?.status === 401) {
              // Session réellement terminée (déconnexion, mot de passe changé…).
              await clearSession();
              setToken(null);
              setUser(null);
            } else {
              // Hors ligne ou serveur indisponible : la session enregistrée reste ouverte.
              setToken(storedToken);
              setUser(JSON.parse(storedUser));
            }
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

  // Session fermée par le serveur pendant l'utilisation : retour à l'état « invité ».
  useEffect(() => {
    onSessionEnded(() => {
      clearSessionCache().catch(() => {});
      setToken(null);
      setUser(null);
    });
  }, []);

  const persistAuthData = async (data, userValue) => {
    await saveSession(data);
    await SecureStore.setItemAsync('authUser', JSON.stringify(userValue));
  };

  const register = useCallback(async (name, email, password, accepteConditions = false) => {
    try {
      setError(null);
      const response = await api.post('/api/auth/register', {
        name,
        email,
        password,
        platform: 'mobile',
        accepteConditions: accepteConditions === true,
      });
      
      const { token: newToken, user: newUser } = response.data;
      
      await persistAuthData(response.data, newUser);
      
      await clearSessionCache();
      queryClient.setQueryData(queryKeys.account('profile', newToken), newUser);
      setToken(newToken);
      setUser(newUser);
      
      return { success: true, user: newUser };
    } catch (err) {
      const message = getErrorMessage(err, 'inscription', 'tu');
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
        platform: 'mobile',
      });
      
      const { token: newToken, user: newUser } = response.data;
      
      await persistAuthData(response.data, newUser);
      
      await clearSessionCache();
      queryClient.setQueryData(queryKeys.account('profile', newToken), newUser);
      setToken(newToken);
      setUser(newUser);
      
      return { success: true, user: newUser };
    } catch (err) {
      const message = getErrorMessage(err, 'connexion', 'tu');
      setError(message);
      return { success: false, error: message };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      // Ferme cette session côté serveur (jeton de renouvellement compris).
      await api.post('/api/auth/logout', { refreshToken: await readRefreshToken() });
    } catch (err) {
      // Hors ligne : la session expirera d'elle-même ; l'appareil est nettoyé quand même.
    } finally {
      await clearSessionCache();
      await clearSession();
      setToken(null);
      setUser(null);
      setError(null);
    }
  }, []);

  /** Mise à jour locale du profil (ex. adresse vérifiée), sans nouvel appel. */
  const updateUser = useCallback((patch) => {
    if (!user) return;
    const next = { ...user, ...patch };
    setUser(next);
    queryClient.setQueryData(queryKeys.account('profile', token), next);
    SecureStore.setItemAsync('authUser', JSON.stringify(next)).catch(() => {});
  }, [token, user]);

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
    updateUser,
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
