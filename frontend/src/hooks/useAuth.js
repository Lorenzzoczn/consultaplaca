'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import Cookies from 'js-cookie';
import { authAPI } from '@/lib/api';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    const token = Cookies.get('cp_token');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const { data } = await authAPI.me();
      setUser(data.data);
    } catch {
      Cookies.remove('cp_token');
      Cookies.remove('cp_user');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = async (email, password) => {
    const { data } = await authAPI.login({ email, password });
    const { token, user: userData } = data.data;

    // secure: false em desenvolvimento (localhost é HTTP)
    const isProduction = process.env.NODE_ENV === 'production';
    Cookies.set('cp_token', token, {
      expires: 7,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
    });
    setUser(userData);
    return userData;
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch {
      // Ignore errors on logout
    } finally {
      Cookies.remove('cp_token');
      setUser(null);
    }
  };

  const updateUser = (updates) => {
    setUser((prev) => ({ ...prev, ...updates }));
  };

  const isAdmin = user?.role === 'ADMIN';
  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser, isAdmin, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
