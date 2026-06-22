"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { api } from "./api";
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setTokens,
} from "./api";
import type { AdminUser, TokenResponse } from "./types";

interface AuthContextValue {
  user: AdminUser | null;
  loading: boolean;
  login: (username: string, password: string, totp_code?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get<AdminUser>("/api/admin/auth/me")
      .then((u) => setUser(u))
      .catch(() => {
        clearTokens();
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(
    async (username: string, password: string, totp_code?: string) => {
      const res = await api.post<TokenResponse>("/api/admin/auth/login", {
        username,
        password,
        totp_code: totp_code || null,
      });
      setTokens(res.access_token, res.refresh_token);
      const me = await api.get<AdminUser>("/api/admin/auth/me");
      setUser(me);
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await api.post("/api/admin/auth/logout");
    } catch {
      // ignore
    }
    clearTokens();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export { getAccessToken, getRefreshToken };
