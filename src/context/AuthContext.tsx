import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, AuthContextType } from '../types/auth.types';
import { api, TOKEN_STORAGE_KEY, USER_STORAGE_KEY } from '../services/api';
import { normalizeError } from '../lib/apiError';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const readStorage = (key: string): string | null => {
  try { return localStorage.getItem(key); } catch { return null; }
};
const writeStorage = (key: string, value: string | null) => {
  try { if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, value); } catch { /* storage unavailable */ }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = readStorage(USER_STORAGE_KEY);
      return stored ? (JSON.parse(stored) as User) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState<string | null>(() => readStorage(TOKEN_STORAGE_KEY));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const clearSession = useCallback(() => {
    setToken(null);
    setUser(null);
    writeStorage(TOKEN_STORAGE_KEY, null);
    writeStorage(USER_STORAGE_KEY, null);
  }, []);

  // The stored user is only a rendering hint. The server decides: validate the token on every load,
  // and replace the cached user with the CURRENT database user (role, status, employee code).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (readStorage(TOKEN_STORAGE_KEY)) {
        try {
          const current = await api.getMe();
          if (!cancelled) {
            setUser(current);
            writeStorage(USER_STORAGE_KEY, JSON.stringify(current));
          }
        } catch (err) {
          const n = normalizeError(err);
          // 401 already clears the session in the API client; a network blip keeps the cached hint.
          if (!cancelled && n.code === 'UNAUTHENTICATED') clearSession();
        }
      }
      if (!cancelled) setIsLoading(false);
    })();
    return () => { cancelled = true; };
  }, [clearSession]);

  const login = async (identifier: string, password: string) => {
    const data = await api.login(identifier.trim(), password); // errors propagate as ApiError for the caller to render
    setToken(data.token);
    setUser(data.user);
    writeStorage(TOKEN_STORAGE_KEY, data.token);
    writeStorage(USER_STORAGE_KEY, JSON.stringify(data.user));
  };

  const logout = async () => {
    try { await api.logout(); } catch { /* the token may already be invalid; still clear locally */ }
    clearSession();
  };

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: !!token && !!user,
    isLoading,
    login,
    logout,
    isSuperAdmin: user?.role === 'SUPER_ADMIN',
    isFounder: user?.role === 'FOUNDER',
    isEmployee: user?.role === 'EMPLOYEE',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
