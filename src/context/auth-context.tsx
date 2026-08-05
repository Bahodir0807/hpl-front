'use client';

import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { apiClient } from '../lib/api-client';

export type AuthUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  permissions: string[];
};

type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  isInitialized: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hasPermission: (slug: string) => boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthContextProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const loadProfile = useCallback(async (): Promise<AuthUser> => {
    const response = await apiClient.get<AuthUser>('/auth/me');
    setUser(response.data);
    return response.data;
  }, []);

  const login = useCallback(
    async (email: string, password: string): Promise<void> => {
      const response = await apiClient.post<AuthTokens>('/auth/login', {
        email,
        password,
      });

      Cookies.set('accessToken', response.data.accessToken, {
        sameSite: 'lax',
      });
      Cookies.set('refreshToken', response.data.refreshToken, {
        sameSite: 'lax',
      });

      await loadProfile();
    },
    [loadProfile],
  );

  const logout = useCallback((): void => {
    Cookies.remove('accessToken');
    Cookies.remove('refreshToken');
    setUser(null);
    setIsInitialized(true);
    router.push('/login');
  }, [router]);

  const hasPermission = useCallback(
    (slug: string): boolean => user?.permissions.includes(slug) ?? false,
    [user],
  );

  useEffect(() => {
    const token = Cookies.get('accessToken');

    if (!token) {
      setIsInitialized(true);
      return;
    }

    let isMounted = true;

    apiClient
      .get<AuthUser>('/auth/me')
      .then((response) => {
        if (isMounted) {
          setUser(response.data);
        }
      })
      .catch(() => {
        Cookies.remove('accessToken');
        Cookies.remove('refreshToken');

        if (isMounted) {
          setUser(null);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsInitialized(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isInitialized,
      login,
      logout,
      hasPermission,
    }),
    [hasPermission, isInitialized, login, logout, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthContextProvider');
  }

  return context;
}
