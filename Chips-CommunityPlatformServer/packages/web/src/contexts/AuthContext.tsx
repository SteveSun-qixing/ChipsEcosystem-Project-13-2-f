import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi, type UserProfile } from '../api/auth';
import { setAccessToken } from '../api/client';

interface AuthContextValue {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 应用启动时尝试通过 refresh token 还原登录态
  useEffect(() => {
    const tryRestore = async () => {
      try {
        const res = await fetch('/api/v1/auth/refresh', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });

        if (res.ok) {
          const data = await res.json();
          const token = data.data?.accessToken as string;
          setAccessToken(token);
          const profile = await authApi.getMe();
          setUser(profile);
        }
      } catch {
        // 未登录，ignore
      } finally {
        setIsLoading(false);
      }
    };

    tryRestore();
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const { user: profile } = await authApi.login(username, password);
    setUser(profile);
  }, []);

  const register = useCallback(async (username: string, password: string) => {
    const { user: profile } = await authApi.register(username, password);
    setUser(profile);
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const profile = await authApi.getMe();
    setUser(profile);
  }, []);

  const value: AuthContextValue = {
    user,
    isLoading,
    isAuthenticated: user !== null,
    login,
    register,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
