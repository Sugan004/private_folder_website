import axios from 'axios';
import api, { setAccessToken } from '../lib/api';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await axios.post(
          '/api/v1/auth/refresh',
          {},
          { withCredentials: true },
        );
        setAccessToken(data.accessToken);

        const meRes = await api
          .get('/auth/me', { headers: { Authorization: `Bearer ${data.accessToken}` } })
          .catch(() => null);

        if (meRes) {
          setUser(meRes.data.user);
        } else {
          const payload = JSON.parse(atob(data.accessToken.split('.')[1]));
          setUser({ id: payload.sub, email: payload.email, username: payload.email });
        }
      } catch {
        // No valid session — redirect to login
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    setAccessToken(data.accessToken);
    setUser(data.user);
  }, []);

  const register = useCallback(async (email, username, password) => {
    await api.post('/auth/register', { email, username, password });
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
