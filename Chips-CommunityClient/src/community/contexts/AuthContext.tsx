import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Client } from "chips-sdk";
import { authApi, type UserProfile } from "../api/auth";
import { getCommunityApiBaseUrl, setAccessToken } from "../api/client";
import {
  loadStoredRefreshToken,
  saveStoredRefreshToken,
} from "../lib/server-config";

interface AuthContextValue {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<UserProfile>;
  register: (username: string, password: string) => Promise<UserProfile>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<UserProfile>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  client: Client;
  children: React.ReactNode;
}

export function AuthProvider({ client, children }: AuthProviderProps) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const tryRestore = async () => {
      try {
        const refreshToken = await loadStoredRefreshToken(client);
        if (!refreshToken) {
          if (!cancelled) {
            setUser(null);
          }
          return;
        }

        const baseUrl = getCommunityApiBaseUrl();
        if (!baseUrl) {
          if (!cancelled) {
            setUser(null);
          }
          return;
        }

        const res = await fetch(`${baseUrl}/api/v1/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        });

        if (res.status === 204 || !res.ok) {
          if (!cancelled) {
            setUser(null);
          }
          return;
        }

        const data = await res.json();
        const accessToken = data.data?.accessToken as string | undefined;
        if (!accessToken) {
          if (!cancelled) {
            setUser(null);
          }
          return;
        }

        setAccessToken(accessToken);
        const profile = await authApi.getMe();
        if (!cancelled) {
          setUser(profile);
        }
      } catch {
        if (!cancelled) {
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void tryRestore();

    return () => {
      cancelled = true;
    };
  }, [client]);

  const login = useCallback(async (username: string, password: string) => {
    const { user: profile, refreshToken } = await authApi.login(username, password);
    await saveStoredRefreshToken(client, refreshToken);
    setUser(profile);
    return profile;
  }, [client]);

  const register = useCallback(async (username: string, password: string) => {
    const { user: profile, refreshToken } = await authApi.register(username, password);
    await saveStoredRefreshToken(client, refreshToken);
    setUser(profile);
    return profile;
  }, [client]);

  const logout = useCallback(async () => {
    await authApi.logout().catch(() => undefined);
    await saveStoredRefreshToken(client, null);
    setUser(null);
  }, [client]);

  const refreshUser = useCallback(async () => {
    const profile = await authApi.getMe();
    setUser(profile);
    return profile;
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    isLoading,
    isAuthenticated: user !== null,
    login,
    register,
    logout,
    refreshUser,
  }), [user, isLoading, login, register, logout, refreshUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
