import React, { createContext, useCallback, useEffect, useState } from 'react';
import axios from 'axios';

const AuthContext = createContext();

const applyToken = (token) => {
  if (token) {
    localStorage.setItem('token', token);
    axios.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common.Authorization;
  }
};

export const isStaff = (user) => user?.role === 'admin' || user?.role === 'sub-admin';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      const res = await axios.get('/api/auth/me');
      setUser(res.data.data);
    } catch (error) {
      applyToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      applyToken(token);
      checkAuth();
    } else {
      setLoading(false);
    }
  }, [checkAuth]);

  const startSession = (data) => {
    applyToken(data.token);
    setUser(data.user);
    return { success: true, user: data.user };
  };

  const login = async (email, password) => {
    try {
      const res = await axios.post('/api/auth/login', { email, password });
      return startSession(res.data);
    } catch (error) {
      return { success: false, error: error.response?.data?.error || 'Erreur de connexion' };
    }
  };

  const register = async (name, email, password) => {
    try {
      const res = await axios.post('/api/auth/register', { name, email, password });
      return startSession(res.data);
    } catch (error) {
      const details = error.response?.data?.details;
      return { success: false, error: details?.[0]?.message || error.response?.data?.error || 'Erreur d\'inscription' };
    }
  };

  /** Code de passage émis par l'application mobile (souscription web sans ressaisie). */
  const exchangeHandoff = async (code) => {
    try {
      const res = await axios.post('/api/auth/handoff/exchange', { code });
      return startSession(res.data);
    } catch (error) {
      return { success: false, error: error.response?.data?.error || 'Lien expiré' };
    }
  };

  const logout = () => {
    applyToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, exchangeHandoff }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
