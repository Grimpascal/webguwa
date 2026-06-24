'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, User } from '@/services/api';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (credentials: any) => Promise<void>;
  register: (userData: any) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isAdmin: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Load token from localStorage or sessionStorage
    let savedToken = localStorage.getItem('token');
    let savedUser = localStorage.getItem('user');

    if (!savedToken || !savedUser) {
      savedToken = sessionStorage.getItem('token');
      savedUser = sessionStorage.getItem('user');
    }

    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
      
      // Verify token freshness with backend
      api.me()
        .then((userData) => {
          setUser(userData);
          if (localStorage.getItem('token')) {
            localStorage.setItem('user', JSON.stringify(userData));
          } else {
            sessionStorage.setItem('user', JSON.stringify(userData));
          }
        })
        .catch(() => {
          // Token expired or invalid, clear
          logoutLocal();
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const logoutLocal = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    setUser(null);
    setToken(null);
  };

  const login = async (credentials: any) => {
    setLoading(true);
    try {
      const { rememberMe, ...loginPayload } = credentials;
      const res = await api.login({
        ...loginPayload,
        remember_me: rememberMe
      });
      if (res.success && res.data) {
        const { token: userToken, user: userData } = res.data;
        if (rememberMe) {
          localStorage.setItem('token', userToken);
          localStorage.setItem('user', JSON.stringify(userData));
        } else {
          sessionStorage.setItem('token', userToken);
          sessionStorage.setItem('user', JSON.stringify(userData));
        }
        setToken(userToken);
        setUser(userData);
        
        // Redirect based on role
        if (userData.role === 'admin') {
          router.push('/admin');
        } else {
          router.push('/dashboard');
        }
      }
    } catch (err) {
      setLoading(false);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData: any) => {
    setLoading(true);
    try {
      const res = await api.register(userData);
      if (res.success && res.data) {
        const { token: userToken, user: registeredUser } = res.data;
        localStorage.setItem('token', userToken);
        localStorage.setItem('user', JSON.stringify(registeredUser));
        setToken(userToken);
        setUser(registeredUser);
        router.push('/dashboard');
      }
    } catch (err) {
      setLoading(false);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await api.logout();
    } catch (err) {
      console.error('Logout failed on backend, cleaning up locally anyway', err);
    } finally {
      logoutLocal();
      router.push('/');
      setLoading(false);
    }
  };

  const refreshUser = async () => {
    try {
      const userData = await api.me();
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
    } catch (err) {
      console.error('Refresh user failed:', err);
    }
  };

  const isAdmin = user?.role === 'admin';
  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, refreshUser, isAdmin, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
